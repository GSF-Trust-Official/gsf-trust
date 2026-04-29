import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  renderToBuffer,
} from "@react-pdf/renderer";
import type { ReportData } from "@/lib/queries/reports";

const C = {
  primary:  "#004235",
  surface:  "#edeeef",
  muted:    "#3f4945",
  success:  "#0f7b5a",
  error:    "#ba1a1a",
  border:   "#bec9c4",
  text:     "#191c1d",
};

const styles = StyleSheet.create({
  page:         { padding: 40, fontSize: 9, color: C.text, fontFamily: "Helvetica" },
  header:       { marginBottom: 18 },
  title:        { fontSize: 16, fontFamily: "Helvetica-Bold", color: C.primary, marginBottom: 2 },
  subtitle:     { fontSize: 9, color: C.muted },
  sectionTitle: {
    fontSize: 10, fontFamily: "Helvetica-Bold", color: C.primary,
    borderBottomWidth: 1, borderBottomColor: C.border,
    paddingBottom: 3, marginBottom: 7, marginTop: 14,
  },
  kpiGrid:      { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  kpiBox:       { backgroundColor: C.surface, padding: 8, minWidth: 110 },
  kpiLabel:     { fontSize: 7, color: C.muted, textTransform: "uppercase", marginBottom: 2 },
  kpiValue:     { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.text },
  kpiValuePos:  { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.success },
  kpiValueNeg:  { fontSize: 13, fontFamily: "Helvetica-Bold", color: C.error },
  tableHead:    { flexDirection: "row", backgroundColor: C.surface, padding: "4 6", marginBottom: 1 },
  tableRow:     { flexDirection: "row", padding: "3 6", borderBottomWidth: 0.5, borderBottomColor: C.border },
  thText:       { fontSize: 7, fontFamily: "Helvetica-Bold", color: C.muted },
  tdText:       { fontSize: 7, color: C.text },
  tdPos:        { fontSize: 7, color: C.success },
  tdNeg:        { fontSize: 7, color: C.error },
  footer:       {
    position: "absolute", bottom: 28, left: 40, right: 40,
    textAlign: "center", fontSize: 7, color: C.muted,
    borderTopWidth: 0.5, borderTopColor: C.border, paddingTop: 6,
  },
  more:         { fontSize: 7, color: C.muted, marginTop: 4 },
  note:         { fontSize: 7, color: C.muted, marginTop: 3 },
});

function fmtDate(iso: unknown): string {
  try { return new Date(String(iso)).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }); }
  catch { return String(iso ?? ""); }
}

function fmtINR(amount: unknown): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 })
    .format(Math.abs(Number(amount ?? 0)));
}

function s(v: unknown): string { return String(v ?? ""); }
function n(v: unknown): number { return Number(v ?? 0); }

// ─── Summary page ─────────────────────────────────────────────────────────────
function SummaryPage({ data, title }: { data: ReportData; title: string }) {
  const { summary, filters } = data;
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>GSF Foundation</Text>
        <Text style={[styles.title, { fontSize: 12, marginTop: 2 }]}>{title}</Text>
        <Text style={styles.subtitle}>
          Period: {filters.from} → {filters.to} · Generated {new Date().toLocaleDateString("en-IN")}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>Account Balances (All-Time)</Text>
      <View style={styles.kpiGrid}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>General Account</Text>
          <Text style={[styles.kpiValue, { color: C.primary }]}>{fmtINR(summary.generalBalance)}</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Zakat Account</Text>
          <Text style={[styles.kpiValue, { color: C.primary }]}>{fmtINR(summary.zakatBalance)}</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Active Members</Text>
          <Text style={styles.kpiValue}>{summary.memberCount}</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Period Activity</Text>
      <View style={styles.kpiGrid}>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Subscriptions Collected</Text>
          <Text style={styles.kpiValuePos}>+ {fmtINR(summary.totalSubscriptionsCollected)}</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Donations Received</Text>
          <Text style={styles.kpiValuePos}>+ {fmtINR(summary.totalDonations)}</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Medical Disbursed</Text>
          <Text style={styles.kpiValueNeg}>− {fmtINR(summary.totalMedicalDisbursed)}</Text>
        </View>
        <View style={styles.kpiBox}>
          <Text style={styles.kpiLabel}>Scholarship Paid (Zakat)</Text>
          <Text style={styles.kpiValueNeg}>− {fmtINR(summary.totalScholarshipPaid)}</Text>
        </View>
      </View>

      {/* General ledger entries (first 25) */}
      {data.generalEntries.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>
            General Ledger — {data.generalEntries.length} entries in period
          </Text>
          <View style={styles.tableHead}>
            <Text style={[styles.thText, { width: "14%" }]}>Date</Text>
            <Text style={[styles.thText, { width: "18%" }]}>Category</Text>
            <Text style={[styles.thText, { flex: 1 }]}>Description</Text>
            <Text style={[styles.thText, { width: "16%", textAlign: "right" }]}>Amount</Text>
          </View>
          {(data.generalEntries as Array<Record<string, unknown>>).slice(0, 25).map((e, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={[styles.tdText, { width: "14%" }]}>{fmtDate(e.date)}</Text>
              <Text style={[styles.tdText, { width: "18%" }]}>{s(e.category)}</Text>
              <Text style={[styles.tdText, { flex: 1 }]}>{s(e.description)}</Text>
              <Text style={[n(e.amount) >= 0 ? styles.tdPos : styles.tdNeg, { width: "16%", textAlign: "right" }]}>
                {n(e.amount) >= 0 ? "+" : "−"} {fmtINR(e.amount)}
              </Text>
            </View>
          ))}
          {data.generalEntries.length > 25 && (
            <Text style={styles.more}>+ {data.generalEntries.length - 25} more entries — see Excel export for the full list.</Text>
          )}
        </>
      )}

      <Text style={styles.footer}>
        System-generated report · GSF Foundation · Confidential · Do not distribute
      </Text>
    </Page>
  );
}

// ─── Scholarship page (only if data exists) ───────────────────────────────────
function ScholarshipPage({ data, filters }: { data: ReportData; filters: { from: string; to: string } }) {
  if (data.scholarshipPayouts.length === 0) return null;
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Scholarship Payouts (Zakat)</Text>
        <Text style={styles.subtitle}>{filters.from} → {filters.to}</Text>
      </View>
      <View style={styles.tableHead}>
        <Text style={[styles.thText, { width: "16%" }]}>Date</Text>
        <Text style={[styles.thText, { width: "26%" }]}>Beneficiary</Text>
        <Text style={[styles.thText, { width: "18%" }]}>Academic Year</Text>
        <Text style={[styles.thText, { flex: 1 }]}>Eligibility Notes</Text>
        <Text style={[styles.thText, { width: "16%", textAlign: "right" }]}>Amount</Text>
      </View>
      {(data.scholarshipPayouts as Array<Record<string, unknown>>).map((p, i) => (
        <View key={i} style={styles.tableRow}>
          <Text style={[styles.tdText, { width: "16%" }]}>{fmtDate(p.paid_on)}</Text>
          <Text style={[styles.tdText, { width: "26%" }]}>{s(p.member_name ?? p.beneficiary_name)}</Text>
          <Text style={[styles.tdText, { width: "18%" }]}>{s(p.academic_year)}</Text>
          <Text style={[styles.tdText, { flex: 1 }]}>{s(p.eligibility_notes)}</Text>
          <Text style={[styles.tdNeg, { width: "16%", textAlign: "right" }]}>− {fmtINR(p.amount)}</Text>
        </View>
      ))}
      <Text style={[styles.note, { marginTop: 10 }]}>
        Total: − {fmtINR((data.scholarshipPayouts as Array<Record<string, unknown>>).reduce((sum, p) => sum + n(p.amount), 0))}
      </Text>
      <Text style={styles.footer}>
        System-generated report · GSF Foundation · Confidential
      </Text>
    </Page>
  );
}

// ─── Medical page (only if data exists) ──────────────────────────────────────
function MedicalPage({ data, filters }: { data: ReportData; filters: { from: string; to: string } }) {
  if (data.medicalCases.length === 0) return null;
  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Medical Assistance Cases</Text>
        <Text style={styles.subtitle}>{filters.from} → {filters.to}</Text>
      </View>
      <View style={styles.tableHead}>
        <Text style={[styles.thText, { width: "18%" }]}>Case Ref</Text>
        <Text style={[styles.thText, { width: "28%" }]}>Beneficiary</Text>
        <Text style={[styles.thText, { width: "12%" }]}>Status</Text>
        <Text style={[styles.thText, { width: "14%", textAlign: "right" }]}>Requested</Text>
        <Text style={[styles.thText, { width: "14%", textAlign: "right" }]}>Paid</Text>
        <Text style={[styles.thText, { width: "14%", textAlign: "right" }]}>External</Text>
      </View>
      {(data.medicalCases as Array<Record<string, unknown>>).map((c, i) => (
        <View key={i} style={styles.tableRow}>
          <Text style={[styles.tdText, { width: "18%" }]}>{s(c.case_ref)}</Text>
          <Text style={[styles.tdText, { width: "28%" }]}>
            {c.mask_name ? "XXXX (masked)" : s(c.beneficiary_name)}
          </Text>
          <Text style={[styles.tdText, { width: "12%" }]}>{s(c.status)}</Text>
          <Text style={[styles.tdText, { width: "14%", textAlign: "right" }]}>{fmtINR(c.amount_requested)}</Text>
          <Text style={[styles.tdNeg,  { width: "14%", textAlign: "right" }]}>− {fmtINR(c.amount_paid)}</Text>
          <Text style={[styles.tdText, { width: "14%", textAlign: "right" }]}>{fmtINR(c.amount_external)}</Text>
        </View>
      ))}
      <Text style={styles.footer}>
        System-generated report · GSF Foundation · Confidential
      </Text>
    </Page>
  );
}

// ─── Root document ────────────────────────────────────────────────────────────
function ReportDocument({ data, title }: { data: ReportData; title: string }) {
  return (
    <Document title={`GSF Foundation — ${title}`} author="GSF Foundation">
      <SummaryPage data={data} title={title} />
      <ScholarshipPage data={data} filters={data.filters} />
      <MedicalPage data={data} filters={data.filters} />
    </Document>
  );
}

export async function generatePDF(data: ReportData, title: string): Promise<Uint8Array> {
  const buf = await renderToBuffer(<ReportDocument data={data} title={title} />);
  return new Uint8Array(buf as unknown as ArrayBuffer);
}
