import type { D1Database } from "@cloudflare/workers-types";
import type { ScholarshipPayout } from "@/types";
import { auditStatement } from "@/lib/audit";

export interface ScholarshipPayoutRow extends ScholarshipPayout {
  member_name: string | null;
  member_code: string | null;
}

export interface ScholarshipPage {
  entries:    ScholarshipPayoutRow[];
  total:      number;
  page:       number;
  pageSize:   number;
  totalPaid:  number;
}

function generateId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getScholarshipPayouts(
  db: D1Database,
  filters: { academicYear?: string; page: number; pageSize: number }
): Promise<ScholarshipPage> {
  const { academicYear, page, pageSize } = filters;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const bindings: (string | number)[] = [];
  if (academicYear) { conditions.push("sp.academic_year = ?"); bindings.push(academicYear); }

  const where  = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  const rowsSql = `
    SELECT sp.*, m.name AS member_name, m.code AS member_code
    FROM scholarship_payouts sp
    LEFT JOIN members m ON m.id = sp.member_id
    ${where}
    ORDER BY sp.paid_on DESC, sp.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `SELECT COUNT(*) AS total FROM scholarship_payouts sp ${where}`;
  const totalSql = `SELECT COALESCE(SUM(amount), 0) AS total_paid FROM scholarship_payouts sp ${where}`;

  const [rowsRes, countRes, totalRes] = await Promise.all([
    db.prepare(rowsSql).bind(...bindings, pageSize, offset).all<ScholarshipPayoutRow>(),
    db.prepare(countSql).bind(...bindings).first<{ total: number }>(),
    db.prepare(totalSql).bind(...bindings).first<{ total_paid: number }>(),
  ]);

  return {
    entries:   rowsRes.results,
    total:     countRes?.total     ?? 0,
    page,
    pageSize,
    totalPaid: totalRes?.total_paid ?? 0,
  };
}

export async function insertScholarshipPayout(
  db: D1Database,
  params: {
    beneficiaryName:   string;
    memberId:          string | null;
    memberCode:        string | null;
    academicYear:      string;
    amount:            number;
    eligibilityNotes:  string | null;
    paidOn:            string;
    userId:            string;
  }
): Promise<void> {
  const {
    beneficiaryName, memberId, memberCode,
    academicYear, amount, eligibilityNotes, paidOn, userId,
  } = params;

  const payoutId     = generateId();
  const ledgerEntryId = generateId();
  const description  = `Scholarship — ${beneficiaryName}`;

  await db.batch([
    db.prepare(`
      INSERT INTO scholarship_payouts
        (id, beneficiary_name, member_id, academic_year, amount,
         eligibility_notes, paid_on, ledger_entry_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      payoutId, beneficiaryName, memberId, academicYear,
      amount, eligibilityNotes, paidOn, ledgerEntryId
    ),

    // Outflow from zakat account (negative amount)
    db.prepare(`
      INSERT INTO ledger_entries
        (id, date, account, category, member_id, member_code, description,
         amount, source_type, source_id, created_by)
      VALUES (?, ?, 'zakat', 'Scholarship', ?, ?, ?, ?, 'scholarship_payout', ?, ?)
    `).bind(
      ledgerEntryId, paidOn,
      memberId, memberCode, description,
      -amount, payoutId, userId
    ),

    auditStatement(db, {
      userId,
      action:   "create",
      entity:   "scholarship_payouts",
      entityId: payoutId,
      after:    { beneficiaryName, academicYear, amount, paidOn },
    }),
  ]);
}
