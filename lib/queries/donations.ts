import type { D1Database } from "@cloudflare/workers-types";
import type { Donation } from "@/types";
import { auditStatement } from "@/lib/audit";

export interface DonationRow extends Donation {
  member_name: string | null;
  member_code: string | null;
}

export interface DonationFilters {
  type?:     "hadiya" | "zakat" | "other";
  dateFrom?: string;
  dateTo?:   string;
  category?: string;
  page:      number;
  pageSize:  number;
}

export interface DonationTotals {
  hadiya: number;
  zakat:  number;
  other:  number;
  grand:  number;
}

export interface DonationPage {
  entries:  DonationRow[];
  total:    number;
  page:     number;
  pageSize: number;
  totals:   DonationTotals;
}

function generateId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getDonations(
  db: D1Database,
  filters: DonationFilters
): Promise<DonationPage> {
  const { type, dateFrom, dateTo, category, page, pageSize } = filters;

  const conditions: string[] = [];
  const bindings:   (string | number)[] = [];

  if (type)     { conditions.push("d.type = ?");     bindings.push(type); }
  if (dateFrom) { conditions.push("d.date >= ?");    bindings.push(dateFrom); }
  if (dateTo)   { conditions.push("d.date <= ?");    bindings.push(dateTo); }
  if (category) { conditions.push("d.category = ?"); bindings.push(category); }

  const where  = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (page - 1) * pageSize;

  const rowsSql = `
    SELECT d.*, m.name AS member_name, m.code AS member_code
    FROM donations d
    LEFT JOIN members m ON m.id = d.member_id
    ${where}
    ORDER BY d.date DESC, d.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `SELECT COUNT(*) AS total FROM donations d ${where}`;

  // Grand totals are always unfiltered so the KPI chips show overall picture
  const totalsSql = `
    SELECT
      COALESCE(SUM(CASE WHEN type = 'hadiya' THEN amount ELSE 0 END), 0) AS hadiya,
      COALESCE(SUM(CASE WHEN type = 'zakat'  THEN amount ELSE 0 END), 0) AS zakat,
      COALESCE(SUM(CASE WHEN type = 'other'  THEN amount ELSE 0 END), 0) AS other,
      COALESCE(SUM(amount), 0) AS grand
    FROM donations
  `;

  const [rowsRes, countRes, totalsRes] = await Promise.all([
    db.prepare(rowsSql).bind(...bindings, pageSize, offset).all<DonationRow>(),
    db.prepare(countSql).bind(...bindings).first<{ total: number }>(),
    db.prepare(totalsSql).first<DonationTotals>(),
  ]);

  return {
    entries:  rowsRes.results,
    total:    countRes?.total ?? 0,
    page,
    pageSize,
    totals:   totalsRes ?? { hadiya: 0, zakat: 0, other: 0, grand: 0 },
  };
}

export async function insertDonation(
  db: D1Database,
  params: {
    memberId:   string | null;
    memberCode: string | null;
    donorName:  string;
    type:       "hadiya" | "zakat" | "other";
    category:   "general" | "medical" | "scholarship" | "emergency";
    amount:     number;
    date:       string;
    mode:       string | null;
    reference:  string | null;
    notes:      string | null;
    userId:     string;
  }
): Promise<void> {
  const {
    memberId, memberCode, donorName, type, category,
    amount, date, mode, reference, notes, userId,
  } = params;

  const donationId    = generateId();
  const ledgerEntryId = generateId();

  // Zakat donations → restricted zakat account; all others → general
  const ledgerAccount  = type === "zakat" ? "zakat" : "general";
  const ledgerCategory = type === "zakat" ? "Scholarship" : "Donation";
  const ledgerDesc     = type === "hadiya"
    ? `Hadiya — ${donorName}`
    : type === "zakat"
    ? `Zakat Donation — ${donorName}`
    : `Donation — ${donorName}`;

  await db.batch([
    db.prepare(`
      INSERT INTO donations
        (id, date, member_id, donor_name, type, category, amount, mode, reference, notes, ledger_entry_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      donationId, date, memberId, donorName, type, category,
      amount, mode, reference, notes, ledgerEntryId,
    ),

    db.prepare(`
      INSERT INTO ledger_entries
        (id, date, account, category, member_id, member_code, description,
         amount, reference, source_type, source_id, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'donation', ?, ?)
    `).bind(
      ledgerEntryId, date, ledgerAccount, ledgerCategory,
      memberId, memberCode, ledgerDesc,
      amount, reference, donationId, userId,
    ),

    auditStatement(db, {
      userId,
      action:   "create",
      entity:   "donations",
      entityId: donationId,
      after:    { memberId, donorName, type, category, amount, date, mode, reference },
    }),
  ]);
}
