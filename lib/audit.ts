import type { D1Database } from "@cloudflare/workers-types";

interface AuditParams {
  userId: string;
  action: "create" | "update" | "delete" | "login" | "logout" | "failed_login";
  entity: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  ipAddress?: string;
  userAgent?: string;
}

// Returns a prepared D1 statement for inclusion in a db.batch() call.
// Always use via batch — never call .run() directly, so the audit record
// is atomic with the mutation it describes.
export function auditStatement(db: D1Database, params: AuditParams) {
  return db
    .prepare(
      `INSERT INTO audit_log
        (user_id, action, entity, entity_id, before_json, after_json, ip_address, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .bind(
      params.userId,
      params.action,
      params.entity,
      params.entityId ?? null,
      params.before !== undefined ? JSON.stringify(params.before) : null,
      params.after !== undefined ? JSON.stringify(params.after) : null,
      params.ipAddress ?? null,
      params.userAgent ?? null
    );
}
