import type { D1Database } from "@cloudflare/workers-types";
import { auditStatement } from "@/lib/audit";

export async function getSetting(db: D1Database, key: string): Promise<string | null> {
  const row = await db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .bind(key)
    .first<{ value: string }>();
  return row?.value ?? null;
}

export async function getSettings(
  db: D1Database,
  keys: string[]
): Promise<Record<string, string>> {
  if (keys.length === 0) return {};
  const placeholders = keys.map(() => "?").join(", ");
  const { results } = await db
    .prepare(`SELECT key, value FROM settings WHERE key IN (${placeholders})`)
    .bind(...keys)
    .all<{ key: string; value: string }>();
  return Object.fromEntries(results.map((r) => [r.key, r.value]));
}

export async function setSetting(
  db: D1Database,
  key: string,
  value: string,
  userId: string
): Promise<void> {
  const before = await getSetting(db, key);
  await db.batch([
    db
      .prepare(
        `INSERT INTO settings (key, value, updated_at, updated_by)
         VALUES (?, ?, datetime('now'), ?)
         ON CONFLICT (key) DO UPDATE SET
           value      = excluded.value,
           updated_at = excluded.updated_at,
           updated_by = excluded.updated_by`
      )
      .bind(key, value, userId),
    auditStatement(db, {
      userId,
      action:   before === null ? "create" : "update",
      entity:   "settings",
      entityId: key,
      before:   before !== null ? { key, value: before } : undefined,
      after:    { key, value },
    }),
  ]);
}

export async function setSettings(
  db: D1Database,
  entries: Record<string, string>,
  userId: string
): Promise<void> {
  for (const [key, value] of Object.entries(entries)) {
    await setSetting(db, key, value, userId);
  }
}
