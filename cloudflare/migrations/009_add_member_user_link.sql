-- Links a users row to a members row.
-- Only set for role='member'; NULL for admin/editor/viewer.
ALTER TABLE users ADD COLUMN member_id TEXT REFERENCES members(id);
