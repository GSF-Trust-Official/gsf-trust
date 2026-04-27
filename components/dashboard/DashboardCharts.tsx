"use client";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import type {
  CollectionRateRow,
  DonationBreakdownRow,
  ExpenseAllocationRow,
} from "@/lib/queries/dashboard";

const DONATION_COLORS: Record<string, string> = {
  hadiya: "#004235",
  zakat:  "#005c8a",
  other:  "#8bd5bf",
};
const EXPENSE_COLORS = ["#0f7b5a", "#005c8a", "#8b6a00", "#ba1a1a", "#a7f1da", "#3f4945"];

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function chartLabel(month: number, year: number) {
  return `${MONTH_LABELS[month - 1]} '${String(year).slice(-2)}`;
}

function formatRupee(v: unknown) {
  if (typeof v !== "number") return "";
  return `₹${new Intl.NumberFormat("en-IN").format(v)}`;
}

// ─── Donation Breakdown ───────────────────────────────────────────────────────

interface DonationChartProps {
  data: DonationBreakdownRow[];
}

function DonationBreakdownChart({ data }: DonationChartProps) {
  const chartData = data.map((d) => ({
    name: d.type.charAt(0).toUpperCase() + d.type.slice(1),
    value: d.total,
    color: DONATION_COLORS[d.type] ?? "#bec9c4",
  }));

  return (
    <div className="bg-white rounded-xl border border-outline-variant p-4 md:p-6">
      <h3 className="text-sm font-medium text-on-surface-variant uppercase tracking-widest mb-4">
        Donation Breakdown
      </h3>
      {chartData.length === 0 ? (
        <p className="text-sm text-on-surface-variant text-center py-10">No donations recorded yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={75}
              strokeWidth={2}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatRupee(v)} />
            <Legend iconType="circle" iconSize={10} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Expense Allocation ───────────────────────────────────────────────────────

interface ExpenseChartProps {
  data: ExpenseAllocationRow[];
}

function ExpenseAllocationChart({ data }: ExpenseChartProps) {
  const chartData = data.map((d, i) => ({
    name: d.category,
    value: d.total,
    color: EXPENSE_COLORS[i % EXPENSE_COLORS.length],
  }));

  return (
    <div className="bg-white rounded-xl border border-outline-variant p-4 md:p-6">
      <h3 className="text-sm font-medium text-on-surface-variant uppercase tracking-widest mb-4">
        Expense Allocation
      </h3>
      {chartData.length === 0 ? (
        <p className="text-sm text-on-surface-variant text-center py-10">No expenses recorded yet.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={75}
              strokeWidth={2}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip formatter={(v) => formatRupee(v)} />
            <Legend iconType="circle" iconSize={10} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Collection Rate ─────────────────────────────────────────────────────────

interface CollectionChartProps {
  data: CollectionRateRow[];
}

function CollectionRateChart({ data }: CollectionChartProps) {
  const chartData = data.map((r) => ({
    label: chartLabel(r.month, r.year),
    paid: r.paid,
    due: r.due,
  }));

  return (
    <div className="bg-white rounded-xl border border-outline-variant p-4 md:p-6">
      <h3 className="text-sm font-medium text-on-surface-variant uppercase tracking-widest mb-4">
        Collection Rate — Last 12 Months
      </h3>
      {chartData.length === 0 ? (
        <p className="text-sm text-on-surface-variant text-center py-10">No subscription data in the last 12 months.</p>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chartData} barCategoryGap="30%">
            <CartesianGrid strokeDasharray="3 3" stroke="#edeeef" />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "#3f4945" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 11, fill: "#3f4945" }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip
              contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #bec9c4" }}
            />
            <Legend iconType="circle" iconSize={10} />
            <Bar dataKey="paid" name="Paid" fill="#0f7b5a" radius={[3, 3, 0, 0]} />
            <Bar dataKey="due"  name="Due"  fill="#ffdea5" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}

// ─── Combined export ──────────────────────────────────────────────────────────

export interface DashboardChartsProps {
  donationBreakdown: DonationBreakdownRow[];
  expenseAllocation: ExpenseAllocationRow[];
  collectionRate:    CollectionRateRow[];
}

export function DashboardCharts({
  donationBreakdown,
  expenseAllocation,
  collectionRate,
}: DashboardChartsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <DonationBreakdownChart data={donationBreakdown} />
      <ExpenseAllocationChart data={expenseAllocation} />
      <div className="md:col-span-2 xl:col-span-1">
        <CollectionRateChart data={collectionRate} />
      </div>
    </div>
  );
}
