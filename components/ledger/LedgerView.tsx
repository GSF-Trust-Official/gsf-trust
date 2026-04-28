"use client";

import { useState, useCallback, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Trash2, ChevronLeft, ChevronRight, Filter, TrendingUp, TrendingDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { formatINR, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EditEntryModal } from "@/components/ledger/EditEntryModal";
import type { LedgerRow, LedgerAccount } from "@/lib/queries/ledger";
import type { UserRole } from "@/types";

interface LedgerViewProps {
  account:      LedgerAccount;
  entries:      LedgerRow[];
  total:        number;
  balance:      number;
  page:         number;
  pageSize:     number;
  role:         UserRole;
  categories:   readonly string[];
  badge?:       React.ReactNode;
  extraActions?: React.ReactNode;   // "Log Expense" or interest buttons
  // filter state (controlled by server-component via URL params)
  dateFrom?:   string;
  dateTo?:     string;
  category?:   string;
  memberCode?: string;
  direction?:  "in" | "out" | "";
}

function AmountCell({ amount }: { amount: number }) {
  const positive = amount >= 0;
  return (
    <span className={cn("font-mono text-sm font-medium tabular-nums", positive ? "text-success" : "text-error")}>
      {positive ? "+" : "−"}{formatINR(Math.abs(amount))}
    </span>
  );
}

function BalanceCell({ balance }: { balance: number }) {
  return (
    <span className="font-mono text-sm tabular-nums text-on-surface-variant">
      {formatINR(balance)}
    </span>
  );
}

function StatusChip({ amount }: { amount: number }) {
  return amount >= 0 ? (
    <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-success-container text-success font-medium">
      <TrendingUp className="size-3" /> In
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full bg-error-container text-error font-medium">
      <TrendingDown className="size-3" /> Out
    </span>
  );
}

export function LedgerView({
  account, entries, total, balance, page, pageSize, role, categories, badge, extraActions,
  dateFrom, dateTo, category, memberCode, direction,
}: LedgerViewProps) {
  const router  = useRouter();
  const [isPending, startTransition] = useTransition();

  // Filter bar state (local — applying pushes to URL)
  const [localDateFrom,   setLocalDateFrom]   = useState(dateFrom ?? "");
  const [localDateTo,     setLocalDateTo]     = useState(dateTo   ?? "");
  const [localCategory,   setLocalCategory]   = useState(category ?? "");
  const [localMemberCode, setLocalMemberCode] = useState(memberCode ?? "");
  const [localDirection,  setLocalDirection]  = useState<"" | "in" | "out">(direction ?? "");
  const [showFilters,     setShowFilters]     = useState(false);

  // Edit / delete state
  const [editEntry,       setEditEntry]   = useState<LedgerRow | null>(null);
  const [deleteEntry,     setDeleteEntry] = useState<LedgerRow | null>(null);
  const [deleteLoading,   setDeleteLoading] = useState(false);

  const canWrite = role === "admin" || role === "editor";
  const canDelete = role === "admin";

  const totalPages = Math.ceil(total / pageSize);

  function buildUrl(overrides: Record<string, string | number>) {
    const params = new URLSearchParams();
    params.set("account", account);
    if (localDateFrom)   params.set("dateFrom", localDateFrom);
    if (localDateTo)     params.set("dateTo", localDateTo);
    if (localCategory)   params.set("category", localCategory);
    if (localMemberCode) params.set("memberCode", localMemberCode);
    if (localDirection)  params.set("direction", localDirection);
    params.set("page", String(page));
    Object.entries(overrides).forEach(([k, v]) => params.set(k, String(v)));
    return `?${params.toString()}`;
  }

  function applyFilters() {
    startTransition(() => router.push(buildUrl({ page: 1 })));
  }

  function clearFilters() {
    setLocalDateFrom(""); setLocalDateTo(""); setLocalCategory("");
    setLocalMemberCode(""); setLocalDirection("");
    startTransition(() => router.push(`?account=${account}&page=1`));
  }

  const handleDelete = useCallback(async () => {
    if (!deleteEntry) return;
    setDeleteLoading(true);
    try {
      const res = await fetch(`/api/ledger/${deleteEntry.id}`, { method: "DELETE" });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed to delete"); return; }
      toast.success("Entry deleted");
      setDeleteEntry(null);
      router.refresh();
    } catch { toast.error("Something went wrong"); }
    finally { setDeleteLoading(false); }
  }, [deleteEntry, router]);

  const fieldCls = "h-9 border-0 bg-surface-container px-3 text-sm shadow-none focus-visible:bg-white rounded-lg";
  const selectCls = cn(fieldCls, "w-full outline-none focus-visible:ring-2 focus-visible:ring-ring/50");

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="font-headline text-2xl font-bold text-on-surface">
            {account === "general" ? "General Ledger" : account === "zakat" ? "Zakat Account" : "Interest Account"}
          </h1>
          {badge}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {extraActions}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setShowFilters((v) => !v)}
          >
            <Filter className="size-3.5" />
            Filters
          </Button>
        </div>
      </div>

      {/* Balance KPI */}
      <div className="bg-white rounded-xl border border-outline-variant p-4 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-on-surface-variant mb-1">
            Current Balance
          </p>
          <p className={cn("font-headline text-3xl font-bold", balance >= 0 ? "text-success" : "text-error")}>
            {formatINR(balance)}
          </p>
        </div>
        <div className="text-right text-sm text-on-surface-variant">
          <p>{total} entries</p>
          <p>{totalPages > 1 ? `Page ${page} of ${totalPages}` : ""}</p>
        </div>
      </div>

      {/* Filter bar */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-outline-variant p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            <div className="space-y-1">
              <Label className="text-xs">From</Label>
              <Input className={fieldCls} type="date" value={localDateFrom} onChange={(e) => setLocalDateFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">To</Label>
              <Input className={fieldCls} type="date" value={localDateTo} onChange={(e) => setLocalDateTo(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <select className={selectCls} value={localCategory} onChange={(e) => setLocalCategory(e.target.value)}>
                <option value="">All</option>
                {categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Member Code</Label>
              <Input className={fieldCls} placeholder="e.g. M001" value={localMemberCode} onChange={(e) => setLocalMemberCode(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Direction</Label>
              <select className={selectCls} value={localDirection} onChange={(e) => setLocalDirection(e.target.value as "" | "in" | "out")}>
                <option value="">All</option>
                <option value="in">Inflows only</option>
                <option value="out">Outflows only</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
            <Button size="sm" onClick={applyFilters} disabled={isPending}>Apply</Button>
          </div>
        </div>
      )}

      {/* Desktop table */}
      <div className="hidden md:block bg-white rounded-xl border border-outline-variant overflow-hidden">
        {entries.length === 0 ? (
          <div className="py-16 text-center text-on-surface-variant text-sm">No entries found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-low border-b border-outline-variant">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Date</th>
                <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Category</th>
                <th className="text-left px-4 py-3 font-medium text-on-surface-variant hidden lg:table-cell">Member</th>
                <th className="text-left px-4 py-3 font-medium text-on-surface-variant">Description</th>
                <th className="text-right px-4 py-3 font-medium text-on-surface-variant">Amount</th>
                <th className="text-right px-4 py-3 font-medium text-on-surface-variant hidden lg:table-cell">Balance</th>
                {(canWrite || canDelete) && (
                  <th className="px-4 py-3 w-20"></th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-surface-low transition-colors">
                  <td className="px-4 py-3 whitespace-nowrap text-on-surface-variant">{formatDate(entry.date)}</td>
                  <td className="px-4 py-3">
                    <span className="font-medium text-on-surface">{entry.category}</span>
                    {entry.sub_category && (
                      <span className="block text-xs text-on-surface-variant">{entry.sub_category}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell">
                    {entry.member_code ? (
                      <span className="font-mono text-xs bg-surface-container px-1.5 py-0.5 rounded">{entry.member_code}</span>
                    ) : <span className="text-on-surface-variant">—</span>}
                  </td>
                  <td className="px-4 py-3 text-on-surface max-w-xs">
                    <span className="line-clamp-2">{entry.description}</span>
                    {entry.reference && (
                      <span className="block text-xs text-on-surface-variant font-mono mt-0.5">Ref: {entry.reference}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <AmountCell amount={entry.amount} />
                  </td>
                  <td className="px-4 py-3 text-right hidden lg:table-cell whitespace-nowrap">
                    <BalanceCell balance={entry.running_balance} />
                  </td>
                  {(canWrite || canDelete) && (
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 justify-end">
                        {canWrite && (
                          <button
                            onClick={() => setEditEntry(entry)}
                            className="p-1.5 rounded hover:bg-surface-container text-on-surface-variant transition-colors"
                            aria-label="Edit entry"
                          >
                            <Pencil className="size-3.5" />
                          </button>
                        )}
                        {canDelete && (
                          <button
                            onClick={() => setDeleteEntry(entry)}
                            className="p-1.5 rounded hover:bg-error-container text-on-surface-variant hover:text-error transition-colors"
                            aria-label="Delete entry"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Mobile cards */}
      <div className="md:hidden space-y-3">
        {entries.length === 0 ? (
          <div className="bg-white rounded-xl border border-outline-variant py-12 text-center text-on-surface-variant text-sm">
            No entries found.
          </div>
        ) : entries.map((entry) => (
          <div key={entry.id} className="bg-white rounded-xl border border-outline-variant p-4 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-medium text-on-surface text-sm leading-snug">{entry.description}</p>
                <p className="text-xs text-on-surface-variant mt-0.5">{entry.category}</p>
              </div>
              <AmountCell amount={entry.amount} />
            </div>
            <div className="flex items-center gap-3 text-xs text-on-surface-variant">
              <span>{formatDate(entry.date)}</span>
              {entry.member_code && (
                <span className="font-mono bg-surface-container px-1.5 py-0.5 rounded">{entry.member_code}</span>
              )}
              <StatusChip amount={entry.amount} />
            </div>
            {entry.reference && (
              <p className="text-xs font-mono text-on-surface-variant">Ref: {entry.reference}</p>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-outline-variant/50">
              <span className="text-xs text-on-surface-variant">Balance: <BalanceCell balance={entry.running_balance} /></span>
              {(canWrite || canDelete) && (
                <div className="flex gap-1">
                  {canWrite && (
                    <button onClick={() => setEditEntry(entry)} className="p-2 rounded hover:bg-surface-container text-on-surface-variant" aria-label="Edit">
                      <Pencil className="size-3.5" />
                    </button>
                  )}
                  {canDelete && (
                    <button onClick={() => setDeleteEntry(entry)} className="p-2 rounded hover:bg-error-container text-on-surface-variant hover:text-error" aria-label="Delete">
                      <Trash2 className="size-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1 || isPending}
            onClick={() => startTransition(() => router.push(buildUrl({ page: page - 1 })))}
          >
            <ChevronLeft className="size-4" /> Prev
          </Button>
          <span className="text-sm text-on-surface-variant px-2">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages || isPending}
            onClick={() => startTransition(() => router.push(buildUrl({ page: page + 1 })))}
          >
            Next <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      {/* Edit modal */}
      {editEntry && (
        <EditEntryModal
          open={!!editEntry}
          entry={editEntry}
          account={account}
          categories={categories}
          onOpenChange={(v) => { if (!v) setEditEntry(null); }}
          onSuccess={() => { setEditEntry(null); router.refresh(); }}
        />
      )}

      {/* Delete confirm dialog */}
      <Dialog open={!!deleteEntry} onOpenChange={(v) => { if (!v) setDeleteEntry(null); }}>
        <DialogContent className="max-w-md rounded-xl" showCloseButton>
          <DialogHeader className="p-5 pb-3">
            <DialogTitle className="text-error">Delete Entry?</DialogTitle>
          </DialogHeader>
          <div className="px-5 pb-2 space-y-3">
            <p className="text-sm text-on-surface-variant">
              This will remove this entry from all balances. The audit log will retain a permanent record.
            </p>
            {deleteEntry && (
              <div className="bg-surface-container rounded-lg p-3 space-y-1 text-sm">
                <p className="font-medium text-on-surface">{deleteEntry.description}</p>
                <p className="text-on-surface-variant">{formatDate(deleteEntry.date)} · {deleteEntry.category}</p>
                <AmountCell amount={deleteEntry.amount} />
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 px-5 pb-5">
            <Button variant="ghost" onClick={() => setDeleteEntry(null)} disabled={deleteLoading}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleteLoading}>
              {deleteLoading ? "Deleting…" : "Delete Entry"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
