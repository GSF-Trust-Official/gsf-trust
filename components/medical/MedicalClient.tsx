"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Filter, ChevronLeft, ChevronRight, Pencil } from "lucide-react";

import { formatINR, formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { canWrite } from "@/lib/roles";
import type { UserRole } from "@/types";
import type { MedicalPage } from "@/lib/queries/medicalCases";
import type { MedicalCase } from "@/types";
import { AddCaseModal } from "./AddCaseModal";
import { UpdateCaseModal } from "./UpdateCaseModal";

const STATUS_BADGE: Record<string, string> = {
  open:   "bg-warning-container text-[#4d3600]",
  closed: "bg-surface-high text-on-surface-variant",
};

interface Props {
  initialData: MedicalPage;
  role:        UserRole;
  status:      string;
}

export function MedicalClient({ initialData, role, status: initStatus }: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [addOpen,    setAddOpen]    = useState(false);
  const [editCase,   setEditCase]   = useState<MedicalCase | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [localStatus, setLocalStatus] = useState(initStatus);

  const { entries, total, page, pageSize, openCount, closedCount, totalPaid } = initialData;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function buildUrl(newPage: number, st = initStatus) {
    const p = new URLSearchParams();
    if (st) p.set("status", st);
    p.set("page", String(newPage));
    return `/medical?${p.toString()}`;
  }

  function applyFilter() {
    startTransition(() => router.push(buildUrl(1, localStatus)));
  }

  function clearFilter() {
    setLocalStatus("");
    startTransition(() => router.push("/medical"));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface">Medical Assistance</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">Track assistance cases and fund disbursements</p>
        </div>
        {canWrite(role) && (
          <Button className="gap-2" onClick={() => setAddOpen(true)}>
            <PlusCircle className="size-4" />
            Add Case
          </Button>
        )}
      </div>

      {/* KPI chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Disbursed",  value: formatINR(totalPaid),   cls: "bg-surface-container" },
          { label: "Open Cases",       value: String(openCount),      cls: "bg-warning-container" },
          { label: "Closed Cases",     value: String(closedCount),    cls: "bg-surface-high" },
          { label: "Total Cases",      value: String(openCount + closedCount), cls: "bg-info-container" },
        ].map(({ label, value, cls }) => (
          <div key={label} className={cn("rounded-xl p-4", cls)}>
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
            <p className="text-xl font-headline font-bold text-on-surface">{value}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-outline-variant bg-white">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
          <span className="text-sm font-medium text-on-surface">{total} case{total !== 1 ? "s" : ""}</span>
          <button
            type="button"
            onClick={() => setShowFilter(!showFilter)}
            className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <Filter className="size-3.5" />
            {showFilter ? "Hide filters" : "Filters"}
          </button>
        </div>

        {/* Filter panel */}
        {showFilter && (
          <div className="p-4 border-b border-outline-variant space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-on-surface-variant">Status</label>
                <select
                  className="h-10 border-0 bg-surface-container px-3 text-sm shadow-none w-full rounded-lg outline-none"
                  value={localStatus}
                  onChange={(e) => setLocalStatus(e.target.value)}
                >
                  <option value="">All cases</option>
                  <option value="open">Open</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilter}>Clear</Button>
              <Button size="sm" onClick={applyFilter}>Apply</Button>
            </div>
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-on-surface-variant border-b border-outline-variant">
                <th className="text-left px-4 py-3 font-medium">Ref</th>
                <th className="text-left px-4 py-3 font-medium">Beneficiary</th>
                <th className="text-left px-4 py-3 font-medium">Status</th>
                <th className="text-left px-4 py-3 font-medium">Opened</th>
                <th className="text-right px-4 py-3 font-medium">Requested</th>
                <th className="text-right px-4 py-3 font-medium">Paid</th>
                <th className="text-right px-4 py-3 font-medium">External</th>
                {canWrite(role) && <th className="px-4 py-3" />}
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td colSpan={canWrite(role) ? 8 : 7} className="px-4 py-12 text-center text-on-surface-variant text-sm">
                    No medical cases found
                  </td>
                </tr>
              )}
              {entries.map((row) => (
                <tr key={row.id} className="border-b border-outline-variant/50 hover:bg-surface-low transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{row.case_ref}</td>
                  <td className="px-4 py-3 font-medium text-on-surface">{row.beneficiary_name}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize", STATUS_BADGE[row.status])}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant font-mono">{formatDate(row.opened_at)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm">{formatINR(row.amount_requested)}</td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-success">
                    {row.amount_paid > 0 ? formatINR(row.amount_paid) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-sm text-info">
                    {row.amount_external > 0 ? formatINR(row.amount_external) : "—"}
                  </td>
                  {canWrite(role) && (
                    <td className="px-4 py-3">
                      {row.status === "open" && (
                        <button
                          type="button"
                          onClick={() => setEditCase(row)}
                          className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
                          aria-label="Update case"
                        >
                          <Pencil className="size-3.5" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-outline-variant/50">
          {entries.length === 0 && (
            <p className="px-4 py-12 text-center text-on-surface-variant text-sm">No medical cases found</p>
          )}
          {entries.map((row) => (
            <div key={row.id} className="px-4 py-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-on-surface text-sm">{row.beneficiary_name}</p>
                  <p className="text-xs text-on-surface-variant font-mono mt-0.5">{row.case_ref}</p>
                </div>
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize shrink-0", STATUS_BADGE[row.status])}>
                  {row.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-on-surface-variant">
                <span>Requested: {formatINR(row.amount_requested)}</span>
                {row.amount_paid > 0 && <span className="text-success">Paid: {formatINR(row.amount_paid)}</span>}
                {row.amount_external > 0 && <span className="text-info">External: {formatINR(row.amount_external)}</span>}
              </div>
              <p className="text-xs text-on-surface-variant">Opened {formatDate(row.opened_at)}</p>
              {canWrite(role) && row.status === "open" && (
                <Button size="sm" variant="outline" onClick={() => setEditCase(row)}>
                  Update
                </Button>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
            <p className="text-xs text-on-surface-variant">Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1}
                onClick={() => startTransition(() => router.push(buildUrl(page - 1)))}>
                <ChevronLeft className="size-4" />
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages}
                onClick={() => startTransition(() => router.push(buildUrl(page + 1)))}>
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <AddCaseModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onSuccess={() => startTransition(() => router.refresh())}
      />

      {editCase && (
        <UpdateCaseModal
          open={!!editCase}
          onOpenChange={(v) => { if (!v) setEditCase(null); }}
          medCase={editCase}
          onSuccess={() => { setEditCase(null); startTransition(() => router.refresh()); }}
        />
      )}
    </div>
  );
}
