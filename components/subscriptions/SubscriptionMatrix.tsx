"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCheck, ChevronDown, AlertCircle } from "lucide-react";

import type { Subscription, SubscriptionMatrixRow, UserRole } from "@/types";
import type { ArrearRow } from "@/lib/queries/subscriptions";
import { canWrite } from "@/lib/roles";
import { formatINR, formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  LogSubscriptionModal,
  type LogSubDefaults,
} from "@/components/subscriptions/LogSubscriptionModal";

const MONTHS_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

interface Props {
  matrix:  SubscriptionMatrixRow[];
  arrears: ArrearRow[];
  year:    number;
  role:    UserRole;
  members: Array<{ id: string; code: string; name: string; email: string | null }>;
}

export function SubscriptionMatrix({ matrix, arrears, year, role, members }: Props) {
  const router = useRouter();
  const now    = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear  = now.getFullYear();
  const writable     = canWrite(role);

  const [activeTab,    setActiveTab]    = useState<"matrix" | "arrears">("matrix");
  const [logOpen,      setLogOpen]      = useState(false);
  const [logDefaults,  setLogDefaults]  = useState<LogSubDefaults>({ month: currentMonth, year });
  const [detailSub,    setDetailSub]    = useState<(Subscription & { member_name: string }) | null>(null);
  const [bulkMonth,    setBulkMonth]    = useState<number | null>(null);
  const [bulkLoading,  setBulkLoading]  = useState(false);
  const [bulkDate,     setBulkDate]     = useState(new Date().toISOString().slice(0, 10));
  const [bulkMode,     setBulkMode]     = useState("upi");

  const yearOptions = useMemo(() => {
    const opts = [];
    for (let y = currentYear + 1; y >= 2023; y--) opts.push(y);
    return opts;
  }, [currentYear]);

  function openLog(memberId: string | undefined, month: number, selYear: number) {
    setLogDefaults({ memberId, month, year: selYear });
    setLogOpen(true);
  }

  // Members who haven't paid for bulkMonth in the current year
  const bulkTargets = useMemo(() => {
    if (bulkMonth === null) return [];
    return matrix
      .filter((row) => {
        const cell = row.months[bulkMonth];
        return !cell || cell.status !== "paid";
      })
      .map((row) => ({ id: row.member_id, code: row.member_code, name: row.member_name }));
  }, [matrix, bulkMonth]);

  async function handleBulkConfirm() {
    if (bulkMonth === null || bulkTargets.length === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/subscriptions/bulk-mark-paid", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          month:      bulkMonth,
          year,
          member_ids: bulkTargets.map((m) => m.id),
          paid_date:  bulkDate,
          mode:       bulkMode,
          amount:     300,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Bulk mark failed"); return; }
      toast.success(`Marked ${bulkTargets.length} member(s) as paid for ${MONTHS_SHORT[bulkMonth - 1]}`);
      setBulkMonth(null);
      router.refresh();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setBulkLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface">Subscriptions</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">
            {matrix.length} active member{matrix.length !== 1 ? "s" : ""}
            {arrears.length > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 text-error">
                <AlertCircle className="size-3" />
                {arrears.length} with arrears
              </span>
            )}
          </p>
        </div>

        {/* Year selector */}
        <div className="flex items-center gap-2">
          <div className="relative">
            <select
              className="h-10 appearance-none pl-3 pr-8 rounded-lg border border-outline-variant bg-white text-sm font-medium text-on-surface focus:outline-none"
              value={year}
              onChange={(e) => router.push(`/subscriptions?year=${e.target.value}`)}
            >
              {yearOptions.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 size-4 text-on-surface-variant" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-surface-container rounded-lg p-1 w-fit">
        {(["matrix", "arrears"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 rounded-md text-sm font-medium transition-colors capitalize",
              activeTab === tab
                ? "bg-white text-on-surface shadow-sm"
                : "text-on-surface-variant hover:text-on-surface"
            )}
          >
            {tab}
            {tab === "arrears" && arrears.length > 0 && (
              <span className="ml-1.5 inline-flex items-center justify-center size-4 rounded-full bg-error text-white text-[10px] font-bold">
                {arrears.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Matrix Tab ── */}
      {activeTab === "matrix" && (
        <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-outline-variant bg-surface-low">
                  {/* Sticky member column header */}
                  <th className="sticky left-0 z-10 bg-surface-low px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-on-surface-variant min-w-[140px] border-r border-outline-variant">
                    Member
                  </th>
                  {MONTHS_SHORT.map((m, i) => {
                    const monthNum = i + 1;
                    const isCurrent = year === currentYear && monthNum === currentMonth;
                    return (
                      <th
                        key={m}
                        className={cn(
                          "px-1 py-2 text-xs font-semibold uppercase tracking-widest text-on-surface-variant min-w-[52px]",
                          isCurrent && "bg-primary/5"
                        )}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <span>{m}</span>
                          {writable && (
                            <button
                              title={`Mark all paid — ${m} ${year}`}
                              onClick={() => {
                                setBulkDate(new Date().toISOString().slice(0, 10));
                                setBulkMode("upi");
                                setBulkMonth(monthNum);
                              }}
                              className="text-on-surface-variant hover:text-primary transition-colors"
                              aria-label={`Bulk mark ${m} as paid`}
                            >
                              <CheckCheck className="size-3" />
                            </button>
                          )}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {matrix.map((row, ri) => (
                  <tr
                    key={row.member_id}
                    className={cn(
                      "border-b border-outline-variant last:border-0",
                      ri % 2 === 1 && "bg-surface-low/40"
                    )}
                  >
                    {/* Sticky member name */}
                    <td className="sticky left-0 z-10 bg-inherit px-4 py-2 border-r border-outline-variant">
                      <p className="font-medium text-on-surface truncate max-w-[120px]">{row.member_name}</p>
                      <p className="font-mono text-[11px] text-on-surface-variant">{row.member_code}</p>
                    </td>

                    {MONTHS_SHORT.map((_, i) => {
                      const monthNum = i + 1;
                      const sub      = row.months[monthNum];
                      const isCurrent = year === currentYear && monthNum === currentMonth;
                      return (
                        <td
                          key={monthNum}
                          className={cn("px-1 py-2 text-center", isCurrent && "bg-primary/5")}
                        >
                          <MatrixCell
                            sub={sub}
                            writable={writable}
                            onPaidClick={() =>
                              sub && setDetailSub({ ...sub, member_name: row.member_name })
                            }
                            onEmptyClick={() => openLog(row.member_id, monthNum, year)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>

            {matrix.length === 0 && (
              <p className="text-center py-12 text-sm text-on-surface-variant">
                No active members found.
              </p>
            )}
          </div>

          {/* Legend */}
          <div className="px-4 py-3 border-t border-outline-variant flex flex-wrap gap-x-5 gap-y-2 text-xs text-on-surface-variant">
            {[
              { cls: "bg-primary-fixed text-on-primary-fixed-variant", label: "P — Paid" },
              { cls: "bg-warning-container text-[#4d3600]", label: "D — Due" },
              { cls: "bg-info-container text-[#003b52]", label: "N/A" },
              { cls: "bg-surface-container text-on-surface-variant", label: "· — No record" },
            ].map(({ cls, label }) => (
              <span key={label} className="flex items-center gap-1.5">
                <span className={cn("inline-flex items-center justify-center w-5 h-5 rounded text-[10px] font-bold", cls)}>
                  {label.split(" — ")[0]}
                </span>
                {label.split(" — ")[1]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Arrears Tab ── */}
      {activeTab === "arrears" && (
        <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
          {arrears.length === 0 ? (
            <p className="text-center py-12 text-sm text-on-surface-variant">
              No arrears — all members are up to date.
            </p>
          ) : (
            <>
              {/* Desktop table */}
              <table className="hidden sm:table w-full text-sm">
                <thead className="border-b border-outline-variant bg-surface-low">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Member</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Months Due</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Total Due</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-widest text-on-surface-variant">Oldest</th>
                    {writable && (
                      <th className="px-4 py-3 text-xs font-semibold uppercase tracking-widest text-on-surface-variant" />
                    )}
                  </tr>
                </thead>
                <tbody>
                  {arrears.map((row, i) => (
                    <tr
                      key={row.member_id}
                      className={cn("border-b border-outline-variant last:border-0", i % 2 === 1 && "bg-surface-low/40")}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-on-surface">{row.member_name}</p>
                        <p className="font-mono text-xs text-on-surface-variant">{row.member_code}</p>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center h-6 min-w-6 rounded-full bg-error-container text-error text-xs font-bold px-2">
                          {row.due_count}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-error">
                        {formatINR(row.total_due)}
                      </td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">
                        {MONTHS_SHORT[row.oldest_month - 1]} {row.oldest_year}
                      </td>
                      {writable && (
                        <td className="px-4 py-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() =>
                              openLog(row.member_id, row.oldest_month, row.oldest_year)
                            }
                          >
                            Log Payment
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Mobile cards */}
              <div className="sm:hidden divide-y divide-outline-variant">
                {arrears.map((row) => (
                  <div key={row.member_id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-on-surface">{row.member_name}</p>
                        <p className="font-mono text-xs text-on-surface-variant">{row.member_code}</p>
                      </div>
                      <span className="inline-flex items-center justify-center h-6 min-w-6 rounded-full bg-error-container text-error text-xs font-bold px-2 shrink-0">
                        {row.due_count}mo
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <p className="text-sm font-medium text-error">{formatINR(row.total_due)} due</p>
                        <p className="text-xs text-on-surface-variant">
                          Oldest: {MONTHS_SHORT[row.oldest_month - 1]} {row.oldest_year}
                        </p>
                      </div>
                      {writable && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            openLog(row.member_id, row.oldest_month, row.oldest_year)
                          }
                        >
                          Log
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Log Subscription Modal */}
      <LogSubscriptionModal
        open={logOpen}
        onOpenChange={setLogOpen}
        members={members}
        defaults={logDefaults}
        onSuccess={() => router.refresh()}
      />

      {/* Paid Cell Details Dialog */}
      <Dialog open={!!detailSub} onOpenChange={(v) => !v && setDetailSub(null)}>
        {detailSub && (
          <DialogContent className="max-w-sm rounded-xl" showCloseButton>
            <DialogHeader className="p-5 pb-3">
              <DialogTitle>Payment Details</DialogTitle>
              <DialogDescription>
                {detailSub.member_name} — {MONTHS_SHORT[detailSub.month - 1]} {detailSub.year}
              </DialogDescription>
            </DialogHeader>
            <div className="px-5 pb-5 space-y-3 text-sm">
              {[
                { label: "Amount",    value: formatINR(detailSub.amount) },
                { label: "Paid on",   value: detailSub.paid_date ? formatDate(detailSub.paid_date) : "—" },
                { label: "Mode",      value: detailSub.mode?.toUpperCase() ?? "—" },
                { label: "Reference", value: detailSub.reference ?? "—" },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between gap-4">
                  <span className="text-on-surface-variant">{label}</span>
                  <span className="font-medium text-on-surface text-right">{value}</span>
                </div>
              ))}
              {writable && (
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      setDetailSub(null);
                      openLog(detailSub.member_id, detailSub.month, detailSub.year);
                    }}
                  >
                    Edit / Re-log
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* Bulk Mark Paid Dialog */}
      <Dialog open={bulkMonth !== null} onOpenChange={(v) => !v && setBulkMonth(null)}>
        <DialogContent className="max-w-sm rounded-xl" showCloseButton>
          <DialogHeader className="p-5 pb-3">
            <DialogTitle>
              Mark All Paid — {bulkMonth ? MONTHS_SHORT[bulkMonth - 1] : ""} {year}
            </DialogTitle>
            <DialogDescription>
              {bulkTargets.length === 0
                ? "All members are already paid for this month."
                : `This will mark ${bulkTargets.length} member(s) as paid.`}
            </DialogDescription>
          </DialogHeader>

          {bulkTargets.length > 0 && (
            <div className="px-5 space-y-4">
              {/* Members list */}
              <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg bg-surface-container p-3">
                {bulkTargets.map((m) => (
                  <p key={m.id} className="text-sm text-on-surface">
                    <span className="font-mono text-xs text-on-surface-variant mr-2">{m.code}</span>
                    {m.name}
                  </p>
                ))}
              </div>

              {/* Date + Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Payment Date</Label>
                  <input
                    type="date"
                    value={bulkDate}
                    onChange={(e) => setBulkDate(e.target.value)}
                    className="h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Mode</Label>
                  <select
                    className="h-10 w-full rounded-lg border border-outline-variant bg-white px-3 text-sm focus:outline-none"
                    value={bulkMode}
                    onChange={(e) => setBulkMode(e.target.value)}
                  >
                    <option value="upi">UPI</option>
                    <option value="bank">Bank</option>
                    <option value="cash">Cash</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 justify-end px-5 pb-5 pt-3">
            <Button variant="ghost" onClick={() => setBulkMonth(null)} disabled={bulkLoading}>
              Cancel
            </Button>
            <Button
              disabled={bulkLoading || bulkTargets.length === 0}
              onClick={handleBulkConfirm}
            >
              {bulkLoading ? "Saving..." : `Confirm (${bulkTargets.length})`}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Cell component ──────────────────────────────────────────────────────────

interface CellProps {
  sub:          Subscription | null;
  writable:     boolean;
  onPaidClick:  () => void;
  onEmptyClick: () => void;
}

function MatrixCell({ sub, writable, onPaidClick, onEmptyClick }: CellProps) {
  if (!sub) {
    return (
      <button
        onClick={writable ? onEmptyClick : undefined}
        disabled={!writable}
        className={cn(
          "w-full h-9 flex items-center justify-center rounded-md text-sm text-on-surface-variant",
          writable && "hover:bg-surface-container transition-colors cursor-pointer"
        )}
        aria-label="Log payment"
      >
        ·
      </button>
    );
  }

  if (sub.status === "paid") {
    return (
      <button
        onClick={onPaidClick}
        className="w-full h-9 flex items-center justify-center rounded-md text-xs font-bold bg-primary-fixed text-on-primary-fixed-variant hover:bg-primary-fixed-dim transition-colors"
        aria-label="Paid — click for details"
      >
        P
      </button>
    );
  }

  if (sub.status === "due") {
    return (
      <button
        onClick={writable ? onEmptyClick : undefined}
        disabled={!writable}
        className={cn(
          "w-full h-9 flex items-center justify-center rounded-md text-xs font-bold bg-warning-container text-[#4d3600]",
          writable && "hover:opacity-80 transition-opacity cursor-pointer"
        )}
        aria-label="Due — click to log payment"
      >
        D
      </button>
    );
  }

  // na
  return (
    <div className="w-full h-9 flex items-center justify-center rounded-md text-[10px] font-medium bg-info-container text-[#003b52]">
      N/A
    </div>
  );
}
