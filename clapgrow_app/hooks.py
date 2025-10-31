app_name = "clapgrow_app"
app_title = "Clapgrow - Task Automation & Workflow Management Platform"
app_publisher = "Clapgrow"
app_description = "Clapgrow is a powerful task automation and workflow management platform that helps teams streamline their processes, automate repetitive tasks, and boost productivity. Get started with Clapgrow today!"
app_email = "sourav@clapgrow.com"
app_license = "mit"

# Apps
# ------------------
brand_html = '<div><img src="./clapgrow.png"/> Clapgrow</div>'

# required_apps = []

# Each item in the list will be shown as an app in the apps page
# add_to_apps_screen = [
# 	{
# 		"name": "clapgrow_app",
# 		"logo": "/assets/clapgrow_app/logo.png",
# 		"title": "Clapgrow App",
# 		"route": "/clapgrow_app",
# 		"has_permission": "clapgrow_app.api.permission.has_app_permission"
# 	}
# ]

add_to_apps_screen = [
	{
		"name": "clapgrow_app",
		"logo": "/assets/clapgrow_app/images/clapgrow-logo.png",
		"title": "Clapgrow",
		"route": "/clapgrow/dashboard",
		"has_permission": "clapgrow_app.api.permission.has_app_permission",
	}
]

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
# app_include_css = "/assets/clapgrow_app/css/clapgrow_app.css"
# app_include_js = "/assets/clapgrow_app/js/clapgrow_app.js"


# include js, css files in header of web template
# web_include_css = "/assets/clapgrow_app/css/clapgrow_app.css"
# web_include_js = "/assets/clapgrow_app/js/clapgrow_app.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "clapgrow_app/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
# doctype_js = {"doctype" : "public/js/doctype.js"}
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Svg Icons
# ------------------
# include app icons in desk
# app_include_icons = "clapgrow_app/public/icons.svg"

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
# 	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
website_generators = ["Web Page"]

# Website generators for SEO
website_route_rules = [
	{"from_route": "/clapgrow", "to_route": "clapgrow"},
	{"from_route": "/", "to_route": "clapgrow"},
]

# Jinja
# ----------

# add methods and filters to jinja environment
# jinja = {
# 	"methods": "clapgrow_app.utils.jinja_methods",
# 	"filters": "clapgrow_app.utils.jinja_filters"
# }

# Installation
# ------------

# before_install = "clapgrow_app.install.before_install"
after_install = "clapgrow_app.api.after_install"

# Uninstallation
# ------------

# before_uninstall = "clapgrow_app.uninstall.before_uninstall"
# after_uninstall = "clapgrow_app.uninstall.after_uninstall"

# Integration Setup
# ------------------
# To set up dependencies/integrations with other apps
# Name of the app being installed is passed as an argument

# before_app_install = "clapgrow_app.utils.before_app_install"
# after_app_install = "clapgrow_app.utils.after_app_install"

# Integration Cleanup
# -------------------
# To clean up dependencies/integrations with other apps
# Name of the app being uninstalled is passed as an argument

# before_app_uninstall = "clapgrow_app.utils.before_app_uninstall"
# after_app_uninstall = "clapgrow_app.utils.after_app_uninstall"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "clapgrow_app.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }


# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
# 	}
# }
# clapgrow_app/hooks.py

# doc_events = {"CG User": {"on_update": "clapgrow_app.clapgrow_app.doctype.cg_user.cg_user.on_update"}}

# doc_events = {
# 	"CG User": {
# 		"after_insert": "clapgrow_app.api.whatsapp.notify.notify_on_user_creation",
# 	},
# }

doc_events = {
	"User": {
		"before_insert": "clapgrow_app.clapgrow_app.doctype.cg_user.cg_user.before_user_insert",
	},
	"CG User": {
		"after_insert": "clapgrow_app.api.whatsapp.notify.notify_on_user_creation",
		"before_insert": "clapgrow_app.clapgrow_app.doctype.cg_user.cg_user.before_cg_user_insert",
	},
	"CG Task Instance": {
		"after_insert": "clapgrow_app.api.tasks.doc_events.handle_task_after_insert",
		"on_update": "clapgrow_app.api.tasks.doc_events.handle_task_on_update",
		"on_trash": "clapgrow_app.api.tasks.doc_events.handle_task_on_trash",
		"on_cancel": "clapgrow_app.api.tasks.doc_events.handle_task_on_cancel",
	},
	"Comment": {"after_insert": "clapgrow_app.api.whatsapp.notify.notify_on_comment"},
}

# doc_events = {
#     "CG Task Instance": {
#         "after_insert": "clapgrow_app.api.whatsapp.notify.notify_users_for_created_tasks",
#         "on_update": "clapgrow_app.api.whatsapp.notify.handle_task_completion",
#     },
#     "Comment": {
#         "after_insert": "clapgrow_app.api.whatsapp.notify.notify_on_comment"
#     },
#     "User": {
#         "after_insert": "clapgrow_app.api.whatsapp.notify.notify_on_user_creation"
#     }
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"clapgrow_app.tasks.all"
# 	],
# 	"daily": [
# 		"clapgrow_app.tasks.daily"
# 	],
# 	"hourly": [
# 		"clapgrow_app.tasks.hourly"
# 	],
# 	"weekly": [
# 		"clapgrow_app.tasks.weekly"
# 	],
# 	"monthly": [
# 		"clapgrow_app.tasks.monthly"
# 	],
# }


logging_config = {
	"version": 1,
	"disable_existing_loggers": False,
	"formatters": {
		"verbose": {"format": "%(levelname)s %(asctime)s %(module)s %(message)s"},
		"simple": {"format": "%(levelname)s %(message)s"},
	},
	"handlers": {
		"console": {
			"level": "DEBUG",
			"class": "logging.StreamHandler",
			"formatter": "simple",
		},
		"file": {
			"level": "DEBUG",
			"class": "logging.FileHandler",
			"filename": "sites/clapgrow.dev/logs/my_logfile.log",
			"formatter": "verbose",
		},
	},
	"loggers": {
		"scheduled_task_instance": {
			"handlers": ["console", "file"],
			"level": "DEBUG",
			"propagate": True,
		},
	},
}


scheduler_events = {
	# "hourly": ["clapgrow_app.api.bulk_upload.cleanup_expired_job_cache"],
	# 	# "daily_long": ["clapgrow_app.api.automation.schedule_task_instance.generate_daily_task_instances"],
	# 	# "weekly_long": ["clapgrow_app.api.automation.schedule_task_instance.generate_weekly_task_instances"],
	# 	# "monthly_long": ["clapgrow_app.api.automation.schedule_task_instance.generate_monthly_task_instances"],
	# 	# 	"cron": {
	# 	# 		"0 3 * * 0": [
	# 	# 			"clapgrow_app.api.automation.schedule_task_instance.enqueue_generate_recurring_task"
	# 	# 		],  # Runs Sunday 3 AM
	# 	# 		"0 8 * * *": [  # Runs every day at 8 AM
	# 	# 			"clapgrow_app.api.whatsapp.notify.daily_task_digest",
	# 	# 			"clapgrow_app.api.whatsapp.notify.daily_task_summary",
	# 	# 		],
	# 	# 	},
	# 	# }
	# 	"cron": {
	# 		# Runs every Sunday at 3:00 AM
	# 		"0 3 * * 0": [
	# 			# "clapgrow_app.clapgrow_app.doctype.cg_task_definition.cg_task_definition.generate_weekly_task_instances"
	# 			"clapgrow_app.clapgrow_app.doctype.cg_task_definition.cg_task_definition.generate_recurring_task_instances"
	# 		],
	# 		"15 * * * *": ["clapgrow_app.api.login.update_task_status"],
	# 		"30 8 * * *": [
	# 			"clapgrow_app.api.whatsapp.notify.daily_task_digest",
	# 			"clapgrow_app.api.whatsapp.notify.daily_task_summary",
	# 		],
	# 		# "35 11 * * *": [
	# 		# 	"clapgrow_app.api.whatsapp.notify.incomplete_tasks_reminder",
	# 		# ],
	# 		# Runs every day at 8:00 AM
	# 		"0 8 * * *": ["clapgrow_app.api.whatsapp.notify.incomplete_tasks_reminder"],
	# 		# "* */4 * * *": [
	# 		#     "clapgrow_app.clapgrow_app.doctype.cg_task_instance.cg_task_instance.send_task_reminders"
	# 		# ],
	# 		"* * * * *": [
	# 			"clapgrow_app.clapgrow_app.doctype.cg_task_instance.cg_task_instance.send_task_reminders",
	# 			# "clapgrow_app.api.login.update_task_status",
	# 		],
	# 	},
	"cron": {
		# Every Sunday at 3:00 AM - Generate recurring task instances
		# Using both 0 and 7 for maximum compatibility
		"0 3 * * 0,7": [
			"clapgrow_app.clapgrow_app.doctype.cg_task_definition.cg_task_definition.generate_recurring_task_instances"
		],
		# Every day at 7:45 AM - Process morning notifications (ensures 8 AM notifications are ready)
		"45 7 * * *": ["clapgrow_app.api.whatsapp.notification_processor.process_pending_notifications"],
		# Every day at 8:00 AM - Morning reminders
		"00 8 * * *": [
			"clapgrow_app.api.whatsapp.notify.morning_incomplete_tasks_reminder",
			"clapgrow_app.api.whatsapp.notify.daily_recurring_task_reminder",
		],
		# Every day at 8:30 AM - Daily task digest
		"30 8 * * *": [
			"clapgrow_app.api.whatsapp.notify.daily_task_digest",
			"clapgrow_app.api.whatsapp.notify.daily_task_summary",
		],
		# Every day at 4:00 PM - Evening reminders
		"00 16 * * *": [
			"clapgrow_app.api.whatsapp.notify.evening_incomplete_tasks_reminder",
		],
		# Every day at 4:30 PM - Daily task summary
		"30 16 * * *": [
			"clapgrow_app.api.whatsapp.notify.daily_task_summary",
			"clapgrow_app.api.whatsapp.notify.daily_task_digest",
			"clapgrow_app.api.whatsapp.notify.daily_recurring_task_reminder",
		],
		# Every hour at 00 minutes - Update task status
		"0 * * * *": [
			"clapgrow_app.api.login.update_task_status",
		],
		# Every hour at 15 minutes - Process pending notifications
		"15 * * * *": ["clapgrow_app.api.whatsapp.notification_processor.process_pending_notifications"],
		# Every 5 minutes - Holiday list refresh and task reminders
		"*/5 * * * *": [
			"clapgrow_app.api.holidays.refresh_all_holiday_lists",
			"clapgrow_app.clapgrow_app.doctype.cg_task_instance.cg_task_instance.send_task_reminders",
		],
	},
}


# Testing
# -------

# before_tests = "clapgrow_app.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "clapgrow_app.event.get_events"
# }
override_whitelisted_methods = {
	"frappe.core.doctype.user.user.throttle_user_creation": "clapgrow_app.api.bulk_upload.bypass_throttle_user_creation"
}
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "clapgrow_app.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]

# Ignore links to specified DocTypes when deleting documents
# -----------------------------------------------------------

# ignore_links_on_delete = ["Communication", "ToDo"]

# Request Events
# ----------------
# before_request = ["clapgrow_app.utils.before_request"]
# after_request = ["clapgrow_app.utils.after_request"]

# Job Events
# ----------
# before_job = ["clapgrow_app.utils.before_job"]
# after_job = ["clapgrow_app.utils.after_job"]

# User Data Protection
# --------------------

# user_data_fields = [
# 	{
# 		"doctype": "{doctype_1}",
# 		"filter_by": "{filter_by}",
# 		"redact_fields": ["{field_1}", "{field_2}"],
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_2}",
# 		"filter_by": "{filter_by}",
# 		"partial": 1,
# 	},
# 	{
# 		"doctype": "{doctype_3}",
# 		"strict": False,
# 	},
# 	{
# 		"doctype": "{doctype_4}"
# 	}
# ]

user_data_fields = [
	{
		"doctype": "{doctype_1}",
		"filter_by": "{filter_by}",
		"redact_fields": ["{field_1}", "{field_2}"],
		"partial": 1,
	},
	{
		"doctype": "{doctype_2}",
		"filter_by": "{filter_by}",
		"partial": 1,
	},
	{
		"doctype": "{doctype_3}",
		"strict": False,
	},
	{"doctype": "{doctype_4}"},
]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"clapgrow_app.auth.validate"
# ]

# Automatically update python controller files with type annotations for this app.
# export_python_type_annotations = True

# default_log_clearing_doctypes = {
# 	"Logging DocType Name": 30  # days to retain logs
# }
extend_bootinfo = "clapgrow_app.boot.boot_session"

boot_session = (
	"clapgrow_app.clapgrow_app.overrides.notification_recipient.override_notification_recipient_field"
)


website_route_rules = [
	{"from_route": "/clapgrow/<path:app_path>", "to_route": "clapgrow"},
]
