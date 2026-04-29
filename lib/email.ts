import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

interface SendReceiptParams {
  to: string;
  subject: string;
  html: string;
  text: string;
}

// Non-blocking: caller must not await the result for critical path.
// Email failure never rolls back a transaction.
export async function sendReceipt(
  params: SendReceiptParams
): Promise<{ ok: boolean; error?: string }> {
  try {
    await resend.emails.send({
      from: "GSF Foundation <onboarding@resend.dev>",
      to: params.to,
      subject: params.subject,
      html: params.html,
      text: params.text,
    });
    return { ok: true };
  } catch (err) {
    console.error("Email send failed", err);
    return { ok: false, error: String(err) };
  }
}

// ─── Subscription receipt ──────────────────────────────────────────────────────

export interface SubscriptionReceiptParams {
  memberName:  string;
  memberCode:  string;
  monthLabel:  string; // e.g. "Apr 2026"
  amount:      number;
  mode:        string;
  paidDate:    string; // ISO date
  reference:   string | null;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return iso;
  }
}

function fmtINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(amount);
}

export function buildSubscriptionReceiptHtml(p: SubscriptionReceiptParams): string {
  const ref = p.reference ? `<tr><td style="color:#3f4945;padding:6px 0;font-size:13px;">Reference</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${p.reference}</td></tr>` : "";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f5;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f5;padding:32px 16px;">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#004235;padding:28px 32px;">
          <p style="margin:0;color:#a7f1da;font-size:12px;letter-spacing:1px;text-transform:uppercase;">GSF Foundation</p>
          <p style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:700;">Payment Receipt</p>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 20px;color:#191c1d;font-size:14px;">Dear <strong>${p.memberName}</strong>,<br>JazakAllah Khair for your payment.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #edeeef;">
            <tr><td style="color:#3f4945;padding:6px 0;font-size:13px;">Member Code</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${p.memberCode}</td></tr>
            <tr style="background:#f3f4f5;"><td style="color:#3f4945;padding:6px 8px;font-size:13px;">Payment For</td><td style="padding:6px 8px;font-size:13px;font-weight:600;">${p.monthLabel} Subscription</td></tr>
            <tr><td style="color:#3f4945;padding:6px 0;font-size:13px;">Amount</td><td style="padding:6px 0;font-size:13px;font-weight:700;color:#0f7b5a;">${fmtINR(p.amount)}</td></tr>
            <tr style="background:#f3f4f5;"><td style="color:#3f4945;padding:6px 8px;font-size:13px;">Payment Mode</td><td style="padding:6px 8px;font-size:13px;font-weight:600;text-transform:uppercase;">${p.mode}</td></tr>
            <tr><td style="color:#3f4945;padding:6px 0;font-size:13px;">Date</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${fmtDate(p.paidDate)}</td></tr>
            ${ref}
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:#3f4945;">This is a system-generated receipt. For queries, contact the Treasurer.</p>
        </td></tr>
        <tr><td style="background:#edeeef;padding:16px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#3f4945;">GSF Foundation · Confidential</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildSubscriptionReceiptText(p: SubscriptionReceiptParams): string {
  return `GSF Foundation — Payment Receipt

Dear ${p.memberName},

JazakAllah Khair for your payment.

Receipt Details:
────────────────────────────────
Member Code:    ${p.memberCode}
Payment for:    ${p.monthLabel} Subscription
Amount:         ${fmtINR(p.amount)}
Payment Mode:   ${p.mode.toUpperCase()}
Date:           ${fmtDate(p.paidDate)}${p.reference ? `\nReference:      ${p.reference}` : ""}
────────────────────────────────

This is a system-generated receipt.
For queries, contact the Treasurer.

GSF Foundation`;
}

export function buildSubscriptionReceiptWhatsApp(p: SubscriptionReceiptParams): string {
  const ref = p.reference ? `\nRef: ${p.reference}` : "";
  return `*GSF Foundation — Payment Receipt*\n\nMember: ${p.memberName} (Code: ${p.memberCode})\nPayment: ${p.monthLabel} Subscription\nAmount: ${fmtINR(p.amount)}\nMode: ${p.mode.toUpperCase()}${ref}\nDate: ${fmtDate(p.paidDate)}\n\n_JazakAllah Khair_`;
}

// ─── Donation receipt ──────────────────────────────────────────────────────────

export interface DonationReceiptParams {
  donorName:   string;
  memberCode:  string | null;
  type:        string; // hadiya | zakat | other
  amount:      number;
  mode:        string | null;
  date:        string;
  reference:   string | null;
}

export function buildDonationReceiptHtml(p: DonationReceiptParams): string {
  const typeLabel: Record<string, string> = { hadiya: "Hadiya", zakat: "Zakat", other: "Other Donation" };
  const ref = p.reference ? `<tr><td style="color:#3f4945;padding:6px 0;font-size:13px;">Reference</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${p.reference}</td></tr>` : "";
  const code = p.memberCode ? `<tr style="background:#f3f4f5;"><td style="color:#3f4945;padding:6px 8px;font-size:13px;">Member Code</td><td style="padding:6px 8px;font-size:13px;font-weight:600;">${p.memberCode}</td></tr>` : "";
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f5;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f5;padding:32px 16px;">
    <tr><td>
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#004235;padding:28px 32px;">
          <p style="margin:0;color:#a7f1da;font-size:12px;letter-spacing:1px;text-transform:uppercase;">GSF Foundation</p>
          <p style="margin:6px 0 0;color:#fff;font-size:20px;font-weight:700;">Donation Receipt</p>
        </td></tr>
        <tr><td style="padding:28px 32px;">
          <p style="margin:0 0 20px;color:#191c1d;font-size:14px;">Dear <strong>${p.donorName}</strong>,<br>JazakAllah Khair for your generous contribution.</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #edeeef;">
            ${code}
            <tr><td style="color:#3f4945;padding:6px 0;font-size:13px;">Donation Type</td><td style="padding:6px 0;font-size:13px;font-weight:600;">${typeLabel[p.type] ?? p.type}</td></tr>
            <tr style="background:#f3f4f5;"><td style="color:#3f4945;padding:6px 8px;font-size:13px;">Amount</td><td style="padding:6px 8px;font-size:13px;font-weight:700;color:#0f7b5a;">${fmtINR(p.amount)}</td></tr>
            ${p.mode ? `<tr><td style="color:#3f4945;padding:6px 0;font-size:13px;">Mode</td><td style="padding:6px 0;font-size:13px;font-weight:600;text-transform:uppercase;">${p.mode}</td></tr>` : ""}
            <tr${p.mode ? ' style="background:#f3f4f5;"' : ""}><td style="color:#3f4945;padding:6px 8px;font-size:13px;">Date</td><td style="padding:6px 8px;font-size:13px;font-weight:600;">${fmtDate(p.date)}</td></tr>
            ${ref}
          </table>
          <p style="margin:24px 0 0;font-size:12px;color:#3f4945;">This is a system-generated receipt. For queries, contact the Treasurer.</p>
        </td></tr>
        <tr><td style="background:#edeeef;padding:16px 32px;text-align:center;">
          <p style="margin:0;font-size:11px;color:#3f4945;">GSF Foundation · Confidential</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildDonationReceiptText(p: DonationReceiptParams): string {
  const typeLabel: Record<string, string> = { hadiya: "Hadiya", zakat: "Zakat", other: "Other Donation" };
  return `GSF Foundation — Donation Receipt

Dear ${p.donorName},

JazakAllah Khair for your generous contribution.

Receipt Details:
────────────────────────────────${p.memberCode ? `\nMember Code:    ${p.memberCode}` : ""}
Donation Type:  ${typeLabel[p.type] ?? p.type}
Amount:         ${fmtINR(p.amount)}${p.mode ? `\nMode:           ${p.mode.toUpperCase()}` : ""}
Date:           ${fmtDate(p.date)}${p.reference ? `\nReference:      ${p.reference}` : ""}
────────────────────────────────

This is a system-generated receipt.
For queries, contact the Treasurer.

GSF Foundation`;
}

export function buildDonationReceiptWhatsApp(p: DonationReceiptParams): string {
  const typeLabel: Record<string, string> = { hadiya: "Hadiya", zakat: "Zakat", other: "Donation" };
  const ref  = p.reference ? `\nRef: ${p.reference}` : "";
  const mode = p.mode      ? ` · ${p.mode.toUpperCase()}` : "";
  return `*GSF Foundation — Donation Receipt*\n\nDonor: ${p.donorName}${p.memberCode ? ` (Code: ${p.memberCode})` : ""}\nType: ${typeLabel[p.type] ?? p.type}\nAmount: ${fmtINR(p.amount)}${mode}${ref}\nDate: ${fmtDate(p.date)}\n\n_JazakAllah Khair_`;
}

// ─── Backup confirmation email ─────────────────────────────────────────────────

export interface BackupConfirmationParams {
  to:          string;
  date:        string;
  fileCount:   number;
  rowCounts:   Record<string, number>;
  driveUrl?:   string;
}

export function buildBackupConfirmationHtml(p: BackupConfirmationParams): string {
  const rows = Object.entries(p.rowCounts)
    .map(([table, count]) => `<tr><td style="padding:4px 8px;font-size:13px;color:#3f4945;">${table}</td><td style="padding:4px 8px;font-size:13px;font-weight:600;">${count.toLocaleString("en-IN")}</td></tr>`)
    .join("");
  const driveLink = p.driveUrl
    ? `<p style="margin:16px 0 0;"><a href="${p.driveUrl}" style="color:#004235;font-weight:600;">View in Google Drive →</a></p>`
    : "";
  return `<!DOCTYPE html><html><body style="font-family:Inter,Arial,sans-serif;background:#f3f4f5;margin:0;padding:32px 16px;">
<table style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;">
<tr><td style="background:#004235;padding:24px 32px;">
  <p style="margin:0;color:#a7f1da;font-size:12px;letter-spacing:1px;text-transform:uppercase;">GSF Foundation</p>
  <p style="margin:6px 0 0;color:#fff;font-size:18px;font-weight:700;">Weekly Backup Complete ✓</p>
</td></tr>
<tr><td style="padding:24px 32px;">
  <p style="margin:0 0 16px;color:#191c1d;font-size:14px;">Your weekly backup completed successfully on <strong>${p.date}</strong>. ${p.fileCount} file(s) were uploaded to Google Drive.</p>
  <table style="width:100%;border-top:1px solid #edeeef;">${rows}</table>
  ${driveLink}
  <p style="margin:20px 0 0;font-size:12px;color:#3f4945;">Backups older than 30 weeks are automatically deleted. This is an automated message.</p>
</td></tr>
</table>
</body></html>`;
}

export function buildBackupConfirmationText(p: BackupConfirmationParams): string {
  const rows = Object.entries(p.rowCounts)
    .map(([table, count]) => `  ${table}: ${count.toLocaleString("en-IN")} rows`)
    .join("\n");
  return `GSF Foundation — Weekly Backup Complete

Date: ${p.date}
Files uploaded: ${p.fileCount}

Row counts:
${rows}
${p.driveUrl ? `\nView in Drive: ${p.driveUrl}` : ""}

This is an automated message. Backups older than 30 weeks are automatically deleted.

GSF Foundation`;
}
