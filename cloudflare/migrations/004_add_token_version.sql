-- Migration 004: Add token_version to users for server-side session revocation.
-- Logout and password-change increment this column; the version is embedded in the JWT.
-- On every authenticated request the JWT version is checked against the DB value,
-- so stolen cookies are invalidated immediately rather than persisting until expiry.
-- SQLite allows ADD COLUMN with a DEFAULT even when rows already exist.

ALTER TABLE users ADD COLUMN token_version INTEGER NOT NULL DEFAULT 0;
