import type { D1Database } from "@cloudflare/workers-types";
import type { User } from "@/types";

export async function getUserByEmail(
  db: D1Database,
  email: string
): Promise<User | null> {
  return db
    .prepare("SELECT * FROM users WHERE email = ? AND is_active = 1")
    .bind(email)
    .first<User>();
}

export async function getUserById(
  db: D1Database,
  id: string
): Promise<User | null> {
  return db
    .prepare("SELECT * FROM users WHERE id = ? AND is_active = 1")
    .bind(id)
    .first<User>();
}

export async function updateLastLogin(
  db: D1Database,
  userId: string
): Promise<void> {
  await db
    .prepare(
      "UPDATE users SET last_login = datetime('now'), updated_at = datetime('now') WHERE id = ?"
    )
    .bind(userId)
    .run();
}
