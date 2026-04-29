import type { D1Database } from "@cloudflare/workers-types";

export interface ReportFilters {
  from: string; // YYYY-MM-DD
  to:   string; // YYYY-MM-DD
}

export interface ReportSummary {
  generalBalance:              number;
  zakatBalance:                number;
  totalSubscriptionsCollected: number;
  totalDonations:              number;
  totalMedicalDisbursed:       number;
  totalScholarshipPaid:        number;
  memberCount:                 number;
}

export interface ReportData {
  filters:           ReportFilters;
  summary:           ReportSummary;
  generalEntries:    Array<Record<string, unknown>>;
  zakatEntries:      Array<Record<string, unknown>>;
  subscriptions:     Array<Record<string, unknown>>;
  donations:         Array<Record<string, unknown>>;
  medicalCases:      Array<Record<string, unknown>>;
  scholarshipPayouts: Array<Record<string, unknown>>;
}

export async function getReportData(
  db: D1Database,
  filters: ReportFilters
): Promise<ReportData> {
  const { from, to } = filters;

  const [
    balances,
    generalRes,
    zakatRes,
    subRes,
    donRes,
    medRes,
    scholRes,
    memberCountRes,
  ] = await Promise.all([
    // All-time balances (not filtered by date — these are running totals)
    db.prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN account = 'general' AND is_deleted = 0 THEN amount ELSE 0 END), 0) AS general_balance,
        COALESCE(SUM(CASE WHEN account = 'zakat'   AND is_deleted = 0 THEN amount ELSE 0 END), 0) AS zakat_balance
      FROM ledger_entries
    `).first<{ general_balance: number; zakat_balance: number }>(),

    // General ledger entries in range
    db.prepare(`
      SELECT le.*, m.name AS member_name
      FROM ledger_entries le
      LEFT JOIN members m ON m.id = le.member_id
      WHERE le.account = 'general' AND le.is_deleted = 0
        AND le.date >= ? AND le.date <= ?
      ORDER BY le.date, le.created_at
    `).bind(from, to).all<Record<string, unknown>>(),

    // Zakat ledger entries in range
    db.prepare(`
      SELECT le.*, m.name AS member_name
      FROM ledger_entries le
      LEFT JOIN members m ON m.id = le.member_id
      WHERE le.account = 'zakat' AND le.is_deleted = 0
        AND le.date >= ? AND le.date <= ?
      ORDER BY le.date, le.created_at
    `).bind(from, to).all<Record<string, unknown>>(),

    // Paid subscriptions in range
    db.prepare(`
      SELECT s.*, m.name AS member_name, m.code AS member_code_display
      FROM subscriptions s
      JOIN members m ON m.id = s.member_id
      WHERE s.status = 'paid' AND s.paid_date >= ? AND s.paid_date <= ?
      ORDER BY s.paid_date, m.code
    `).bind(from, to).all<Record<string, unknown>>(),

    // Donations in range
    db.prepare(`
      SELECT d.*, m.name AS member_name
      FROM donations d
      LEFT JOIN members m ON m.id = d.member_id
      WHERE d.date >= ? AND d.date <= ?
      ORDER BY d.date
    `).bind(from, to).all<Record<string, unknown>>(),

    // Medical cases opened in range
    db.prepare(`
      SELECT * FROM medical_cases
      WHERE opened_at >= ? AND opened_at <= ?
      ORDER BY opened_at
    `).bind(from, to).all<Record<string, unknown>>(),

    // Scholarship payouts in range
    db.prepare(`
      SELECT sp.*, m.name AS member_name
      FROM scholarship_payouts sp
      LEFT JOIN members m ON m.id = sp.member_id
      WHERE sp.paid_on >= ? AND sp.paid_on <= ?
      ORDER BY sp.paid_on
    `).bind(from, to).all<Record<string, unknown>>(),

    // Active member count (always current, not date-filtered)
    db.prepare(
      `SELECT COUNT(*) AS cnt FROM members WHERE status = 'active'`
    ).first<{ cnt: number }>(),
  ]);

  const subs     = subRes.results  as Array<{ amount?: number }>;
  const dons     = donRes.results  as Array<{ amount?: number }>;
  const meds     = medRes.results  as Array<{ amount_paid?: number }>;
  const schols   = scholRes.results as Array<{ amount?: number }>;

  return {
    filters,
    summary: {
      generalBalance:              balances?.general_balance ?? 0,
      zakatBalance:                balances?.zakat_balance   ?? 0,
      totalSubscriptionsCollected: subs.reduce((s, r)  => s + (r.amount     ?? 0), 0),
      totalDonations:              dons.reduce((s, r)  => s + (r.amount     ?? 0), 0),
      totalMedicalDisbursed:       meds.reduce((s, r)  => s + (r.amount_paid ?? 0), 0),
      totalScholarshipPaid:        schols.reduce((s, r) => s + (r.amount     ?? 0), 0),
      memberCount:                 memberCountRes?.cnt ?? 0,
    },
    generalEntries:    generalRes.results,
    zakatEntries:      zakatRes.results,
    subscriptions:     subRes.results,
    donations:         donRes.results,
    medicalCases:      medRes.results,
    scholarshipPayouts: scholRes.results,
  };
}
