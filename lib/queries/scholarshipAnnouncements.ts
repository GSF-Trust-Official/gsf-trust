import type { D1Database } from "@cloudflare/workers-types";
import type { ScholarshipAnnouncement } from "@/types";
import { auditStatement } from "@/lib/audit";

function generateId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getActiveAnnouncement(
  db: D1Database
): Promise<ScholarshipAnnouncement | null> {
  return db
    .prepare("SELECT * FROM scholarship_announcements WHERE is_active = 1 LIMIT 1")
    .first<ScholarshipAnnouncement>();
}

export async function listAnnouncements(
  db: D1Database
): Promise<ScholarshipAnnouncement[]> {
  const { results } = await db
    .prepare("SELECT * FROM scholarship_announcements ORDER BY created_at DESC LIMIT 20")
    .all<ScholarshipAnnouncement>();
  return results;
}

export async function upsertAnnouncement(
  db: D1Database,
  id: string | null,
  params: {
    title:               string;
    description:         string;
    eligibilityCriteria: string | null;
    deadline:            string | null;
    contact:             string | null;
    posterDriveUrl:      string | null;
    documentsDriveUrl:   string | null;
    formUrl:             string | null;
    isActive:            boolean;
    userId:              string;
  }
): Promise<string> {
  const {
    title, description, eligibilityCriteria, deadline, contact,
    posterDriveUrl, documentsDriveUrl, formUrl, isActive, userId,
  } = params;

  const announcementId = id ?? generateId();
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");

  if (id) {
    await db.batch([
      db.prepare(`
        UPDATE scholarship_announcements SET
          title = ?, description = ?, eligibility_criteria = ?,
          deadline = ?, contact = ?, poster_drive_url = ?,
          documents_drive_url = ?, form_url = ?,
          is_active = ?, updated_at = ?
        WHERE id = ?
      `).bind(
        title, description, eligibilityCriteria, deadline, contact,
        posterDriveUrl, documentsDriveUrl, formUrl,
        isActive ? 1 : 0, now, id
      ),
      auditStatement(db, { userId, action: "update", entity: "scholarship_announcements", entityId: id,
        after: { title, isActive } }),
    ]);
  } else {
    await db.batch([
      db.prepare(`
        INSERT INTO scholarship_announcements
          (id, title, description, eligibility_criteria, deadline, contact,
           poster_drive_url, documents_drive_url, form_url, is_active, posted_by)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        announcementId, title, description, eligibilityCriteria, deadline, contact,
        posterDriveUrl, documentsDriveUrl, formUrl,
        isActive ? 1 : 0, userId
      ),
      auditStatement(db, { userId, action: "create", entity: "scholarship_announcements",
        entityId: announcementId, after: { title, isActive } }),
    ]);
  }

  return announcementId;
}

export async function activateAnnouncement(
  db: D1Database,
  id: string,
  userId: string
): Promise<void> {
  const now = new Date().toISOString().slice(0, 19).replace("T", " ");
  await db.batch([
    db.prepare("UPDATE scholarship_announcements SET is_active = 0, updated_at = ?").bind(now),
    db.prepare("UPDATE scholarship_announcements SET is_active = 1, updated_at = ? WHERE id = ?").bind(now, id),
    auditStatement(db, { userId, action: "update", entity: "scholarship_announcements",
      entityId: id, after: { is_active: true } }),
  ]);
}
