import type { D1Database } from "@cloudflare/workers-types";
import type { Subscription, SubscriptionMatrixRow } from "@/types";
import { auditStatement } from "@/lib/audit";

export interface ArrearRow {
  member_id:    string;
  member_code:  string;
  member_name:  string;
  due_count:    number;
  total_due:    number;
  oldest_month: number;
  oldest_year:  number;
}

function generateId(): string {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function getMatrixForYear(
  db: D1Database,
  year: number
): Promise<SubscriptionMatrixRow[]> {
  const { results: members } = await db
    .prepare(
      "SELECT id, code, name FROM members WHERE status = 'active' ORDER BY code ASC"
    )
    .all<{ id: string; code: string; name: string }>();

  if (members.length === 0) return [];

  const { results: subs } = await db
    .prepare("SELECT * FROM subscriptions WHERE year = ?")
    .bind(year)
    .all<Subscription>();

  const subMap = new Map<string, Map<number, Subscription>>();
  for (const sub of subs) {
    if (!subMap.has(sub.member_id)) subMap.set(sub.member_id, new Map());
    subMap.get(sub.member_id)!.set(sub.month, sub);
  }

  return members.map((m) => ({
    member_id:   m.id,
    member_code: m.code,
    member_name: m.name,
    months: Object.fromEntries(
      Array.from({ length: 12 }, (_, i) => [i + 1, subMap.get(m.id)?.get(i + 1) ?? null])
    ) as Record<number, Subscription | null>,
  }));
}

export async function getArrears(db: D1Database): Promise<ArrearRow[]> {
  const { results } = await db
    .prepare(`
      SELECT
        m.id                           AS member_id,
        m.code                         AS member_code,
        m.name                         AS member_name,
        COUNT(*)                       AS due_count,
        COALESCE(SUM(s.amount), 0)     AS total_due,
        MIN(s.year * 100 + s.month)    AS oldest_period
      FROM subscriptions s
      JOIN members m ON m.id = s.member_id
      WHERE s.status = 'due'
      GROUP BY m.id, m.code, m.name
      ORDER BY due_count DESC, m.code ASC
    `)
    .all<{
      member_id:     string;
      member_code:   string;
      member_name:   string;
      due_count:     number;
      total_due:     number;
      oldest_period: number;
    }>();

  return results.map((r) => ({
    ...r,
    oldest_month: r.oldest_period % 100,
    oldest_year:  Math.floor(r.oldest_period / 100),
  }));
}

export async function upsertSubscription(
  db: D1Database,
  params: {
    member_id:   string;
    member_code: string;
    member_name: string;
    month:       number;
    year:        number;
    amount:      number;
    paid_date:   string;
    mode:        "upi" | "bank" | "cash";
    reference:   string | null;
    notes:       string | null;
    userId:      string;
  }
): Promise<void> {
  const {
    member_id, member_code, member_name,
    month, year, amount, paid_date, mode, reference, notes, userId,
  } = params;

  const existing = await db
    .prepare(
      "SELECT id, ledger_entry_id FROM subscriptions WHERE member_id = ? AND month = ? AND year = ?"
    )
    .bind(member_id, month, year)
    .first<{ id: string; ledger_entry_id: string | null }>();

  const subId    = existing?.id ?? generateId();
  const ledgerId = generateId();

  const monthLabel = new Date(year, month - 1).toLocaleDateString("en-IN", {
    month: "short", year: "numeric",
  });
  const description = `Subscription — ${member_name} (${member_code}) — ${monthLabel}`;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statements: any[] = [];

  // If re-paying an already-paid subscription, soft-delete the old ledger entry
  if (existing?.ledger_entry_id) {
    statements.push(
      db
        .prepare(
          "UPDATE ledger_entries SET is_deleted = 1, deleted_at = datetime('now'), deleted_by = ? WHERE id = ?"
        )
        .bind(userId, existing.ledger_entry_id)
    );
  }

  statements.push(
    db
      .prepare(`
        INSERT INTO subscriptions
          (id, member_id, month, year, status, amount, paid_date, mode, reference, notes, ledger_entry_id)
        VALUES (?, ?, ?, ?, 'paid', ?, ?, ?, ?, ?, ?)
        ON CONFLICT (member_id, month, year) DO UPDATE SET
          status          = 'paid',
          amount          = excluded.amount,
          paid_date       = excluded.paid_date,
          mode            = excluded.mode,
          reference       = excluded.reference,
          notes           = excluded.notes,
          ledger_entry_id = excluded.ledger_entry_id,
          updated_at      = datetime('now')
      `)
      .bind(subId, member_id, month, year, amount, paid_date, mode,
            reference ?? null, notes ?? null, ledgerId),

    db
      .prepare(`
        INSERT INTO ledger_entries
          (id, date, account, category, member_id, member_code, description, amount, source_type, source_id, created_by)
        VALUES (?, ?, 'general', 'Subscription', ?, ?, ?, ?, 'subscription', ?, ?)
      `)
      .bind(ledgerId, paid_date, member_id, member_code, description, amount, subId, userId),

    auditStatement(db, {
      userId,
      action:   existing ? "update" : "create",
      entity:   "subscriptions",
      entityId: subId,
      after:    { member_id, month, year, amount, paid_date, mode, reference, notes },
    })
  );

  await db.batch(statements);
}

export async function bulkMarkPaid(
  db: D1Database,
  params: {
    member_ids: string[];
    month:      number;
    year:       number;
    amount:     number;
    paid_date:  string;
    mode:       "upi" | "bank" | "cash";
    userId:     string;
  }
): Promise<void> {
  const { member_ids, month, year, amount, paid_date, mode, userId } = params;

  const placeholders = member_ids.map(() => "?").join(", ");

  const [membersRes, existingRes] = await Promise.all([
    db
      .prepare(`SELECT id, code, name FROM members WHERE id IN (${placeholders})`)
      .bind(...member_ids)
      .all<{ id: string; code: string; name: string }>(),
    db
      .prepare(
        `SELECT id, member_id, ledger_entry_id FROM subscriptions
         WHERE member_id IN (${placeholders}) AND month = ? AND year = ?`
      )
      .bind(...member_ids, month, year)
      .all<{ id: string; member_id: string; ledger_entry_id: string | null }>(),
  ]);

  const existingMap = new Map(existingRes.results.map((s) => [s.member_id, s]));

  const monthLabel = new Date(year, month - 1).toLocaleDateString("en-IN", {
    month: "short", year: "numeric",
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statements: any[] = [];

  for (const member of membersRes.results) {
    const existing  = existingMap.get(member.id);
    const subId     = existing?.id ?? generateId();
    const ledgerId  = generateId();
    const description = `Subscription — ${member.name} (${member.code}) — ${monthLabel}`;

    if (existing?.ledger_entry_id) {
      statements.push(
        db
          .prepare(
            "UPDATE ledger_entries SET is_deleted = 1, deleted_at = datetime('now'), deleted_by = ? WHERE id = ?"
          )
          .bind(userId, existing.ledger_entry_id)
      );
    }

    statements.push(
      db
        .prepare(`
          INSERT INTO subscriptions
            (id, member_id, month, year, status, amount, paid_date, mode, reference, notes, ledger_entry_id)
          VALUES (?, ?, ?, ?, 'paid', ?, ?, ?, NULL, NULL, ?)
          ON CONFLICT (member_id, month, year) DO UPDATE SET
            status          = 'paid',
            amount          = excluded.amount,
            paid_date       = excluded.paid_date,
            mode            = excluded.mode,
            ledger_entry_id = excluded.ledger_entry_id,
            updated_at      = datetime('now')
        `)
        .bind(subId, member.id, month, year, amount, paid_date, mode, ledgerId),

      db
        .prepare(`
          INSERT INTO ledger_entries
            (id, date, account, category, member_id, member_code, description, amount, source_type, source_id, created_by)
          VALUES (?, ?, 'general', 'Subscription', ?, ?, ?, ?, 'subscription', ?, ?)
        `)
        .bind(ledgerId, paid_date, member.id, member.code, description, amount, subId, userId),

      auditStatement(db, {
        userId,
        action:   existing ? "update" : "create",
        entity:   "subscriptions",
        entityId: subId,
        after:    { member_id: member.id, month, year, amount, paid_date, mode },
      })
    );
  }

  if (statements.length > 0) {
    await db.batch(statements);
  }
}
