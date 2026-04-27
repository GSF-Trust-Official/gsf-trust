-- Migration 003: Seed the initial Treasurer account.
-- must_change_password = 1 forces a password reset on first login.
-- Before applying this migration, replace the email and password_hash with
-- deployment-specific values generated outside source control.

INSERT INTO users (email, password_hash, name, role, is_active, must_change_password)
VALUES (
  'gsftrust.official@gmail.com',
  '$2b$12$EoJszXFjwGzRLwS5DW2uH.0Y1dl5ytTZJ78ftlnsNEqPYuf/tu4mK',
  'Treasurer',
  'admin',
  1,
  1
) ON CONFLICT(email) DO NOTHING;
