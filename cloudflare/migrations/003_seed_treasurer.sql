-- Migration 003: Seed the initial Treasurer account.
-- Temporary password: GSFAdmin2026!
-- must_change_password = 1 forces a password reset on first login.
-- Change the email to the real Treasurer email before applying to production.

INSERT INTO users (email, password_hash, name, role, is_active, must_change_password)
VALUES (
  'treasurer@gsffoundation.org',
  '$2b$12$ul0LgHdJrCXR1dcUhamYIeRwHhg22yVEa17ErWlTSVP2xyk1YCIhG',
  'Treasurer',
  'admin',
  1,
  1
) ON CONFLICT(email) DO NOTHING;
