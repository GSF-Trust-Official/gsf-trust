import type { D1Database } from "@cloudflare/workers-types";
import type { Member } from "@/types";
import { auditStatement } from "@/lib/audit";

export async function getAllMembers(db: D1Database): Promise<Member[]> {
  const { results } = await db
    .prepare("SELECT * FROM members ORDER BY code ASC")
    .all<Member>();
  return results;
}

export async function getMemberById(
  db: D1Database,
  id: string
): Promise<Member | null> {
  return db
    .prepare("SELECT * FROM members WHERE id = ?")
    .bind(id)
    .first<Member>();
}

/** Suggests the next member code by finding the highest numeric code and adding 1. */
export async function getNextMemberCode(db: D1Database): Promise<string> {
  const row = await db
    .prepare(
      "SELECT code FROM members WHERE code GLOB '[0-9]*' ORDER BY CAST(code AS INTEGER) DESC LIMIT 1"
    )
    .first<{ code: string }>();

  if (!row) return "0001";
  const next = parseInt(row.code, 10) + 1;
  return String(next).padStart(4, "0");
}

export async function createMember(
  db: D1Database,
  data: Omit<Member, "created_at" | "updated_at">,
  userId: string
): Promise<void> {
  await db.batch([
    db
      .prepare(
        `INSERT INTO members
          (id, code, name, email, phone, address, join_date, status, is_bod, bod_designation, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)`
      )
      .bind(
        data.id,
        data.code,
        data.name,
        data.email ?? null,
        data.phone ?? null,
        data.address ?? null,
        data.join_date,
        data.is_bod ? 1 : 0,
        data.bod_designation ?? null,
        data.notes ?? null
      ),
    auditStatement(db, {
      userId,
      action: "create",
      entity: "members",
      entityId: data.id,
      after: data,
    }),
  ]);
}

export async function updateMember(
  db: D1Database,
  id: string,
  data: Partial<Omit<Member, "id" | "created_at" | "updated_at">>,
  before: Member,
  userId: string
): Promise<void> {
  const after = { ...before, ...data };
  await db.batch([
    db
      .prepare(
        `UPDATE members SET
          code = ?,
          name = ?,
          email = ?,
          phone = ?,
          address = ?,
          join_date = ?,
          is_bod = ?,
          bod_designation = ?,
          notes = ?,
          status = ?,
          updated_at = datetime('now')
         WHERE id = ?`
      )
      .bind(
        after.code,
        after.name,
        after.email ?? null,
        after.phone ?? null,
        after.address ?? null,
        after.join_date,
        after.is_bod ? 1 : 0,
        after.bod_designation ?? null,
        after.notes ?? null,
        after.status,
        id
      ),
    auditStatement(db, {
      userId,
      action: "update",
      entity: "members",
      entityId: id,
      before,
      after,
    }),
  ]);
}

export async function deactivateMember(
  db: D1Database,
  id: string,
  before: Member,
  userId: string
): Promise<void> {
  await db.batch([
    db
      .prepare(
        "UPDATE members SET status = 'inactive', updated_at = datetime('now') WHERE id = ?"
      )
      .bind(id),
    auditStatement(db, {
      userId,
      action: "delete",
      entity: "members",
      entityId: id,
      before,
      after: { status: "inactive" },
    }),
  ]);
}
