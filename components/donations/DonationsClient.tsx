"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Filter, ChevronLeft, ChevronRight } from "lucide-react";

import { formatINR, formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { canWrite } from "@/lib/roles";
import type { UserRole } from "@/types";
import type { DonationPage, DonationRow } from "@/lib/queries/donations";
import { LogDonationModal } from "./LogDonationModal";

const TYPE_BADGE: Record<string, string> = {
  hadiya: "bg-success-container text-success",
  zakat:  "bg-error-container text-error",
  other:  "bg-info-container text-info",
};

const TYPE_LABEL: Record<string, string> = {
  hadiya: "Hadiya",
  zakat:  "Zakat",
  other:  "Other",
};

const CAT_BADGE: Record<string, string> = {
  general:    "bg-surface-high text-on-surface-variant",
  medical:    "bg-warning-container text-[#4d3600]",
  scholarship:"bg-primary-fixed text-on-primary-fixed-variant",
  emergency:  "bg-error-container text-error",
};

const CAT_LABEL: Record<string, string> = {
  general:    "General",
  medical:    "Medical",
  scholarship:"Scholarship",
  emergency:  "Emergency",
};

const fieldClass =
  "h-10 border-0 bg-surface-container px-3 text-sm shadow-none focus-visible:bg-white";
const selectClass = cn(
  fieldClass,
  "w-full rounded-lg outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
);

interface Props {
  initialData: DonationPage;
  members:     Array<{ id: string; code: string; name: string }>;
  role:        UserRole;
  type:        string;
  category:    string;
  dateFrom:    string;
  dateTo:      string;
}

export function DonationsClient({
  initialData, members, role,
  type: initType, category: initCategory,
  dateFrom: initDateFrom, dateTo: initDateTo,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [showFilters, setShowFilters] = useState(false);
  const [modalOpen,   setModalOpen]   = useState(false);

  const [localType,     setLocalType]     = useState(initType);
  const [localCategory, setLocalCategory] = useState(initCategory);
  const [localDateFrom, setLocalDateFrom] = useState(initDateFrom);
  const [localDateTo,   setLocalDateTo]   = useState(initDateTo);

  const { entries, total, page, pageSize, totals } = initialData;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasFilters = !!(initType || initCategory || initDateFrom || initDateTo);

  function buildPageUrl(newPage: number) {
    const params = new URLSearchParams();
    if (initType)     params.set("type",     initType);
    if (initCategory) params.set("category", initCategory);
    if (initDateFrom) params.set("dateFrom", initDateFrom);
    if (initDateTo)   params.set("dateTo",   initDateTo);
    params.set("page", String(newPage));
    return `/donations?${params.toString()}`;
  }

  function applyFilters() {
    const params = new URLSearchParams();
    if (localType)     params.set("type",     localType);
    if (localCategory) params.set("category", localCategory);
    if (localDateFrom) params.set("dateFrom", localDateFrom);
    if (localDateTo)   params.set("dateTo",   localDateTo);
    startTransition(() => router.push(`/donations?${params.toString()}`));
  }

  function clearFilters() {
    setLocalType(""); setLocalCategory(""); setLocalDateFrom(""); setLocalDateTo("");
    startTransition(() => router.push("/donations"));
  }

  function donorLabel(row: DonationRow) {
    if (row.member_name && row.member_code) return `${row.member_code} — ${row.member_name}`;
    return row.donor_name ?? "—";
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface">Donations</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">All donations received by the Foundation</p>
        </div>
        {canWrite(role) && (
          <Button className="gap-2" onClick={() => setModalOpen(true)}>
            <PlusCircle className="size-4" />
            Log Donation
          </Button>
        )}
      </div>

      {/* KPI chips */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Donations", value: totals.grand,  cls: "bg-surface-container" },
          { label: "Hadiya",          value: totals.hadiya, cls: "bg-success-container" },
          { label: "Zakat",           value: totals.zakat,  cls: "bg-error-container"   },
          { label: "Other",           value: totals.other,  cls: "bg-info-container"    },
        ].map(({ label, value, cls }) => (
          <div key={label} className={cn("rounded-xl p-4", cls)}>
            <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">{label}</p>
            <p className="text-xl font-headline font-bold text-on-surface">{formatINR(value)}</p>
          </div>
        ))}
      </div>

      {/* Table card */}
      <div className="rounded-xl border border-outline-variant bg-white">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline-variant">
          <span className="text-sm font-medium text-on-surface">
            {total} donation{total !== 1 ? "s" : ""}
            {hasFilters && " (filtered)"}
          </span>
          <button
            type="button"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-sm text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <Filter className="size-3.5" />
            {showFilters ? "Hide filters" : "Filters"}
          </button>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="p-4 space-y-3 border-b border-outline-variant">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Type</Label>
                <select className={selectClass} value={localType} onChange={(e) => setLocalType(e.target.value)}>
                  <option value="">All types</option>
                  <option value="hadiya">Hadiya</option>
                  <option value="zakat">Zakat</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Category</Label>
                <select className={selectClass} value={localCategory} onChange={(e) => setLocalCategory(e.target.value)}>
                  <option value="">All categories</option>
                  <option value="general">General</option>
                  <option value="medical">Medical</option>
                  <option value="scholarship">Scholarship</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date From</Label>
                <Input className={fieldClass} type="date" value={localDateFrom} onChange={(e) => setLocalDateFrom(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Date To</Label>
                <Input className={fieldClass} type="date" value={localDateTo} onChange={(e) => setLocalDateTo(e.target.value)} />
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>
              <Button size="sm" onClick={applyFilters}>Apply</Button>
            </div>
          </div>
        )}

        {/* Desktop table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-on-surface-variant border-b border-outline-variant">
                <th className="text-left px-4 py-3 font-medium">Date</th>
                <th className="text-left px-4 py-3 font-medium">Donor</th>
                <th className="text-left px-4 py-3 font-medium">Type</th>
                <th className="text-left px-4 py-3 font-medium">Category</th>
                <th className="text-right px-4 py-3 font-medium">Amount</th>
                <th className="text-left px-4 py-3 font-medium">Mode / Ref</th>
              </tr>
            </thead>
            <tbody>
              {entries.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-on-surface-variant text-sm">
                    No donations found
                  </td>
                </tr>
              )}
              {entries.map((row) => (
                <tr key={row.id} className="border-b border-outline-variant/50 hover:bg-surface-low transition-colors">
                  <td className="px-4 py-3 text-on-surface-variant font-mono text-xs">{formatDate(row.date)}</td>
                  <td className="px-4 py-3 font-medium text-on-surface">{donorLabel(row)}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", TYPE_BADGE[row.type])}>
                      {TYPE_LABEL[row.type]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", CAT_BADGE[row.category])}>
                      {CAT_LABEL[row.category]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-medium text-success">
                    + {formatINR(row.amount)}
                  </td>
                  <td className="px-4 py-3 text-xs text-on-surface-variant">
                    {row.mode && <span className="capitalize">{row.mode}</span>}
                    {row.mode && row.reference && " · "}
                    {row.reference && <span className="font-mono">{row.reference}</span>}
                    {!row.mode && !row.reference && "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="md:hidden divide-y divide-outline-variant/50">
          {entries.length === 0 && (
            <p className="px-4 py-12 text-center text-on-surface-variant text-sm">No donations found</p>
          )}
          {entries.map((row) => (
            <div key={row.id} className="px-4 py-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-on-surface text-sm">{donorLabel(row)}</p>
                  <p className="text-xs text-on-surface-variant font-mono mt-0.5">{formatDate(row.date)}</p>
                </div>
                <p className="text-success font-mono font-semibold text-sm shrink-0">
                  + {formatINR(row.amount)}
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", TYPE_BADGE[row.type])}>
                  {TYPE_LABEL[row.type]}
                </span>
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium", CAT_BADGE[row.category])}>
                  {CAT_LABEL[row.category]}
                </span>
                {row.mode && <span className="text-xs text-on-surface-variant capitalize">{row.mode}</span>}
              </div>
              {row.reference && (
                <p className="text-xs text-on-surface-variant font-mono">Ref: {row.reference}</p>
              )}
            </div>
          ))}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-outline-variant">
            <p className="text-xs text-on-surface-variant">
              Page {page} of {totalPages} · {total} total
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => startTransition(() => router.push(buildPageUrl(page - 1)))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => startTransition(() => router.push(buildPageUrl(page + 1)))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        )}
      </div>

      <LogDonationModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        members={members}
        onSuccess={() => startTransition(() => router.refresh())}
      />
    </div>
  );
}
