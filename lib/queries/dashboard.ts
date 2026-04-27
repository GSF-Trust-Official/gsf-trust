import type { D1Database } from "@cloudflare/workers-types";
import type { DashboardKpis } from "@/types";

export interface CollectionRateRow {
  year: number;
  month: number;
  paid: number;
  due: number;
  total: number;
}

export interface DonationBreakdownRow {
  type: string;
  total: number;
}

export interface ExpenseAllocationRow {
  category: string;
  total: number;
}

export interface RecentActivityRow {
  id: string;
  date: string;
  account: "general" | "zakat" | "interest";
  category: string;
  description: string;
  amount: number;
  member_code: string | null;
}

export interface DashboardData {
  kpis: DashboardKpis;
  collectionRate: CollectionRateRow[];
  donationBreakdown: DonationBreakdownRow[];
  expenseAllocation: ExpenseAllocationRow[];
  recentActivity: RecentActivityRow[];
}

export async function getDashboardData(db: D1Database): Promise<DashboardData> {
  const [
    generalResult,
    zakatResult,
    interestResult,
    medicalResult,
    duesResult,
    collectionResult,
    donationResult,
    expenseResult,
    activityResult,
  ] = await db.batch([
    db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as balance FROM ledger_entries WHERE account = 'general' AND is_deleted = 0"
    ),
    db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as balance FROM ledger_entries WHERE account = 'zakat' AND is_deleted = 0"
    ),
    db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as balance FROM ledger_entries WHERE account = 'interest' AND is_deleted = 0"
    ),
    db.prepare(
      "SELECT COALESCE(SUM(amount_requested - amount_paid - amount_external), 0) as pool FROM medical_cases WHERE status = 'open'"
    ),
    db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as dues FROM subscriptions WHERE status = 'due'"
    ),
    db.prepare(`
      SELECT year, month,
        SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) as paid,
        SUM(CASE WHEN status = 'due'  THEN 1 ELSE 0 END) as due,
        COUNT(*) as total
      FROM subscriptions
      WHERE date(year || '-' || printf('%02d', month) || '-01')
            >= date('now', '-11 months', 'start of month')
        AND date(year || '-' || printf('%02d', month) || '-01')
            <= date('now', 'start of month')
      GROUP BY year, month
      ORDER BY year ASC, month ASC
    `),
    db.prepare(
      "SELECT type, COALESCE(SUM(amount), 0) as total FROM donations GROUP BY type ORDER BY total DESC"
    ),
    db.prepare(`
      SELECT category, COALESCE(SUM(ABS(amount)), 0) as total
      FROM ledger_entries
      WHERE amount < 0 AND is_deleted = 0 AND account IN ('general', 'zakat')
      GROUP BY category
      ORDER BY total DESC
      LIMIT 6
    `),
    db.prepare(`
      SELECT id, date, account, category, description, amount, member_code
      FROM ledger_entries
      WHERE is_deleted = 0
      ORDER BY date DESC, created_at DESC
      LIMIT 10
    `),
  ]);

  const general = ((generalResult.results[0] ?? {}) as { balance: number }).balance ?? 0;
  const zakat   = ((zakatResult.results[0]   ?? {}) as { balance: number }).balance ?? 0;
  const interest = ((interestResult.results[0] ?? {}) as { balance: number }).balance ?? 0;
  const medicalPool = ((medicalResult.results[0] ?? {}) as { pool: number }).pool ?? 0;
  const dues = ((duesResult.results[0] ?? {}) as { dues: number }).dues ?? 0;

  return {
    kpis: {
      total_funds: general + zakat,
      general_balance: general,
      zakat_balance: zakat,
      interest_balance: interest,
      medical_pool: medicalPool,
      outstanding_dues: dues,
    },
    collectionRate:   collectionResult.results as CollectionRateRow[],
    donationBreakdown: donationResult.results as DonationBreakdownRow[],
    expenseAllocation: expenseResult.results as ExpenseAllocationRow[],
    recentActivity:   activityResult.results as RecentActivityRow[],
  };
}
