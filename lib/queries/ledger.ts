import type { D1Database } from "@cloudflare/workers-types";
import type { LedgerEntry } from "@/types";
import { auditStatement } from "@/lib/audit";

export type LedgerAccount = "general" | "zakat" | "interest";

export interface LedgerRow extends LedgerEntry {
  running_balance: number;
}

export interface LedgerFilters {
  account:    LedgerAccount;
  dateFrom?:  string;
  dateTo?:    string;
  category?:  string;
  memberCode?: string;
  direction?: "in" | "out";
  page:       number;
  pageSize:   number;
}

export interface LedgerPage {
  entries:    LedgerRow[];
  total:      number;
  balance:    number;
  page:       number;
  pageSize:   number;
}

function generateId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getLedger(db: D1Database, filters: LedgerFilters): Promise<LedgerPage> {
  const { account, dateFrom, dateTo, category, memberCode, direction, page, pageSize } = filters;

  const conditions: string[] = ["e.account = ?", "e.is_deleted = 0"];
  const bindings: (string | number)[] = [account];

  if (dateFrom) { conditions.push("e.date >= ?"); bindings.push(dateFrom); }
  if (dateTo)   { conditions.push("e.date <= ?"); bindings.push(dateTo); }
  if (category) { conditions.push("e.category = ?"); bindings.push(category); }
  if (memberCode) { conditions.push("e.member_code = ?"); bindings.push(memberCode); }
  if (direction === "in")  { conditions.push("e.amount > 0"); }
  if (direction === "out") { conditions.push("e.amount < 0"); }

  const where = conditions.join(" AND ");
  const offset = (page - 1) * pageSize;

  // Window function computes running balance per account over all non-deleted rows
  // ordered by date+created_at so it's deterministic and correct even after edits.
  const sql = `
    WITH ranked AS (
      SELECT *,
        SUM(amount) OVER (
          PARTITION BY account
          ORDER BY date ASC, created_at ASC
          ROWS UNBOUNDED PRECEDING
        ) AS running_balance
      FROM ledger_entries
      WHERE account = ? AND is_deleted = 0
    )
    SELECT e.*, r.running_balance
    FROM ledger_entries e
    JOIN ranked r ON r.id = e.id
    WHERE ${where}
    ORDER BY e.date DESC, e.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `
    SELECT COUNT(*) AS total
    FROM ledger_entries e
    WHERE ${where}
  `;

  const balanceSql = `
    SELECT COALESCE(SUM(amount), 0) AS balance
    FROM ledger_entries
    WHERE account = ? AND is_deleted = 0
  `;

  const [rowsRes, countRes, balanceRes] = await Promise.all([
    db.prepare(sql).bind(account, ...bindings, pageSize, offset).all<LedgerRow>(),
    db.prepare(countSql).bind(...bindings).first<{ total: number }>(),
    db.prepare(balanceSql).bind(account).first<{ balance: number }>(),
  ]);

  return {
    entries:  rowsRes.results,
    total:    countRes?.total ?? 0,
    balance:  balanceRes?.balance ?? 0,
    page,
    pageSize,
  };
}

export async function insertExpense(
  db: D1Database,
  params: {
    account:     "general" | "zakat";
    category:    string;
    description: string;
    amount:      number;       // positive; will be stored as negative
    date:        string;
    reference:   string | null;
    notes:       string | null;
    userId:      string;
  }
): Promise<void> {
  const { account, category, description, amount, date, reference, notes, userId } = params;
  const id = generateId();
  const storedAmount = -Math.abs(amount);

  await db.batch([
    db.prepare(`
      INSERT INTO ledger_entries
        (id, date, account, category, description, amount, reference, notes, source_type, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'expense', ?)
    `).bind(id, date, account, category, description, storedAmount, reference ?? null, notes ?? null, userId),

    auditStatement(db, {
      userId,
      action:   "create",
      entity:   "ledger_entries",
      entityId: id,
      after:    { account, category, description, amount: storedAmount, date, reference },
    }),
  ]);
}

export async function insertInterest(
  db: D1Database,
  params: {
    type:        "credit" | "debit";
    category:    string;
    description: string;
    amount:      number;       // positive; sign determined by type
    date:        string;
    reference:   string | null;
    notes:       string | null;
    userId:      string;
  }
): Promise<void> {
  const { type, category, description, amount, date, reference, notes, userId } = params;
  const id = generateId();
  const storedAmount = type === "credit" ? Math.abs(amount) : -Math.abs(amount);

  await db.batch([
    db.prepare(`
      INSERT INTO ledger_entries
        (id, date, account, category, description, amount, reference, notes, source_type, created_by)
      VALUES (?, ?, 'interest', ?, ?, ?, ?, ?, 'interest', ?)
    `).bind(id, date, category, description, storedAmount, reference ?? null, notes ?? null, userId),

    auditStatement(db, {
      userId,
      action:   "create",
      entity:   "ledger_entries",
      entityId: id,
      after:    { account: "interest", category, description, amount: storedAmount, date, reference },
    }),
  ]);
}

export async function updateEntry(
  db: D1Database,
  params: {
    id:          string;
    category:    string;
    description: string;
    amount:      number;       // signed (as it should be stored)
    date:        string;
    reference:   string | null;
    notes:       string | null;
    userId:      string;
    before:      unknown;
  }
): Promise<void> {
  const { id, category, description, amount, date, reference, notes, userId, before } = params;

  await db.batch([
    db.prepare(`
      UPDATE ledger_entries
      SET category = ?, description = ?, amount = ?, date = ?,
          reference = ?, notes = ?, updated_at = datetime('now')
      WHERE id = ?
    `).bind(category, description, amount, date, reference ?? null, notes ?? null, id),

    auditStatement(db, {
      userId,
      action:   "update",
      entity:   "ledger_entries",
      entityId: id,
      before,
      after:    { category, description, amount, date, reference },
    }),
  ]);
}

export async function softDeleteEntry(
  db: D1Database,
  params: {
    id:     string;
    userId: string;
    before: unknown;
  }
): Promise<void> {
  const { id, userId, before } = params;

  await db.batch([
    db.prepare(`
      UPDATE ledger_entries
      SET is_deleted = 1, deleted_at = datetime('now'), deleted_by = ?
      WHERE id = ?
    `).bind(userId, id),

    auditStatement(db, {
      userId,
      action:   "delete",
      entity:   "ledger_entries",
      entityId: id,
      before,
    }),
  ]);
}
