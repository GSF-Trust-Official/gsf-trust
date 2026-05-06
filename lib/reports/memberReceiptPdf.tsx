import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import type { Subscription, Member } from "@/types";

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtINR(n: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

const styles = StyleSheet.create({
  page:    { fontFamily: "Helvetica", padding: 40, fontSize: 11, color: "#191c1d" },
  header:  { borderBottom: "2px solid #004235", paddingBottom: 12, marginBottom: 20 },
  title:   { fontSize: 18, fontWeight: "bold", color: "#004235" },
  sub:     { fontSize: 10, color: "#3f4945", marginTop: 4 },
  row:     { flexDirection: "row", justifyContent: "space-between", marginBottom: 8 },
  label:   { color: "#3f4945", width: "45%" },
  value:   { fontWeight: "bold", width: "55%", textAlign: "right" },
  divider: { borderTop: "1px solid #bec9c4", marginVertical: 12 },
  stamp:   { fontSize: 14, fontWeight: "bold", color: "#0f7b5a", textAlign: "center", marginTop: 16 },
  footer:  { fontSize: 9, color: "#3f4945", textAlign: "center", marginTop: 32 },
});

interface ReceiptProps {
  sub: Subscription;
  member: Pick<Member, "name" | "code">;
  receiptNo: string;
  monthLabel: string;
}

export function MemberReceiptDocument({ sub, member, receiptNo, monthLabel }: ReceiptProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>GSF Trust</Text>
          <Text style={styles.sub}>PAYMENT RECEIPT</Text>
        </View>

        <View style={styles.row}>
          <Text style={styles.label}>Receipt No</Text>
          <Text style={styles.value}>{receiptNo}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Member Name</Text>
          <Text style={styles.value}>{member.name}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Member Code</Text>
          <Text style={styles.value}>{member.code}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Payment For</Text>
          <Text style={styles.value}>{monthLabel} Subscription</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Amount Paid</Text>
          <Text style={styles.value}>{fmtINR(sub.amount ?? 300)}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Payment Mode</Text>
          <Text style={styles.value}>{(sub.mode ?? "—").toUpperCase()}</Text>
        </View>
        {sub.reference ? (
          <View style={styles.row}>
            <Text style={styles.label}>Reference</Text>
            <Text style={styles.value}>{sub.reference}</Text>
          </View>
        ) : null}
        <View style={styles.row}>
          <Text style={styles.label}>Date of Payment</Text>
          <Text style={styles.value}>{sub.paid_date ? fmtDate(sub.paid_date) : "—"}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.stamp}>✓ PAID</Text>

        <Text style={styles.footer}>
          System-generated receipt · GSF Trust · {new Date().getFullYear()}
        </Text>
      </Page>
    </Document>
  );
}

export function buildReceiptFilename(sub: Subscription, memberCode: string): string {
  return `gsf-receipt-${sub.year}-${String(sub.month).padStart(2, "0")}-${memberCode}.pdf`;
}

export function buildReceiptNo(sub: Subscription, memberCode: string): string {
  return `RCP-${sub.year}-${String(sub.month).padStart(2, "0")}-${memberCode}`;
}

export function buildMonthLabel(sub: Subscription): string {
  return `${MONTHS[(sub.month ?? 1) - 1]} ${sub.year}`;
}
