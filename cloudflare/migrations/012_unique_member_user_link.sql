-- Prevent multiple user accounts from being linked to the same member.
-- Partial unique index: only enforced when member_id is not NULL.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_member_id_unique
  ON users(member_id) WHERE member_id IS NOT NULL;
