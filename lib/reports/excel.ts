import * as XLSX from "xlsx";
import type { ReportData } from "@/lib/queries/reports";

function fmtDate(iso: unknown): string {
  try {
    return new Date(String(iso)).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  } catch {
    return String(iso ?? "");
  }
}

function fmtINR(amount: unknown): string {
  const n = Number(amount ?? 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency", currency: "INR", maximumFractionDigits: 0,
  }).format(n);
}

function s(v: unknown): string {
  const str = String(v ?? "");
  // Neutralize spreadsheet formula injection.
  return /^[=+\-@\t\r]/.test(str) ? `'${str}` : str;
}

function n(v: unknown): number {
  return Number(v ?? 0);
}

export function generateExcel(data: ReportData, title: string): Uint8Array {
  const wb = XLSX.utils.book_new();
  const { summary, filters } = data;

  // ── Summary ──────────────────────────────────────────────────────────────
  const summaryRows = [
    [`GSF Foundation — ${title}`],
    [`Generated on`, new Date().toLocaleDateString("en-IN")],
    [`Period`, `${filters.from}  →  ${filters.to}`],
    [],
    [`ACCOUNT BALANCES (ALL-TIME)`],
    [`General Account`, fmtINR(summary.generalBalance)],
    [`Zakat Account`,   fmtINR(summary.zakatBalance)],
    [`Active Members`,  String(summary.memberCount)],
    [],
    [`PERIOD ACTIVITY`],
    [`Subscriptions collected`, fmtINR(summary.totalSubscriptionsCollected)],
    [`Donations received`,      fmtINR(summary.totalDonations)],
    [`Medical disbursed`,       fmtINR(summary.totalMedicalDisbursed)],
    [`Scholarship paid (Zakat)`, fmtINR(summary.totalScholarshipPaid)],
  ];
  const summaryWS = XLSX.utils.aoa_to_sheet(summaryRows);
  summaryWS["!cols"] = [{ wch: 30 }, { wch: 22 }];
  XLSX.utils.book_append_sheet(wb, summaryWS, "Summary");

  // ── General Ledger ────────────────────────────────────────────────────────
  const genRows: unknown[][] = [
    ["Date", "Category", "Sub-Category", "Member Code", "Description", "Amount (₹)"],
    ...data.generalEntries.map((e) => [
      fmtDate(e.date),
      s(e.category),
      s(e.sub_category),
      s(e.member_code),
      s(e.description),
      n(e.amount),
    ]),
  ];
  const genWS = XLSX.utils.aoa_to_sheet(genRows);
  genWS["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 16 }, { wch: 12 }, { wch: 40 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, genWS, "General Ledger");

  // ── Zakat Ledger ──────────────────────────────────────────────────────────
  const zakRows: unknown[][] = [
    ["Date", "Category", "Member Code", "Description", "Amount (₹)"],
    ...data.zakatEntries.map((e) => [
      fmtDate(e.date),
      s(e.category),
      s(e.member_code),
      s(e.description),
      n(e.amount),
    ]),
  ];
  const zakWS = XLSX.utils.aoa_to_sheet(zakRows);
  zakWS["!cols"] = [{ wch: 14 }, { wch: 18 }, { wch: 12 }, { wch: 40 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(wb, zakWS, "Zakat Ledger");

  // ── Subscriptions ─────────────────────────────────────────────────────────
  const subRows: unknown[][] = [
    ["Member Name", "Code", "Month", "Year", "Amount (₹)", "Paid Date", "Mode", "Reference"],
    ...data.subscriptions.map((s_) => [
      s(s_.member_name),
      s(s_.member_code_display ?? s_.member_code),
      n(s_.month),
      n(s_.year),
      n(s_.amount),
      fmtDate(s_.paid_date),
      s(s_.mode),
      s(s_.reference),
    ]),
  ];
  const subWS = XLSX.utils.aoa_to_sheet(subRows);
  subWS["!cols"] = [
    { wch: 25 }, { wch: 10 }, { wch: 8 }, { wch: 8 },
    { wch: 12 }, { wch: 14 }, { wch: 10 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, subWS, "Subscriptions");

  // ── Donations ─────────────────────────────────────────────────────────────
  const donRows: unknown[][] = [
    ["Date", "Donor", "Type", "Category", "Amount (₹)", "Mode", "Reference"],
    ...data.donations.map((d) => [
      fmtDate(d.date),
      s(d.member_name ?? d.donor_name),
      s(d.type),
      s(d.category),
      n(d.amount),
      s(d.mode),
      s(d.reference),
    ]),
  ];
  const donWS = XLSX.utils.aoa_to_sheet(donRows);
  donWS["!cols"] = [
    { wch: 14 }, { wch: 25 }, { wch: 10 }, { wch: 14 },
    { wch: 12 }, { wch: 10 }, { wch: 18 },
  ];
  XLSX.utils.book_append_sheet(wb, donWS, "Donations");

  // ── Medical Cases ─────────────────────────────────────────────────────────
  const medRows: unknown[][] = [
    ["Case Ref", "Beneficiary", "Status", "Requested (₹)", "Paid (₹)", "External (₹)", "Opened"],
    ...data.medicalCases.map((c) => [
      s(c.case_ref),
      c.mask_name ? "XXXX (masked)" : s(c.beneficiary_name),
      s(c.status),
      n(c.amount_requested),
      n(c.amount_paid),
      n(c.amount_external),
      fmtDate(c.opened_at),
    ]),
  ];
  const medWS = XLSX.utils.aoa_to_sheet(medRows);
  medWS["!cols"] = [
    { wch: 18 }, { wch: 25 }, { wch: 10 },
    { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(wb, medWS, "Medical");

  // ── Scholarship Payouts ───────────────────────────────────────────────────
  const scholRows: unknown[][] = [
    ["Date", "Beneficiary", "Academic Year", "Eligibility Notes", "Amount (₹)"],
    ...data.scholarshipPayouts.map((p) => [
      fmtDate(p.paid_on),
      s(p.member_name ?? p.beneficiary_name),
      s(p.academic_year),
      s(p.eligibility_notes),
      n(p.amount),
    ]),
  ];
  const scholWS = XLSX.utils.aoa_to_sheet(scholRows);
  scholWS["!cols"] = [{ wch: 14 }, { wch: 25 }, { wch: 14 }, { wch: 40 }, { wch: 12 }];
  XLSX.utils.book_append_sheet(wb, scholWS, "Scholarship");

  // Write — use "array" for edge-runtime compatibility, wrap in Uint8Array
  const arr = XLSX.write(wb, { type: "array", bookType: "xlsx" }) as number[];
  return new Uint8Array(arr);
}
