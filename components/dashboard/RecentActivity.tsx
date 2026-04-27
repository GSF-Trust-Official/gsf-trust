import { formatINR, formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { RecentActivityRow } from "@/lib/queries/dashboard";

interface RecentActivityProps {
  rows: RecentActivityRow[];
}

const ACCOUNT_BADGE: Record<string, string> = {
  general:  "bg-surface-container text-on-surface-variant",
  zakat:    "bg-error-container text-error",
  interest: "bg-warning-container text-warning",
};

export function RecentActivity({ rows }: RecentActivityProps) {
  if (rows.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-outline-variant p-6 text-center text-sm text-on-surface-variant">
        No ledger entries yet. Start by logging a subscription or donation.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
      {/* Desktop table */}
      <table className="hidden md:table w-full text-sm">
        <thead>
          <tr className="border-b border-outline-variant bg-surface-low">
            <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-widest text-on-surface-variant">Date</th>
            <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-widest text-on-surface-variant">Account</th>
            <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-widest text-on-surface-variant">Category</th>
            <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-widest text-on-surface-variant">Description</th>
            <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-widest text-on-surface-variant">Amount</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={row.id}
              className={cn(
                "border-b border-outline-variant last:border-0",
                i % 2 === 1 && "bg-surface-low/40"
              )}
            >
              <td className="px-4 py-3 text-on-surface-variant whitespace-nowrap">
                {formatDate(row.date)}
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize",
                  ACCOUNT_BADGE[row.account] ?? "bg-surface-container text-on-surface-variant"
                )}>
                  {row.account}
                </span>
              </td>
              <td className="px-4 py-3 text-on-surface capitalize">{row.category}</td>
              <td className="px-4 py-3 text-on-surface-variant max-w-[220px] truncate">{row.description}</td>
              <td className={cn(
                "px-4 py-3 text-right font-mono font-medium tabular-nums",
                row.amount >= 0 ? "text-success" : "text-error"
              )}>
                {row.amount >= 0 ? "+" : "−"}{formatINR(Math.abs(row.amount))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Mobile cards */}
      <div className="md:hidden divide-y divide-outline-variant">
        {rows.map((row) => (
          <div key={row.id} className="px-4 py-3 flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-on-surface truncate">{row.description}</p>
              <p className="text-xs text-on-surface-variant mt-0.5">
                {formatDate(row.date)} &middot; <span className="capitalize">{row.account}</span> &middot; {row.category}
              </p>
            </div>
            <p className={cn(
              "text-sm font-mono font-semibold tabular-nums shrink-0",
              row.amount >= 0 ? "text-success" : "text-error"
            )}>
              {row.amount >= 0 ? "+" : "−"}{formatINR(Math.abs(row.amount))}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
