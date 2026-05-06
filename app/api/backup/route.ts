import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { uploadToDrive, isDriveConfigured, listDriveFiles, deleteDriveFile } from "@/lib/drive";
import { sendReceipt, buildBackupConfirmationHtml, buildBackupConfirmationText } from "@/lib/email";
import { getSetting } from "@/lib/queries/settings";

const BACKUP_PREFIX = "gsf-backup-";
const THIRTY_WEEKS_MS = 30 * 7 * 24 * 60 * 60 * 1000;

// ─── CSV helpers ──────────────────────────────────────────────────────────────

function escapeCSV(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  // Neutralize spreadsheet formula injection (=, +, -, @, tab, CR)
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  if (safe.includes(",") || safe.includes('"') || safe.includes("\n")) {
    return `"${safe.replace(/"/g, '""')}"`;
  }
  return safe;
}

function rowsToCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return "";
  const headers = Object.keys(rows[0]);
  const lines   = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => escapeCSV(row[h])).join(","));
  }
  return lines.join("\n");
}

// ─── Table export ─────────────────────────────────────────────────────────────

const TABLES = [
  "members",
  "subscriptions",
  "ledger_entries",
  "donations",
  "medical_cases",
  "scholarship_payouts",
  "scholarship_announcements",
  "settings",
  "audit_log",
] as const;

async function exportTable(
  db: import("@cloudflare/workers-types").D1Database,
  table: string
): Promise<{ csv: string; count: number }> {
  // audit_log can be large — export last 5000 rows only
  const limit  = table === "audit_log" ? "LIMIT 5000" : "";
  const order  = table === "audit_log" ? "ORDER BY created_at DESC" : "";
  const { results } = await db
    .prepare(`SELECT * FROM ${table} ${order} ${limit}`)
    .all<Record<string, unknown>>();
  return { csv: rowsToCSV(results), count: results.length };
}

// ─── Drive cleanup ────────────────────────────────────────────────────────────

async function pruneOldBackups(
  env: { GOOGLE_DRIVE_SERVICE_ACCOUNT_JSON: string; GOOGLE_DRIVE_FOLDER_ID: string }
): Promise<number> {
  const files = await listDriveFiles(BACKUP_PREFIX, env);
  const cutoff = Date.now() - THIRTY_WEEKS_MS;
  let deleted = 0;
  for (const file of files) {
    if (new Date(file.createdTime).getTime() < cutoff) {
      await deleteDriveFile(file.id, env);
      deleted++;
    }
  }
  return deleted;
}

// ─── Main handler ─────────────────────────────────────────────────────────────

async function runBackup(req: Request, isManual: boolean): Promise<Response> {
  const { env } = getCloudflareContext();
  const db = env.DB;

  const dateStr  = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const rowCounts: Record<string, number> = {};
  const uploads: string[] = [];
  let firstUrl: string | undefined;

  for (const table of TABLES) {
    try {
      const { csv, count } = await exportTable(db, table);
      rowCounts[table] = count;
      if (!csv) continue;

      const filename = `${BACKUP_PREFIX}${dateStr}_${table}.csv`;
      const content  = new TextEncoder().encode(csv);

      if (isDriveConfigured(env)) {
        const url = await uploadToDrive(content, filename, "text/csv", env);
        if (!firstUrl) firstUrl = url;
        uploads.push(filename);
      }
    } catch (err) {
      console.error(`Backup: failed to export ${table}:`, err);
    }
  }

  // Prune old backups
  let pruned = 0;
  if (isDriveConfigured(env)) {
    try { pruned = await pruneOldBackups(env); } catch { /* non-fatal */ }
  }

  // Email Treasurer
  const treasurerEmail = await getSetting(db, "treasurer_email");
  const resendKey      = process.env.RESEND_API_KEY;

  if (treasurerEmail && resendKey) {
    const params = {
      to:        treasurerEmail,
      date:      new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }),
      fileCount: uploads.length,
      rowCounts,
      driveUrl:  firstUrl,
    };
    void sendReceipt({
      to:      treasurerEmail,
      subject: `GSF Trust — Weekly Backup Complete (${dateStr})`,
      html:    buildBackupConfirmationHtml(params),
      text:    buildBackupConfirmationText(params),
    });
  }

  const result = {
    ok:       true,
    date:     dateStr,
    files:    uploads.length,
    rows:     rowCounts,
    pruned,
    driveUrl: firstUrl,
    manual:   isManual,
  };

  console.info("Backup complete:", result);
  return Response.json(result);
}

// Cron-triggered (GET from Cloudflare scheduler)
// BACKUP_SECRET must be configured — if unset the endpoint is disabled to prevent
// any authenticated session from triggering it.
export async function GET(req: Request): Promise<Response> {
  const secret = process.env.BACKUP_SECRET;
  if (!secret) {
    return Response.json({ error: "Backup secret not configured" }, { status: 503 });
  }
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return runBackup(req, false);
}

export async function POST(req: Request): Promise<Response> {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    const user = await getUserFromRequest(req, db);
    if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdmin(user.role)) return Response.json({ error: "Forbidden" }, { status: 403 });

    return runBackup(req, true);
  } catch (err) {
    console.error("POST /api/backup failed:", err);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
