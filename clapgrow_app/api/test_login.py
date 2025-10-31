from unittest.mock import MagicMock, patch

import frappe
from frappe.tests.utils import FrappeTestCase
from werkzeug.test import EnvironBuilder
from werkzeug.wrappers import Request


class TestLogin(FrappeTestCase):
	def setUp(self):
		super().setUp()
		# Set up test environment
		self.request_env = EnvironBuilder().get_environ()
		self.request = Request(self.request_env)

		# Initialize frappe.local
		if not hasattr(frappe, "local"):
			frappe.local = MagicMock()

		# Set up frappe.local attributes
		frappe.local.request = self.request
		frappe.local.response = {}

		# Create a mock login manager that doesn't raise exceptions
		self.mock_login_manager = MagicMock()
		self.mock_login_manager.logout = MagicMock()
		frappe.local.login_manager = self.mock_login_manager

	def tearDown(self):
		# Clear frappe.local
		frappe.local.response = {}

		# Clear the mock login manager
		frappe.local.login_manager = None

		super().tearDown()

	def test_login_missing_credentials(self):
		from clapgrow_app.api.login import login

		with self.assertRaises(frappe.AuthenticationError):
			login("", "")

	# @patch("frappe.auth.LoginManager")
	# def test_login_invalid_credentials(self, MockLoginManager):
	# 	from clapgrow_app.api.login import login

	# 	# Set up mock to raise AuthenticationError
	# 	mock_manager = MagicMock()
	# 	mock_manager.authenticate.side_effect = frappe.AuthenticationError()
	# 	MockLoginManager.return_value = mock_manager

	# 	login("testuser", "wrongpass")

	# 	self.assertEqual(frappe.local.response.get("message"), "Invalid login credentials")
	# 	self.assertEqual(frappe.local.response.get("http_status_code"), 401)

	@patch("clapgrow_app.api.login.get_oauth2_authorize_url")
	def test_oauth_login_successful(self, mock_auth_url):
		from clapgrow_app.api.login import oauth_login

		# Set up mock
		mock_auth_url.return_value = "https://test-auth-url.com"

		# Mock request args
		frappe.local.request.args = {"redirect-to": "/"}

		oauth_login("google")

		self.assertEqual(frappe.local.response.get("type"), "redirect")
		self.assertEqual(frappe.local.response.get("location"), "https://test-auth-url.com")
		mock_auth_url.assert_called_once_with("google", "/")

	@patch("clapgrow_app.api.login.get_oauth2_authorize_url")
	def test_oauth_login_error(self, mock_auth_url):
		from clapgrow_app.api.login import oauth_login

		# Set up mock to raise exception
		mock_auth_url.side_effect = Exception("OAuth Error")

		# Mock request args
		frappe.local.request.args = {"redirect-to": "/"}

		with patch("frappe.log_error") as mock_log_error:
			oauth_login("google")

			self.assertEqual(frappe.local.response.get("message"), "OAuth login failed")
			self.assertEqual(frappe.local.response.get("http_status_code"), 500)
			mock_log_error.assert_called_once()

	def test_logout_successful(self):
		from clapgrow_app.api.login import logout

		logout()

		self.assertEqual(frappe.local.response.get("message"), "Logged out successfully")
		self.assertEqual(frappe.local.response.get("redirect_to"), "/login")
		self.mock_login_manager.logout.assert_called_once()

	def test_logout_error(self):
		from clapgrow_app.api.login import logout

		# Set up mock login manager to raise exception
		self.mock_login_manager.logout.side_effect = Exception("Logout Error")

		with patch("frappe.log_error") as mock_log_error:
			logout()

		self.assertEqual(frappe.local.response.get("message"), "An error occurred during logout")
		self.assertEqual(frappe.local.response.get("http_status_code"), 500)
		mock_log_error.assert_called_once()
