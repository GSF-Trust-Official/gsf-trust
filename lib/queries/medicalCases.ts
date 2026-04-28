import type { D1Database } from "@cloudflare/workers-types";
import type { MedicalCase } from "@/types";
import { auditStatement } from "@/lib/audit";

export interface MedicalCaseFilters {
  status?: "open" | "closed";
  page:     number;
  pageSize: number;
}

export interface MedicalPage {
  entries:  MedicalCase[];
  total:    number;
  page:     number;
  pageSize: number;
  openCount:   number;
  closedCount: number;
  totalPaid:   number;
}

function generateId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function generateCaseRef(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 5).toUpperCase();
  return `MC-${ts}-${rand}`;
}

export async function getMedicalCases(
  db: D1Database,
  filters: MedicalCaseFilters,
  isAdmin: boolean
): Promise<MedicalPage> {
  const { status, page, pageSize } = filters;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const bindings: (string | number)[] = [];
  if (status) { conditions.push("status = ?"); bindings.push(status); }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const nameCol = isAdmin ? "beneficiary_name" : `CASE WHEN mask_name = 1 THEN 'XXXX' ELSE beneficiary_name END`;

  const rowsSql = `
    SELECT id, case_ref, ${nameCol} AS beneficiary_name, mask_name,
           amount_requested, amount_paid, amount_external,
           status, opened_at, closed_at, description, notes, created_at
    FROM medical_cases
    ${where}
    ORDER BY CASE status WHEN 'open' THEN 0 ELSE 1 END, opened_at DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `SELECT COUNT(*) AS total FROM medical_cases ${where}`;

  const statsSql = `
    SELECT
      COALESCE(SUM(CASE WHEN status = 'open'   THEN 1 ELSE 0 END), 0) AS open_count,
      COALESCE(SUM(CASE WHEN status = 'closed' THEN 1 ELSE 0 END), 0) AS closed_count,
      COALESCE(SUM(amount_paid), 0) AS total_paid
    FROM medical_cases
  `;

  const [rowsRes, countRes, statsRes] = await Promise.all([
    db.prepare(rowsSql).bind(...bindings, pageSize, offset).all<MedicalCase>(),
    db.prepare(countSql).bind(...bindings).first<{ total: number }>(),
    db.prepare(statsSql).first<{ open_count: number; closed_count: number; total_paid: number }>(),
  ]);

  return {
    entries:     rowsRes.results,
    total:       countRes?.total ?? 0,
    page,
    pageSize,
    openCount:   statsRes?.open_count   ?? 0,
    closedCount: statsRes?.closed_count ?? 0,
    totalPaid:   statsRes?.total_paid   ?? 0,
  };
}

export async function getMedicalCaseById(
  db: D1Database,
  id: string,
  isAdmin: boolean
): Promise<MedicalCase | null> {
  const nameCol = isAdmin ? "beneficiary_name" : `CASE WHEN mask_name = 1 THEN 'XXXX' ELSE beneficiary_name END`;
  return db
    .prepare(`SELECT id, case_ref, ${nameCol} AS beneficiary_name, mask_name,
              amount_requested, amount_paid, amount_external,
              status, opened_at, closed_at, description, notes, created_at
              FROM medical_cases WHERE id = ?`)
    .bind(id)
    .first<MedicalCase>();
}

export async function createMedicalCase(
  db: D1Database,
  params: {
    beneficiaryName: string;
    maskName:        boolean;
    amountRequested: number;
    openedAt:        string;
    description:     string | null;
    notes:           string | null;
    userId:          string;
  }
): Promise<string> {
  const id      = generateId();
  const caseRef = generateCaseRef();

  await db.batch([
    db.prepare(`
      INSERT INTO medical_cases
        (id, case_ref, beneficiary_name, mask_name, amount_requested,
         amount_paid, amount_external, status, opened_at, description, notes)
      VALUES (?, ?, ?, ?, ?, 0, 0, 'open', ?, ?, ?)
    `).bind(
      id, caseRef, params.beneficiaryName, params.maskName ? 1 : 0,
      params.amountRequested, params.openedAt, params.description, params.notes
    ),

    auditStatement(db, {
      userId:   params.userId,
      action:   "create",
      entity:   "medical_cases",
      entityId: id,
      after:    {
        caseRef, beneficiaryName: params.maskName ? "XXXX" : params.beneficiaryName,
        amountRequested: params.amountRequested, status: "open",
      },
    }),
  ]);

  return id;
}

export async function updateMedicalCase(
  db: D1Database,
  id: string,
  before: MedicalCase,
  params: {
    amountPaid?:     number;
    amountExternal?: number;
    notes?:          string | null;
    status?:         "open" | "closed";
    closedAt?:       string | null;
    userId:          string;
  }
): Promise<void> {
  const { amountPaid, amountExternal, notes, status, closedAt, userId } = params;

  const sets: string[] = [];
  const binds: (string | number | null)[] = [];

  if (amountPaid     !== undefined) { sets.push("amount_paid = ?");     binds.push(amountPaid); }
  if (amountExternal !== undefined) { sets.push("amount_external = ?"); binds.push(amountExternal); }
  if (notes          !== undefined) { sets.push("notes = ?");           binds.push(notes); }
  if (status         !== undefined) { sets.push("status = ?");          binds.push(status); }
  if (closedAt       !== undefined) { sets.push("closed_at = ?");       binds.push(closedAt); }

  if (sets.length === 0) return;

  await db.batch([
    db.prepare(`UPDATE medical_cases SET ${sets.join(", ")} WHERE id = ?`)
      .bind(...binds, id),

    auditStatement(db, {
      userId,
      action:   "update",
      entity:   "medical_cases",
      entityId: id,
      before:   { amountPaid: before.amount_paid, amountExternal: before.amount_external, status: before.status },
      after:    { amountPaid, amountExternal, notes, status, closedAt },
    }),
  ]);
}
