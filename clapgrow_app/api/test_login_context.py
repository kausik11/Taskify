from unittest.mock import MagicMock, patch

import frappe
from frappe.tests.utils import FrappeTestCase
from werkzeug.test import EnvironBuilder
from werkzeug.wrappers import Request


@patch("frappe.get_all")
@patch("frappe.get_system_settings")
@patch("frappe.get_website_settings")
@patch("frappe.utils.oauth.get_oauth_keys")
class TestGetContext(FrappeTestCase):
	def setUp(self):
		super().setUp()
		self.request_env = EnvironBuilder().get_environ()
		self.request = Request(self.request_env)

		if not hasattr(frappe, "local"):
			frappe.local = MagicMock()

		frappe.local.request = self.request
		frappe.local.response = {}

	def test_get_context(self, mock_oauth_keys, mock_website_settings, mock_system_settings, mock_get_all):
		from clapgrow_app.api.login import get_context

		mock_get_all.return_value = []
		mock_system_settings.return_value = False
		mock_website_settings.return_value = False

		context = get_context()

		self.assertIn("provider_logins", context)
		self.assertIn("login_label", context)
		self.assertIn("login_with_email_link", context)
		self.assertIn("two_factor_is_enabled", context)
		self.assertIn("disable_signup", context)

	def test_get_context_without_providers(
		self, mock_oauth_keys, mock_website_settings, mock_system_settings, mock_get_all
	):
		from clapgrow_app.api.login import get_context

		mock_get_all.return_value = []
		mock_system_settings.return_value = False
		context = get_context()

		self.assertFalse(context.get("social_login"))
		self.assertEqual(len(context["provider_logins"]), 0)

	def test_get_context_login_with_email_link(
		self, mock_oauth_keys, mock_website_settings, mock_system_settings, mock_get_all
	):
		from clapgrow_app.api.login import get_context

		# Test with email link enabled
		mock_system_settings.return_value = True
		mock_get_all.return_value = []
		context = get_context()
		self.assertTrue(context["login_with_email_link"])

		# Test with email link disabled
		mock_system_settings.return_value = False
		context = get_context()
		self.assertFalse(context["login_with_email_link"])

	def test_get_context_two_factor_enabled(
		self, mock_oauth_keys, mock_website_settings, mock_system_settings, mock_get_all
	):
		from clapgrow_app.api.login import get_context

		with patch("clapgrow_app.api.login.two_factor_is_enabled") as mock_2fa:
			# Test with 2FA enabled
			mock_2fa.return_value = True
			mock_get_all.return_value = []
			mock_system_settings.return_value = False
			context = get_context()
			self.assertTrue(context["two_factor_is_enabled"])

			# Test with 2FA disabled
			mock_2fa.return_value = False
			context = get_context()
			self.assertFalse(context["two_factor_is_enabled"])

	def test_get_context_disable_signup(
		self, mock_oauth_keys, mock_website_settings, mock_system_settings, mock_get_all
	):
		from clapgrow_app.api.login import get_context

		# Test with signup disabled
		mock_website_settings.return_value = True
		mock_get_all.return_value = []
		mock_system_settings.return_value = False
		context = get_context()
		self.assertTrue(context["disable_signup"])

		# Test with signup enabled
		mock_website_settings.return_value = False
		context = get_context()
		self.assertFalse(context["disable_signup"])
