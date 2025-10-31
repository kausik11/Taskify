#!/usr/bin/env python3
"""
Production Holiday Fix Script
Run this after deploying the rolling 365-day fix to regenerate all existing holidays.

Usage:
    bench execute clapgrow_app.fix_production_holidays.fix_all_holidays
"""

import frappe


def fix_all_holidays():
	"""Regenerate all recurring holidays with the new rolling 365-day logic."""
	frappe.init(site=frappe.local.site)
	frappe.connect()

	try:
		print("\n" + "=" * 80)
		print("HOLIDAY REGENERATION - Rolling 365-Day Fix")
		print("=" * 80 + "\n")

		# Get all active recurring holidays
		recurring_holidays = frappe.get_all(
			"CG Holiday",
			filters={"is_recurring": 1, "is_active": 1},
			fields=["name", "holiday_name", "branch_id", "recurrence_type"],
		)

		if not recurring_holidays:
			print("✓ No recurring holidays found")
			return

		print(f"Found {len(recurring_holidays)} recurring holidays to regenerate\n")

		updated_count = 0
		errors = []

		for i, holiday_record in enumerate(recurring_holidays, 1):
			try:
				print(f"[{i}/{len(recurring_holidays)}] Processing: {holiday_record.holiday_name}")

				holiday_doc = frappe.get_doc("CG Holiday", holiday_record.name)

				# Count before
				before_count = len(holiday_doc.generated_dates)

				# Regenerate with new logic
				holiday_doc.generate_recurring_dates_for_years()

				# Count after
				after_count = len(holiday_doc.generated_dates)

				# Get date range
				if holiday_doc.generated_dates:
					dates = [d.holiday_date for d in holiday_doc.generated_dates]
					first_date = min(dates)
					last_date = max(dates)
					print(f"  ✓ Generated {after_count} dates (was {before_count})")
					print(f"    Range: {first_date} to {last_date}")
				else:
					print("  ⚠ No dates generated")

				# Save
				holiday_doc.flags.ignore_permissions = True
				holiday_doc.save()

				updated_count += 1

				# Commit every 10 records
				if updated_count % 10 == 0:
					frappe.db.commit()
					print(f"\n  → Committed batch (progress: {updated_count}/{len(recurring_holidays)})\n")

			except Exception as e:
				error_msg = f"Error processing {holiday_record.name}: {str(e)}"
				print(f"  ✗ {error_msg}")
				frappe.log_error(error_msg, "Holiday Regeneration Error")
				errors.append(error_msg)
				continue

		# Final commit
		frappe.db.commit()
		print("\n" + "-" * 80)

		# Clear caches
		print("Clearing holiday caches...")
		frappe.cache().delete_keys("holiday_*")
		frappe.cache().delete_keys("employee_holidays_*")
		frappe.cache().delete_keys("branch_holidays_*")
		print("✓ Caches cleared")

		# Summary
		print("\n" + "=" * 80)
		print("REGENERATION COMPLETE")
		print("=" * 80)
		print(f"✓ Successfully regenerated: {updated_count}/{len(recurring_holidays)}")

		if errors:
			print(f"✗ Errors encountered: {len(errors)}")
			print("\nError details:")
			for error in errors[:5]:  # Show first 5 errors
				print(f"  - {error}")
			if len(errors) > 5:
				print(f"  ... and {len(errors) - 5} more (check Error Log)")
		else:
			print("✓ No errors")

		print("\n" + "=" * 80)

		# Trigger employee holiday list refresh
		print("\nTriggering employee holiday list refresh (background job)...")
		frappe.enqueue(
			"clapgrow_app.api.automation.scheduler.refresh_all_holiday_lists",
			queue="long",
			timeout=3600,
		)
		print("✓ Background job queued for employee holiday list refresh")
		print("\n" + "=" * 80 + "\n")

		return {
			"success": True,
			"updated": updated_count,
			"total": len(recurring_holidays),
			"errors": len(errors),
		}

	except Exception as e:
		print(f"\n✗ Fatal error: {str(e)}")
		frappe.log_error(f"Fatal error in holiday regeneration: {str(e)}", "Holiday Regeneration Error")
		frappe.db.rollback()
		return {"success": False, "error": str(e)}

	finally:
		frappe.destroy()


def preview_changes():
	"""Preview what changes will be made without actually saving."""
	frappe.init(site=frappe.local.site)
	frappe.connect()

	try:
		print("\n" + "=" * 80)
		print("HOLIDAY REGENERATION PREVIEW (No Changes Made)")
		print("=" * 80 + "\n")

		recurring_holidays = frappe.get_all(
			"CG Holiday",
			filters={"is_recurring": 1, "is_active": 1},
			fields=["name", "holiday_name", "recurrence_type"],
		)

		if not recurring_holidays:
			print("No recurring holidays found")
			return

		print(f"Found {len(recurring_holidays)} recurring holidays:\n")

		for holiday_record in recurring_holidays:
			holiday_doc = frappe.get_doc("CG Holiday", holiday_record.name)

			current_count = len(holiday_doc.generated_dates)

			if holiday_doc.generated_dates:
				current_dates = [d.holiday_date for d in holiday_doc.generated_dates]
				current_first = min(current_dates)
				current_last = max(current_dates)
			else:
				current_first = "N/A"
				current_last = "N/A"

			print(f"📅 {holiday_record.holiday_name}")
			print(f"   Type: {holiday_record.recurrence_type}")
			print(f"   Current: {current_count} dates ({current_first} to {current_last})")
			print()

		print("=" * 80)
		print("\nTo apply changes, run: bench execute clapgrow_app.fix_production_holidays.fix_all_holidays")
		print("=" * 80 + "\n")

	finally:
		frappe.destroy()


if __name__ == "__main__":
	fix_all_holidays()
