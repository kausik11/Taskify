import time
from datetime import datetime

import frappe
import frappe.core.doctype.user.user
from frappe import _
from frappe.core.doctype.user.user import (
	throttle_user_creation as original_throttle_user_creation,
)
from frappe.model.document import Document
from frappe.model.rename_doc import rename_doc, update_document_title
from frappe.utils import add_days, cint, flt


def patched_throttle_user_creation():
	"""Optimized throttling function with caching for single and bulk uploads."""
	if getattr(frappe.local, "skip_user_throttle", False) or getattr(frappe.local, "bulk_upload", False):
		return

	# Cache creation count for 60 minutes
	cache_key = "user_creation_count"
	creation_count = frappe.cache().get_value(cache_key)
	if creation_count is None:
		creation_count = frappe.db.get_creation_count("User", 60)
		frappe.cache().set_value(cache_key, creation_count, expires_in_sec=3600)

	throttle_limit = frappe.local.conf.get("throttle_user_limit", 60)
	if creation_count >= throttle_limit:
		frappe.throw(_("Throttled: Too many users created in the last hour."))

	# Increment cache count
	frappe.cache().set_value(cache_key, creation_count + 1, expires_in_sec=3600)


frappe.core.doctype.user.user.throttle_user_creation = patched_throttle_user_creation


def before_cg_user_insert(self, method):
	"""Handle validations before inserting CG User."""
	if getattr(frappe.local, "skip_cg_user_triggers", False):
		return
	if not getattr(frappe.local, "bulk_upload", False):
		self.email = self.email.lower().strip()
		if frappe.db.exists("CG User", {"email": self.email, "name": ["!=", self.name]}):
			frappe.throw(_("Email {0} is already associated with another CG User").format(self.email))
		# Allow existing core User records; they will be updated/merged during save
		# Do not throw if a core User with this email already exists


class CGUser(Document):
	def validate(self):
		self.set_full_name()
		self.email = self.email.lower().strip()

		# Validate email format
		if not frappe.utils.validate_email_address(self.email):
			frappe.throw(_("Please enter a valid email address"))

		if self.is_super_admin:
			self.validate_super_admin()

		if self.report_to:
			self.validate_report_to_entries()
			seen = set()
			current_user = self.email
			for entry in self.report_to:
				superior = entry.superior
				if superior == current_user:
					frappe.throw(f"Circular reference: {current_user} cannot report to themselves")
				if not frappe.db.exists("CG User", {"email": superior}):
					frappe.throw(f"Invalid superior: {superior} does not exist")
				seen.add(current_user)
				self._check_circular_reference(superior, seen)

	def validate_super_admin(self):
		"""Validate Super Admin constraints."""
		# Check for existing super admin in the same company
		existing_super_admins = frappe.get_all(
			"CG User",
			filters={
				"is_super_admin": 1,
				"company_id": self.company_id,
				"name": ["!=", self.name] if not self.is_new() else None,
				"enabled": 1,
			},
			fields=["name"],
		)
		# If another Super Admin exists, demote them silently so exactly one remains
		if self.is_super_admin and existing_super_admins:
			for sup in existing_super_admins:
				# Use direct DB writes to avoid triggering validations/hooks and recursion
				try:
					frappe.db.set_value("CG User", sup.name, "is_super_admin", 0)
					# Clear existing report_to child rows
					frappe.db.delete(
						"CG User Team",
						{
							"parent": sup.name,
							"parenttype": "CG User",
							"parentfield": "report_to",
						},
					)
					# Insert a new report_to child row pointing to the current Super Admin
					child = frappe.get_doc(
						{
							"doctype": "CG User Team",
							"parent": sup.name,
							"parenttype": "CG User",
							"parentfield": "report_to",
							"superior": self.name,
						}
					)
					child.flags.ignore_permissions = True
					child.insert()
				except Exception as e:
					frappe.log_error(
						f"Failed to demote existing Super Admin {sup.name} or set report_to: {str(e)}",
						"CG Super Admin Demotion Error",
					)

		# Super Admin validations
		if self.report_to:
			frappe.throw(_("Super Admin cannot have a Report To."))
		if self.role != "ROLE-Admin":
			frappe.throw(_("Super Admin must have ROLE-Admin role."))

	def validate_report_to_entries(self):
		"""Validate all report_to entries."""
		superiors = []
		for report_entry in self.report_to:
			if not report_entry.superior:
				frappe.throw(_("Superior cannot be empty in Report To"))

			if report_entry.superior == self.name:
				frappe.throw(_("User cannot report to themselves"))

			if report_entry.superior in superiors:
				frappe.throw(_("Duplicate superior {0} found in Report To").format(report_entry.superior))

			superiors.append(report_entry.superior)

			# Validate superior exists and is active
			superior_doc = frappe.get_doc("CG User", report_entry.superior)
			if not superior_doc.enabled:
				frappe.throw(_("Cannot report to deleted user {0}").format(superior_doc.full_name))

			self.validate_report_to(superior_doc)
			self.validate_circular_reporting(report_entry.superior)

	def validate_circular_reporting(self, superior_id, visited=None):
		"""Prevent circular reporting relationships."""
		if visited is None:
			visited = set()

		if superior_id in visited:
			frappe.throw(_("Circular reporting relationship detected"))

		visited.add(superior_id)

		# Check if superior reports to anyone
		superior = frappe.get_doc("CG User", superior_id)
		if superior.report_to:
			for report_entry in superior.report_to:
				self.validate_circular_reporting(report_entry.superior, visited.copy())

	def validate_report_to(self, reporter):
		"""Validate report_to based on role hierarchy."""
		role_hierarchy = {
			"ROLE-Member": ["ROLE-Team Lead", "ROLE-Admin"],
			"ROLE-Team Lead": ["ROLE-Admin"],
			"ROLE-Admin": [],
		}

		allowed_roles = role_hierarchy.get(self.role, [])
		if not allowed_roles:
			return

		reporter_role = "ROLE-Admin" if reporter.is_super_admin else reporter.role
		if reporter_role not in allowed_roles:
			frappe.throw(_("{0} must report to one of: {1}").format(self.role, ", ".join(allowed_roles)))

	def before_insert(self):
		# Skip for bulk uploads (handled by bulk_upload.py)
		if getattr(frappe.local, "bulk_upload", False):
			return
		# Validate email and check for duplicates
		self.email = self.email.lower().strip()
		if not frappe.utils.validate_email_address(self.email):
			frappe.throw(_("Please enter a valid email address"))
		if frappe.db.exists("CG User", {"email": self.email}):
			frappe.throw(f"CG User with email {self.email} already exists")

	def before_save(self):
		"""Handle validations and core user creation/update before saving CG User."""
		if getattr(frappe.local, "skip_cg_user_triggers", False):
			return

		# Validate role exists in CG Role doctype
		if self.role and not frappe.db.exists("CG Role", self.role):
			frappe.throw(_("Invalid role {0}. Please select a valid role from CG Role.").format(self.role))

		# Handle core user creation/update
		self.email = self.email.lower().strip()
		if frappe.db.exists("User", self.email):
			self.update_user_details()
		elif self.is_new():
			self.create_core_user()

		# Set first user as Super Admin for company
		if not self.is_new() and not frappe.db.exists(
			"CG User", {"company_id": self.company_id, "name": ["!=", self.name]}
		):
			self.is_super_admin = 1
			self.role = "ROLE-Admin"
			self.report_to = []
		elif self.is_new() and not frappe.db.count("CG User", {"company_id": self.company_id}):
			self.is_super_admin = 1
			self.role = "ROLE-Admin"
			self.report_to = []

		# Handle role-specific logic for non-Super Admin roles
		if not self.is_super_admin:
			self.handle_role_specific_logic()

	def on_update(self):
		"""Handle updates to report_to field and sync with User doc."""
		# Update corresponding User document
		self.sync_with_user_doc()

		if not self.is_super_admin and self.has_value_changed("report_to"):
			self.update_team_membership()

	def sync_with_user_doc(self):
		"""Sync relevant fields with User document when CG User is updated."""
		if getattr(frappe.local, "skip_cg_user_triggers", False):
			return

		try:
			if frappe.db.exists("User", self.email):
				user_doc = frappe.get_doc("User", self.email)

				# Update relevant fields
				user_doc.first_name = self.first_name
				user_doc.middle_name = self.middle_name
				user_doc.last_name = self.last_name
				user_doc.full_name = self.full_name
				user_doc.mobile_no = self.phone
				user_doc.user_image = self.user_image
				user_doc.gender = self.gender
				user_doc.birth_date = self.birthday
				user_doc.enabled = cint(self.enabled)

				# Update role - IMPROVED ROLE HANDLING
				if self.role:
					formatted_role = self.format_role(self.role)
					existing_roles = {role.role for role in user_doc.roles}

					if formatted_role not in existing_roles or self.has_cg_role_changed():
						# Only remove CG roles of the same type
						user_doc.roles = [role for role in user_doc.roles if not self.is_cg_role(role.role)]

						user_doc.append("roles", {"role": formatted_role})

						# Ensure basic roles
						self.ensure_basic_roles(user_doc)

				# Set flags to avoid recursion
				user_doc.flags.ignore_permissions = True
				user_doc.flags.skip_cg_user_triggers = True
				user_doc.save()

		except Exception as e:
			frappe.log_error(f"Error syncing CG User with User doc: {str(e)}")

	def after_insert(self):
		try:
			# Handle team creation for Super Admin, Admin, and Team Lead
			if self.is_super_admin or self.role in ["ROLE-Admin", "ROLE-Team Lead"]:
				team = self.get_team_for_user()
				if not frappe.db.exists("CG Team", team.name):
					team.insert()

			# Handle team membership for non-Super Admin users
			if not self.is_super_admin and self.report_to:
				for report_entry in self.report_to:
					superior = frappe.get_doc("CG User", report_entry.superior)
					team = self.get_team_for_superior(superior)
					if team and team.team_lead == superior.name:
						self.add_user_to_team(team)

			# Publish realtime event
			frappe.publish_realtime(
				event="user_creation",
				message={
					"doc_name": self.name,
					"full_name": self.full_name,
					"email": self.email,
					"creation_time": str(self.creation),
				},
				user=self.owner,
			)

		except Exception as e:
			frappe.log_error(
				message=f"Error in after_insert for CG User {self.name}: {str(e)}",
				title="CG User After Insert Error",
			)
			# Don't raise here to prevent transaction rollback

	def on_trash(self):
		"""Handle deletion with comprehensive cleanup."""
		try:
			# First validate if deletion is allowed
			self.validate_deletion()

			# Then clean up relationships and auto-reassign tasks
			self.cleanup_user_relationships()

			# Finally, clean up core user
			self.cleanup_core_user()

			frappe.logger().info(f"Successfully deleted CG User {self.name} ({self.email})")

		except Exception as e:
			frappe.log_error(
				message=f"Failed to delete CG User {self.name}: {str(e)}\n{frappe.get_traceback()}",
				title="CG User Deletion Error",
			)
			raise

	def validate_deletion(self):
		"""Validate if user can be deleted - only check incomplete tasks where user is assigned_to."""
		# Prevent deletion of current user
		if self.email == frappe.session.user:
			frappe.throw(_("You cannot delete your own user account."))

		# Check for INCOMPLETE tasks where user is assigned_to (requires manual reallocation)
		incomplete_assigned_tasks = frappe.get_all(
			"CG Task Instance",
			filters={
				"assigned_to": self.name,
				"is_completed": 0,
				"status": ["!=", "Completed"],
			},
			fields=["name", "task_name"],
			distinct=True,
		)

		if incomplete_assigned_tasks:
			frappe.throw(
				_("Cannot delete user {0}. Please reallocate their incomplete tasks.").format(self.full_name)
			)

		# Check if user is team lead with members
		teams_as_lead = frappe.get_all("CG Team", filters={"team_lead": self.name}, fields=["name"])
		for team in teams_as_lead:
			team_members = frappe.get_all("CG Team Member", filters={"parent": team.name})
			if team_members:
				frappe.throw(
					_(
						"Cannot delete user {0} because they are the team lead for team {1}, which has {2} member(s). Assign a new team lead before deleting."
					).format(self.email, team.name, len(team_members))
				)

	def validate_disable_user(self):
		"""Validate if user can be disabled - updated to handle team lead scenarios."""
		# Prevent disabling of current user
		if self.email == frappe.session.user:
			frappe.throw(_("You cannot disable your own user account."))

		# Check for INCOMPLETE tasks where user is assigned_to (requires manual reallocation)
		incomplete_assigned_tasks = frappe.get_all(
			"CG Task Instance",
			filters={
				"assigned_to": self.name,
				"is_completed": 0,
				"status": ["!=", "Completed"],
			},
			fields=["name", "task_name"],
			distinct=True,
		)

		if incomplete_assigned_tasks:
			frappe.throw(
				_("Cannot disable user {0}. Please reallocate their incomplete tasks.").format(self.full_name)
			)

		# Updated validation for team lead scenario
		teams_as_lead = frappe.get_all("CG Team", filters={"team_lead": self.name}, fields=["name"])

		if teams_as_lead:
			# Check if user has a superior to reassign team members to
			if not self.report_to or len(self.report_to) == 0:
				# Count total team members across all teams
				total_members = 0
				for team in teams_as_lead:
					team_members = frappe.get_all("CG Team Member", filters={"parent": team.name})
					total_members += len(team_members)

				if total_members > 0:
					frappe.throw(
						_(
							"Cannot disable user {0} because they are the team lead for {1} team(s) with {2} total member(s), but have no superior assigned to reassign the members to. Please assign a superior or manually reassign team members first."
						).format(self.email, len(teams_as_lead), total_members)
					)
			else:
				# Verify the superior exists and is active
				superior_email = self.report_to[0].superior
				if not frappe.db.exists("CG User", {"name": superior_email, "enabled": 1}):
					frappe.throw(
						_(
							"Cannot disable user {0} because their assigned superior {1} does not exist or is inactive. Please assign a valid superior first."
						).format(self.email, superior_email)
					)

	def after_insert_cg_user(doc, method):
		"""
		Automatically create holiday list when a new employee is added.
		Add this as a server script for CG User after_insert event.
		"""

		try:
			# Check if employee has required fields
			if not doc.branch_id:
				frappe.log_error(
					f"No branch assigned to employee {doc.name}",
					"Holiday List Creation",
				)
				return

			# Create holiday list for the current year
			current_date = datetime.now().date()
			from_date = datetime(current_date.year, 1, 1).date()
			to_date = datetime(current_date.year, 12, 31).date()

			# Check if list already exists
			existing = frappe.db.exists(
				"CG Employee Holiday List",
				{
					"employee": doc.name,
					"from_date": ["<=", from_date],
					"to_date": [">=", to_date],
				},
			)

			if not existing:
				holiday_list = frappe.new_doc("CG Employee Holiday List")
				holiday_list.employee = doc.name
				holiday_list.from_date = from_date
				holiday_list.to_date = to_date
				holiday_list.auto_refresh = 1
				holiday_list.flags.ignore_permissions = True
				holiday_list.insert()

				frappe.msgprint(f"Holiday list created for {doc.full_name}")

		except Exception as e:
			frappe.log_error(f"Error creating holiday list: {str(e)}", "Holiday List Creation")

	def cleanup_user_relationships(self):
		"""Clean up all user relationships before deletion, including automatic reassignment of assignee tasks."""
		try:
			# Auto-reassign tasks where user is assignee to their team leader
			self.auto_reassign_assignee_tasks()

			# Delete all CG Employee Holiday List records where user is employee
			holiday_lists = frappe.get_all(
				"CG Employee Holiday List",
				filters={"employee": self.name},
				fields=["name"],
			)
			for holiday_list in holiday_lists:
				try:
					frappe.delete_doc(
						"CG Employee Holiday List",
						holiday_list.name,
						ignore_permissions=True,
					)
					frappe.logger().info(f"Deleted holiday list {holiday_list.name} for employee {self.name}")
				except Exception as e:
					frappe.log_error(f"Error deleting holiday list {holiday_list.name}: {str(e)}")
					# Continue with other deletions even if one fails

			# Delete teams where user is lead with no members
			teams_as_lead = frappe.get_all("CG Team", filters={"team_lead": self.name})
			for team in teams_as_lead:
				team_members = frappe.get_all("CG Team Member", filters={"parent": team.name})
				if not team_members:
					frappe.delete_doc("CG Team", team.name)
					frappe.logger().info(f"Deleted empty team {team.name} where {self.name} was lead")

			# Remove from team memberships
			team_members = frappe.get_all("CG Team Member", filters={"member": self.name}, fields=["parent"])
			for team_member in team_members:
				team_doc = frappe.get_doc("CG Team", team_member.parent)
				team_doc.members = [m for m in team_doc.members if m.member != self.name]
				team_doc.save()
				frappe.logger().info(f"Removed user {self.name} from team {team_doc.name}")

			# Clean up reporting relationships
			user_team_entries = frappe.get_all(
				"CG User Team", filters={"superior": self.name}, fields=["parent"]
			)
			for entry in user_team_entries:
				user_doc = frappe.get_doc("CG User", entry.parent)
				user_doc.report_to = [r for r in user_doc.report_to if r.superior != self.name]
				user_doc.save()
				frappe.logger().info(f"Removed {self.name} as superior from {user_doc.name}")

		except Exception as e:
			frappe.log_error(f"Error cleaning up relationships for user {self.name}: {str(e)}")
			raise

	def auto_reassign_assignee_tasks(self):
		"""Automatically reassign tasks where user is assignee to their team leader."""
		try:
			# Find user's team leader from CG Team
			team_leader = None

			# Check if user is member of any team
			team_membership = frappe.get_all(
				"CG Team Member", filters={"member": self.name}, fields=["parent"]
			)

			if team_membership:
				# Get the team and its leader
				team = frappe.get_doc("CG Team", team_membership[0].parent)
				team_leader = team.team_lead

			# If no team leader found, check report_to
			if not team_leader and self.report_to:
				team_leader = self.report_to[0].superior

			if not team_leader:
				# Check if there are any tasks to reassign
				assignee_tasks = frappe.get_all(
					"CG Task Instance",
					filters={
						"assignee": self.name,
						"is_completed": 0,
						"status": ["!=", "Completed"],
					},
				)

				if assignee_tasks:
					frappe.logger().warning(
						f"User {self.name} has {len(assignee_tasks)} tasks as assignee but no team leader found for reassignment"
					)
				return

			# Reassign incomplete one-time tasks where user is assignee
			onetime_tasks = frappe.get_all(
				"CG Task Instance",
				filters={
					"assignee": self.name,
					"task_type": "Onetime",
					"is_completed": 0,
					"status": ["!=", "Completed"],
				},
				fields=["name", "task_name"],
			)

			for task in onetime_tasks:
				task_doc = frappe.get_doc("CG Task Instance", task.name)
				task_doc.assignee = team_leader
				task_doc.save()
				frappe.logger().info(
					f"Auto-reassigned onetime task {task.name} assignee from {self.name} to {team_leader}"
				)

			# Reassign incomplete recurring tasks where user is assignee
			recurring_tasks = frappe.get_all(
				"CG Task Instance",
				filters={
					"assignee": self.name,
					"task_type": "Recurring",
					"is_completed": 0,
					"status": ["!=", "Completed"],
				},
				fields=["name", "task_name", "task_definition_id"],
			)

			for task in recurring_tasks:
				task_doc = frappe.get_doc("CG Task Instance", task.name)
				task_doc.assignee = team_leader
				task_doc.save()
				frappe.logger().info(
					f"Auto-reassigned recurring task {task.name} assignee from {self.name} to {team_leader}"
				)

			# Update CG Task Definition where user is assignee
			task_definitions = frappe.get_all(
				"CG Task Definition",
				filters={"assignee": self.name, "enabled": 1},
				fields=["name", "task_name"],
			)

			for task_def in task_definitions:
				task_def_doc = frappe.get_doc("CG Task Definition", task_def.name)
				task_def_doc.assignee = team_leader
				task_def_doc.save()
				frappe.logger().info(
					f"Auto-reassigned task definition {task_def.name} assignee from {self.name} to {team_leader}"
				)

			if onetime_tasks or recurring_tasks or task_definitions:
				frappe.msgprint(
					_("Automatically reassigned {0} task(s) where {1} was assignee to {2}").format(
						len(onetime_tasks) + len(recurring_tasks) + len(task_definitions),
						self.email,
						team_leader,
					),
					alert=True,
				)

		except Exception as e:
			frappe.log_error(f"Error auto-reassigning tasks for user {self.name}: {str(e)}")
			# Don't raise - allow deletion to continue even if reassignment fails

	def auto_reassign_team_members(self):
		"""Automatically reassign team members when their team lead is being deactivated."""
		try:
			# Check if this user is a team lead
			teams_as_lead = frappe.get_all("CG Team", filters={"team_lead": self.name}, fields=["name"])

			if not teams_as_lead:
				# User is not a team lead, nothing to reassign
				return

			# Find the superior (report_to) of the user being deactivated
			new_team_lead = None
			if self.report_to and len(self.report_to) > 0:
				new_team_lead = self.report_to[0].superior

			if not new_team_lead:
				frappe.logger().warning(
					f"User {self.name} is a team lead but has no superior to reassign team members to"
				)
				# If no superior, we'll leave the teams without reassigning members
				# The teams will be handled in the existing cleanup logic
				return

			# Verify the new team lead exists and is active
			if not frappe.db.exists("CG User", {"name": new_team_lead, "enabled": 1}):
				frappe.logger().warning(
					f"Cannot reassign team members: new team lead {new_team_lead} does not exist or is inactive"
				)
				return

			total_members_reassigned = 0

			for team in teams_as_lead:
				try:
					team_doc = frappe.get_doc("CG Team", team.name)

					# Get current team members before reassignment
					current_members = [
						member.member for member in team_doc.members if member.member != self.name
					]

					if not current_members:
						# No members to reassign, just update team lead or delete empty team
						frappe.logger().info(f"Team {team.name} has no members to reassign")
						continue

					# Find or create a team for the new team lead
					new_team = self.find_or_create_team_for_leader(new_team_lead)

					# Move all current team members to the new team lead's team
					for member_email in current_members:
						# Remove member from current team
						team_doc.members = [m for m in team_doc.members if m.member != member_email]

						# Add member to new team (if not already there)
						existing_member = frappe.get_all(
							"CG Team Member",
							filters={"parent": new_team.name, "member": member_email},
						)

						if not existing_member:
							new_team.append("members", {"member": member_email})
							total_members_reassigned += 1

							frappe.logger().info(
								f"Moved team member {member_email} from team {team.name} to team {new_team.name}"
							)

					# Save the updated new team
					new_team.save()

					# Save the current team (now empty) or delete it
					if len(team_doc.members) == 0:
						# Delete empty team
						frappe.delete_doc("CG Team", team.name, ignore_permissions=True)
						frappe.logger().info(f"Deleted empty team {team.name}")
					else:
						team_doc.save()

				except Exception as e:
					frappe.log_error(f"Error reassigning members from team {team.name}: {str(e)}")
					# Continue with other teams even if one fails
					continue

			if total_members_reassigned > 0:
				frappe.msgprint(
					_("Automatically reassigned {0} team member(s) from {1} to {2}").format(
						total_members_reassigned,
						self.email,
						new_team_lead,
					),
					alert=True,
				)

		except Exception as e:
			frappe.log_error(f"Error auto-reassigning team members for user {self.name}: {str(e)}")
			# Don't raise - allow deactivation to continue even if team reassignment fails

	def find_or_create_team_for_leader(self, leader_email):
		"""Find existing team for leader or create a new one."""
		try:
			# Get the leader's details
			leader_doc = frappe.get_doc("CG User", leader_email)

			# Try to find existing team for this leader
			existing_team = frappe.get_all(
				"CG Team",
				filters={
					"team_lead": leader_email,
					"company_id": leader_doc.company_id,
					"branch_id": leader_doc.branch_id,
					"department": leader_doc.department_id,
				},
				limit=1,
			)

			if existing_team:
				return frappe.get_doc("CG Team", existing_team[0].name)

			# Create new team for the leader
			team = frappe.get_doc(
				{
					"doctype": "CG Team",
					"company_id": leader_doc.company_id,
					"branch_id": leader_doc.branch_id,
					"department": leader_doc.department_id,
					"team_lead": leader_email,
				}
			)

			team.insert()
			frappe.logger().info(f"Created new team {team.name} for leader {leader_email}")
			return team

		except Exception as e:
			frappe.log_error(f"Error finding/creating team for leader {leader_email}: {str(e)}")
			raise

	def cleanup_core_user(self):
		"""Delete associated core User document."""
		try:
			if frappe.db.exists("User", self.email):
				frappe.delete_doc("User", self.email)
		except Exception as e:
			frappe.log_error(f"Error deleting core User {self.email}: {str(e)}")

	def disable_user_with_task_reassignment(self):
		"""Disable user with automatic task reassignment for assignee tasks and team member reassignment."""
		try:
			# First validate if disabling is allowed (only checks assigned_to tasks)
			self.validate_disable_user()

			# Auto-reassign tasks where user is assignee to their team leader
			self.auto_reassign_assignee_tasks()

			# Update report_to relationships for users who report to this user
			self.update_report_to_relationships()

			# Auto-reassign team members if user is a team lead
			self.auto_reassign_team_members()

			# Disable the CG User
			self.enabled = 0
			self.flags.ignore_permissions = True
			self.save()

			# Disable core User
			if frappe.db.exists("User", self.email):
				user = frappe.get_doc("User", self.email)
				user.enabled = 0
				user.flags.ignore_permissions = True
				user.flags.skip_cg_user_triggers = True
				user.save()

			frappe.logger().info(f"Successfully deactivated CG User {self.name} ({self.email})")

		except Exception as e:
			frappe.log_error(f"Failed to deactivate CG User {self.name}: {str(e)}")
			raise

	def disable_user(self):
		"""Disable user with proper task reassignment."""
		try:
			# Check for pending tasks
			pending_tasks = frappe.get_all(
				"CG Task Instance",
				filters={"assigned_to": self.name, "is_completed": 0},
				fields=["name", "task_name"],
			)
			if pending_tasks:
				frappe.throw(
					_("Cannot disable user {0}. Please reallocate their tasks first.").format(self.full_name)
				)

			# Handle task reassignment
			self.reassign_user_tasks()

			# Disable the user
			self.enabled = 0
			self.save()

			# Disable core User
			if frappe.db.exists("User", self.email):
				user = frappe.get_doc("User", self.email)
				user.enabled = 0
				user.save()

			frappe.msgprint(
				_("User {0} has been deleted successfully.").format(self.email),
				alert=True,
			)

		except Exception as e:
			frappe.log_error(f"Failed to disable CG User {self.name}: {str(e)}")
			raise

	def reassign_user_tasks(self):
		"""Reassign tasks when disabling user."""
		if not self.report_to:
			return

		superior = frappe.get_doc("CG User", self.report_to[0].superior)

		# Handle one-time tasks
		one_time_tasks = frappe.get_all(
			"CG Task Instance",
			filters={"assignee": self.name, "task_type": "Onetime", "is_completed": 0},
		)
		for task in one_time_tasks:
			task_doc = frappe.get_doc("CG Task Instance", task.name)
			task_doc.assignee = superior.name
			task_doc.save()

		# Handle recurring tasks
		recurring_tasks = frappe.get_all(
			"CG Task Instance",
			filters={
				"assignee": self.name,
				"task_type": "Recurring",
				"is_completed": 0,
			},
			fields=["name", "task_definition_id"],
		)
		for task in recurring_tasks:
			task_doc = frappe.get_doc("CG Task Instance", task.name)
			task_doc.assignee = superior.name
			task_doc.save()

			# Disable linked task definition
			if task.task_definition_id:
				task_def_doc = frappe.get_doc("CG Task Definition", task.task_definition_id)
				task_def_doc.enabled = 0
				task_def_doc.save()

	def set_full_name(self):
		"""Set the full name based on available name fields."""
		if self.first_name:
			parts = [self.first_name]
			if self.middle_name:
				parts.append(self.middle_name)
			if self.last_name:
				parts.append(self.last_name)
			self.full_name = " ".join(parts)
		else:
			self.full_name = "Unnamed User"

	def handle_role_specific_logic(self):
		"""Handle logic specific to non-Super Admin roles."""
		if self.role == "ROLE-Admin":
			super_admin = frappe.get_all(
				"CG User",
				filters={
					"is_super_admin": 1,
					"company_id": self.company_id,
					"enabled": 1,
				},
				limit=1,
			)
			if not super_admin:
				frappe.throw(_("No Super Admin found for the company."))

			super_admin_doc = frappe.get_doc("CG User", super_admin[0].name)
			if not self.report_to or self.has_value_changed("role"):
				self.report_to = []
				self.append("report_to", {"superior": super_admin_doc.name})

	def create_core_user(self):
		"""
		Create a core Frappe User and link it to this CG User.
		Handles report_to separately and checks for duplicates.
		"""
		# Recursion guard
		if getattr(frappe.local, "in_create_core_user", False):
			frappe.log_error(
				message=f"Recursion detected in create_core_user for {self.email}",
				title="CG User Recursion Debug",
			)
			return

		# Validate required fields
		if not self.email or not frappe.utils.validate_email_address(self.email, throw=False):
			frappe.throw(f"Invalid email format for {self.email}")
		if not self.first_name:
			frappe.throw(_("First name is required"))

		try:
			frappe.local.in_create_core_user = True
			frappe.log_error(
				message=f"Starting core User creation for {self.email}",
				title="CG User Creation Debug",
			)

			# Prepare core user data
			username = self.generate_unique_username(self.first_name, self.last_name)
			user_data = {
				"doctype": "User",
				"email": self.email,
				"first_name": self.first_name,
				"last_name": self.last_name or "",
				"enabled": cint(self.enabled),
				"send_welcome_email": (False if getattr(frappe.local, "bulk_upload", False) else True),
				"language": "en",
				"time_zone": "Asia/Kolkata",
				"username": username,
				"mobile_no": self.phone,
				"gender": self.gender,
				"birth_date": self.birthday,
				"user_image": self.user_image,
			}

			# Create or update core User
			if frappe.db.exists("User", self.email):
				frappe.log_error(
					message=f"Core User {self.email} already exists, updating instead",
					title="CG User Creation Debug",
				)
				user = frappe.get_doc("User", self.email)
				user.update(user_data)
			else:
				user = frappe.get_doc(user_data)

			# IMPROVED ROLE HANDLING - Only manage the CG role for this user type
			if self.role:
				formatted_role = self.format_role(self.role)

				# Remove ALL existing CG roles
				user.roles = [r for r in user.roles if not self.is_cg_role(r.role)]

				# Add the new CG role
				user.append("roles", {"role": formatted_role})

				# Ensure user has basic Frappe roles for app access
				self.ensure_basic_roles(user)

			# Set flags to bypass validations
			user.flags.ignore_permissions = True
			user.flags.ignore_links = True
			user.flags.ignore_mandatory = True
			user.flags.skip_cg_user_triggers = True  # Prevent CG User hooks
			user.new_password = "root@1234"

			# Insert or save user
			frappe.log_error(
				message=f"Inserting/saving core User for {self.email}",
				title="CG User Creation Debug",
			)
			if user.is_new():
				user.insert()
			else:
				user.save()

			# Update CG User with core user link
			self.user = user.name
			frappe.log_error(
				message=f"Successfully created/updated core User for {self.email}",
				title="CG User Creation Debug",
			)

			# Handle report_to separately to avoid recursion
			if self.report_to:
				report_to_entries = self.get("report_to")[:]
				self.report_to = []
				for report_entry in report_to_entries:
					if frappe.db.exists("CG User", {"email": report_entry.superior}):
						self.append("report_to", {"superior": report_entry.superior})
					else:
						frappe.log_error(
							message=f"Invalid report_to email {report_entry.superior} for {self.email}",
							title="CG User Report To Error",
						)

		except Exception as e:
			frappe.log_error(
				message=f"Error creating core User for {self.email}: {str(e)}\n{frappe.get_traceback()}",
				title="CG User Creation Error",
			)
			frappe.throw(_("Failed to create core User: {0}").format(str(e)))
		finally:
			frappe.local.in_create_core_user = False

	def update_user_details(self):
		"""Update existing User with CG User data and bulk upload optimizations."""
		try:
			user = frappe.get_doc("User", self.email)

			# Update basic fields
			user.first_name = self.first_name
			user.middle_name = self.middle_name
			user.last_name = self.last_name
			user.full_name = self.full_name
			user.mobile_no = self.phone
			user.location = self.branch_id
			user.user_image = self.user_image
			user.gender = self.gender
			user.birth_date = self.birthday
			user.enabled = cint(self.enabled)

			# FIXED ROLE HANDLING - Remove ALL CG roles and add the new one
			if self.role:
				formatted_role = self.format_role(self.role)

				# Remove ALL existing CG roles (not just same type)
				user.roles = [r for r in user.roles if not self.is_cg_role(r.role)]

				# Add the new CG role
				user.append("roles", {"role": formatted_role})

				# Ensure basic roles are present
				self.ensure_basic_roles(user)

			# Set flags for bulk operations
			user.flags.ignore_permissions = True
			if getattr(frappe.local, "bulk_upload", False):
				user.flags.ignore_links = False

			user.save()

		except Exception as e:
			frappe.log_error(f"Failed to update User {self.email}: {str(e)}")
			if not getattr(frappe.local, "bulk_upload", False):
				frappe.throw(_("Failed to update core User: {0}").format(str(e)))

	def format_role(self, role_name):
		"""Format role name to CG-ROLE format."""
		if role_name.startswith("ROLE-"):
			role_name = role_name[5:]
		return f"CG-ROLE-{role_name.replace(' ', '-').upper()}"

	def generate_unique_username(self, first_name, last_name):
		"""Generate unique username."""
		if not first_name:
			first_name = "user"
		if not last_name:
			last_name = ""

		base_name = first_name.replace(" ", "").lower()
		if last_name:
			base_name += "." + last_name.replace(" ", "").lower()

		username = base_name
		counter = 1
		while frappe.db.exists("User", username):
			username = f"{base_name}.{counter}"
			counter += 1

		return username

	# NEW HELPER METHODS FOR FIXED ROLE MANAGEMENT
	def is_cg_role(self, role_name):
		"""Check if a role is a CG role (starts with CG-ROLE-)."""
		if not role_name:
			return False
		return role_name.startswith("CG-ROLE-")

	def has_cg_role_changed(self):
		"""Check if the CG role has changed from the previous version."""
		if not self.is_new():
			old_doc = self.get_doc_before_save()
			if old_doc and old_doc.role != self.role:
				return True
		return False

	def ensure_basic_roles(self, user):
		"""Ensure user has basic Frappe roles for system access."""
		# Add essential roles for accessing other apps
		essential_roles = []

		# Add Employee roles if HRMS is installed
		if frappe.db.exists("Module Def", "HR"):
			essential_roles.extend(["Employee", "Employee Self Service"])

		# Add other app-specific roles as needed
		# For ERPNext
		if frappe.db.exists("Module Def", "Accounts"):
			essential_roles.append("Accounts User")

		# For Insights
		if frappe.db.exists("Module Def", "Insights"):
			essential_roles.append("Insights User")

		existing_roles = {r.role for r in user.roles}

		for role in essential_roles:
			if role not in existing_roles and frappe.db.exists("Role", role):
				user.append("roles", {"role": role})

	def update_team_membership(self):
		"""Update team membership based on report_to changes."""
		try:
			old_doc = self.get_doc_before_save()
			old_superiors = (
				{entry.superior for entry in old_doc.report_to} if old_doc and old_doc.report_to else set()
			)
			new_superiors = {entry.superior for entry in self.report_to} if self.report_to else set()

			# Remove from old teams
			removed_superiors = old_superiors - new_superiors
			for superior_id in removed_superiors:
				superior = frappe.get_doc("CG User", superior_id)
				team = self.get_team_for_superior(superior)
				if team and team.team_lead == superior.name:
					self.remove_user_from_team(team)

			# Add to new teams
			added_superiors = new_superiors - old_superiors
			for superior_id in added_superiors:
				superior = frappe.get_doc("CG User", superior_id)
				team = self.get_team_for_superior(superior)
				if team and team.team_lead == superior.name:
					self.add_user_to_team(team)

		except Exception as e:
			frappe.log_error(f"Error updating team membership for {self.name}: {str(e)}")

	def get_team_for_user(self):
		"""Get or create team for current user as lead."""
		existing_team = frappe.get_all(
			"CG Team",
			filters={
				"team_lead": self.name,
				"company_id": self.company_id,
				"branch_id": self.branch_id,
				"department": self.department_id,
			},
			limit=1,
		)

		if existing_team:
			return frappe.get_doc("CG Team", existing_team[0].name)

		return frappe.get_doc(
			{
				"doctype": "CG Team",
				"company_id": self.company_id,
				"branch_id": self.branch_id,
				"department": self.department_id,
				"team_lead": self.name,
			}
		)

	def get_team_for_superior(self, superior):
		"""Find or create team led by superior."""
		existing_team = frappe.get_all(
			"CG Team",
			filters={
				"team_lead": superior.name,
				"company_id": superior.company_id,
				"branch_id": superior.branch_id,
				"department": superior.department_id,
			},
			limit=1,
		)

		if existing_team:
			return frappe.get_doc("CG Team", existing_team[0].name)

		team = frappe.get_doc(
			{
				"doctype": "CG Team",
				"company_id": superior.company_id,
				"branch_id": superior.branch_id,
				"department": superior.department_id,
				"team_lead": superior.name,
			}
		)

		if not frappe.db.exists("CG Team", team.name):
			team.insert()
		return team

	def add_user_to_team(self, team):
		"""Add user to team if not already present."""
		existing_member = frappe.get_all(
			"CG Team Member",
			filters={"parent": team.name, "member": self.name},
		)

		if not existing_member:
			team.append("members", {"member": self.name})
			team.save()

	def remove_user_from_team(self, team):
		"""Remove user from team."""
		team_doc = frappe.get_doc("CG Team", team.name)
		team_doc.members = [member for member in team_doc.members if member.member != self.name]
		team_doc.save()

	def _check_circular_reference(self, email, seen):
		if not email:
			return
		user = frappe.get_doc("CG User", {"email": email})
		for report_entry in user.report_to or []:
			if report_entry.superior in seen:
				frappe.throw(f"Circular reference detected involving {report_entry.superior}")
			seen.add(report_entry.superior)
			self._check_circular_reference(report_entry.superior, seen)

	def update_report_to_relationships(self):
		"""Update report_to relationships when a team lead is being deactivated."""
		try:
			# Find the superior of the user being deactivated
			new_superior = None
			if self.report_to and len(self.report_to) > 0:
				new_superior = self.report_to[0].superior

				# Verify the new superior exists and is active
				if not frappe.db.exists("CG User", {"name": new_superior, "enabled": 1}):
					frappe.logger().warning(
						f"Cannot reassign report_to relationships: new superior {new_superior} does not exist or is inactive"
					)
					return

			# Find all users who have this user in their report_to
			users_reporting_to_this_user = frappe.get_all(
				"CG User Team", filters={"superior": self.name}, fields=["parent"]
			)

			if not users_reporting_to_this_user:
				frappe.logger().info(f"No users found reporting to {self.name}")
				return

			total_users_updated = 0
			users_with_no_new_superior = []

			for user_team_entry in users_reporting_to_this_user:
				try:
					user_doc = frappe.get_doc("CG User", user_team_entry.parent)

					# Remove the current user from report_to
					user_doc.report_to = [r for r in user_doc.report_to if r.superior != self.name]

					# Add new superior if available
					if new_superior:
						# Check if the new superior is not already in report_to
						existing_superiors = [r.superior for r in user_doc.report_to]
						if new_superior not in existing_superiors:
							user_doc.append("report_to", {"superior": new_superior})
							total_users_updated += 1

							frappe.logger().info(
								f"Updated report_to for user {user_doc.name}: removed {self.name}, added {new_superior}"
							)
						else:
							frappe.logger().info(
								f"User {user_doc.name} already reports to {new_superior}, only removed {self.name}"
							)
							total_users_updated += 1
					else:
						users_with_no_new_superior.append(user_doc.name)
						frappe.logger().info(
							f"Removed {self.name} from report_to for user {user_doc.name} (no new superior available)"
						)
						total_users_updated += 1

					# Save the updated user document
					user_doc.flags.ignore_permissions = True
					user_doc.save()

				except Exception as e:
					frappe.log_error(f"Error updating report_to for user {user_team_entry.parent}: {str(e)}")
					# Continue with other users even if one fails
					continue

			# Log summary
			if total_users_updated > 0:
				summary_message = f"Updated report_to relationships for {total_users_updated} user(s)"
				if new_superior:
					summary_message += f" (reassigned to {new_superior})"
				if users_with_no_new_superior:
					summary_message += f", {len(users_with_no_new_superior)} user(s) now have no superior"

				frappe.logger().info(summary_message)

				# Show message to user
				if new_superior:
					frappe.msgprint(
						_("Updated reporting relationships for {0} user(s). They now report to {1}").format(
							total_users_updated, new_superior
						),
						alert=True,
					)
				else:
					frappe.msgprint(
						_(
							"Removed reporting relationships for {0} user(s) (no superior available for reassignment)"
						).format(total_users_updated),
						alert=True,
					)

		except Exception as e:
			frappe.log_error(f"Error updating report_to relationships for user {self.name}: {str(e)}")


# API Methods
@frappe.whitelist()
def disable_cg_user_with_reassignment(user_name):
	"""API to disable a CG User with automatic task and team member reassignment."""
	try:
		if not frappe.has_permission("CG User", "write", user_name):
			frappe.throw(_("Insufficient permissions to disable user"))

		user = frappe.get_doc("CG User", user_name)
		user.disable_user_with_task_reassignment()
		return {
			"status": "success",
			"message": f"User {user.email} deleted successfully with tasks and team members reassigned",
		}
	except Exception as e:
		frappe.log_error(f"Failed to disable CG User {user_name}: {str(e)}")
		return {"status": "error", "message": str(e)}


@frappe.whitelist()
def disable_cg_user(user_name):
	"""API to disable a CG User."""
	try:
		if not frappe.has_permission("CG User", "write", user_name):
			frappe.throw(_("Insufficient permissions to disable user"))

		user = frappe.get_doc("CG User", user_name)
		user.disable_user()
		return {
			"status": "success",
			"message": f"User {user.email} deleted successfully",
		}
	except Exception as e:
		return {"status": "error", "message": str(e)}


@frappe.whitelist()
def rename_cg_user(old_name, new_name):
	"""API to rename CG User with comprehensive cleanup."""
	try:
		if not frappe.has_permission("CG User", "write", old_name):
			frappe.throw(_("Insufficient permissions to rename user"))

		if not frappe.db.exists("CG User", old_name):
			return {"status": "error", "error": f"CG User {old_name} does not exist."}

		new_name = new_name.lower().strip()

		# Validate new email
		if not frappe.utils.validate_email_address(new_name):
			return {"status": "error", "error": "Invalid email format for new name"}

		# Start transaction
		frappe.db.begin()

		# Handle Notification Settings
		notification_data = None
		# if frappe.db.exists("Notification Settings", old_name):
		# 	notification_doc = frappe.get_doc("Notification Settings", old_name)
		# 	notification_data = {
		# 		field: notification_doc.get(field) for field in notification_doc.meta.get_fieldnames()
		# 	}
		# 	frappe.delete_doc("Notification Settings", old_name, ignore_permissions=True)

		# Rename CG User
		new_doc_name = update_document_title(
			doctype="CG User",
			docname=old_name,
			name=new_name,
			merge=False,
		)

		# Rename core User
		if frappe.db.exists("User", old_name):
			rename_doc(
				doctype="User",
				old=old_name,
				new=new_name,
				merge=False,
				force=False,
				ignore_permissions=True,
				show_alert=True,
			)

		# Create new Notification Settings
		if notification_data and not frappe.db.exists("Notification Settings", new_name):
			new_notification = frappe.get_doc(
				{
					"doctype": "Notification Settings",
					"name": new_name,
					"user": new_name,
					**{k: v for k, v in notification_data.items() if k not in ["name", "user", "doctype"]},
				}
			)
			new_notification.flags.ignore_permissions = True
			new_notification.insert()

		frappe.db.commit()
		return {"status": "success", "new_name": new_doc_name}

	except Exception as e:
		frappe.db.rollback()
		frappe.log_error(f"Failed to rename CG User {old_name} to {new_name}: {str(e)}")
		return {"status": "error", "error": str(e)}


@frappe.whitelist()
def setup_bulk_upload_hooks():
	"""Setup hooks to bypass throttling during bulk uploads."""
	# This function can be called to ensure the monkey patch is applied
	pass


# Event handler to bypass throttling (add this to your hooks.py if needed)
def before_user_insert(doc, method):
	"""Event handler to bypass user throttling and validations during bulk uploads."""
	if getattr(frappe.local, "bulk_upload", False) or getattr(frappe.local, "skip_user_throttle", False):
		doc.flags.ignore_permissions = True
		doc.flags.ignore_mandatory = True
		doc.flags.ignore_links = True
		doc.flags.skip_cg_user_triggers = True
	if not getattr(frappe.local, "bulk_upload", False):
		doc.flags.skip_user_throttle = True  # Bypass throttling for single user creation


# Alternative approach: Override the throttle function entirely during bulk uploads
def override_user_throttling():
	"""Completely override user throttling during active bulk upload sessions."""
	if not hasattr(frappe.local, "_original_throttle_function"):
		# Store original function
		from frappe.core.doctype.user.user import throttle_user_creation

		frappe.local._original_throttle_function = throttle_user_creation

		# Replace with our bypass version
		def bypass_throttle():
			if getattr(frappe.local, "bulk_upload", False) or getattr(
				frappe.local, "skip_user_throttle", False
			):
				return
			return frappe.local._original_throttle_function()

		frappe.core.doctype.user.user.throttle_user_creation = bypass_throttle


@frappe.whitelist()
def create_single_cg_user(user_data: dict):
	"""Enqueue single CG User creation for efficiency."""
	return frappe.enqueue(
		"clapgrow_app.clapgrow_app.doctype.cg_user.cg_user.create_cg_user_job",
		user_data=user_data,
		queue="short",
		timeout=600,
	)


def create_cg_user_job(user_data: dict):
	"""Job to create a single CG User."""
	frappe.local.skip_user_throttle = True
	doc = frappe.get_doc(user_data)
	doc.insert()
	return {"status": "success", "email": doc.email}
