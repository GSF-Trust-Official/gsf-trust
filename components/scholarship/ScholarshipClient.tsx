"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  PlusCircle, ChevronLeft, ChevronRight,
  Megaphone, ExternalLink, Calendar, Phone,
} from "lucide-react";

import { formatINR, formatDate, cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { canWrite } from "@/lib/roles";
import type { UserRole, ScholarshipAnnouncement } from "@/types";
import type { ScholarshipPage } from "@/lib/queries/scholarshipPayouts";
import { LogPayoutModal } from "./LogPayoutModal";
import { ManageAnnouncementModal } from "./ManageAnnouncementModal";

function getDrivePreviewUrl(shareUrl: string): string {
  const match = shareUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? `https://drive.google.com/file/d/${match[1]}/preview` : shareUrl;
}

interface Props {
  initialData:   ScholarshipPage;
  announcement:  ScholarshipAnnouncement | null;
  members:       Array<{ id: string; code: string; name: string }>;
  role:          UserRole;
  academicYear:  string;
}

export function ScholarshipClient({
  initialData, announcement, members, role,
  academicYear: initYear,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [payoutOpen,  setPayoutOpen]  = useState(false);
  const [manageOpen,  setManageOpen]  = useState(false);
  const [localYear,   setLocalYear]   = useState(initYear);
  const [tab,         setTab]         = useState<"payouts" | "announcement">("payouts");

  const { entries, total, page, pageSize, totalPaid } = initialData;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function buildUrl(newPage: number, yr = initYear) {
    const p = new URLSearchParams();
    if (yr) p.set("academicYear", yr);
    p.set("page", String(newPage));
    return `/scholarship?${p.toString()}`;
  }

  function applyYear() {
    startTransition(() => router.push(buildUrl(1, localYear)));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-headline font-bold text-on-surface">Scholarship</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">Zakat-funded scholarship payouts and announcements</p>
        </div>
        {canWrite(role) && (
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={() => setManageOpen(true)}>
              <Megaphone className="size-4" />
              Manage Announcement
            </Button>
            <Button className="gap-2" onClick={() => setPayoutOpen(true)}>
              <PlusCircle className="size-4" />
              Log Payout
            </Button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant">
        {(["payouts", "announcement"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize",
              tab === t
                ? "border-primary text-primary"
                : "border-transparent text-on-surface-variant hover:text-on-surface"
            )}
          >
            {t === "payouts" ? "Payouts" : "Announcement"}
          </button>
        ))}
      </div>

      {/* Payouts tab */}
      {tab === "payouts" && (
        <>
          {/* KPI */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="rounded-xl p-4 bg-error-container">
              <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">Total Paid Out</p>
              <p className="text-xl font-headline font-bold text-on-surface">{formatINR(totalPaid)}</p>
            </div>
            <div className="rounded-xl p-4 bg-surface-container">
              <p className="text-xs font-medium text-on-surface-variant uppercase tracking-wider mb-1">Payouts</p>
              <p className="text-xl font-headline font-bold text-on-surface">{total}</p>
            </div>
          </div>

          {/* Filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <label className="text-sm text-on-surface-variant">Academic Year:</label>
            <Input
              className="h-9 w-36 border-0 bg-surface-container px-3 text-sm shadow-none"
              placeholder="e.g. 2024-2025"
              value={localYear}
              onChange={(e) => setLocalYear(e.target.value)}
            />
            <Button size="sm" onClick={applyYear}>Filter</Button>
            {initYear && (
              <Button size="sm" variant="ghost" onClick={() => {
                setLocalYear("");
                startTransition(() => router.push("/scholarship"));
              }}>Clear</Button>
            )}
          </div>

          {/* Table */}
          <div className="rounded-xl border border-outline-variant bg-white">
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-on-surface-variant border-b border-outline-variant">
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                    <th className="text-left px-4 py-3 font-medium">Beneficiary</th>
                    <th className="text-left px-4 py-3 font-medium">Academic Year</th>
                    <th className="text-left px-4 py-3 font-medium">Eligibility Notes</th>
                    <th className="text-right px-4 py-3 font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-4 py-12 text-center text-on-surface-variant text-sm">
                        No payouts found
                      </td>
                    </tr>
                  )}
                  {entries.map((row) => (
                    <tr key={row.id} className="border-b border-outline-variant/50 hover:bg-surface-low transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-on-surface-variant">{formatDate(row.paid_on)}</td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-on-surface">{row.beneficiary_name}</p>
                        {row.member_code && (
                          <p className="text-xs text-on-surface-variant font-mono">{row.member_code}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-on-surface-variant">{row.academic_year}</td>
                      <td className="px-4 py-3 text-xs text-on-surface-variant max-w-xs truncate">
                        {row.eligibility_notes ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-medium text-error">
                        − {formatINR(row.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-outline-variant/50">
              {entries.length === 0 && (
                <p className="px-4 py-12 text-center text-on-surface-variant text-sm">No payouts found</p>
              )}
              {entries.map((row) => (
                <div key={row.id} className="px-4 py-4 space-y-1">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <p className="font-medium text-on-surface text-sm">{row.beneficiary_name}</p>
                      <p className="text-xs text-on-surface-variant">{row.academic_year}</p>
                    </div>
                    <p className="text-error font-mono font-semibold text-sm shrink-0">− {formatINR(row.amount)}</p>
                  </div>
                  {row.eligibility_notes && (
                    <p className="text-xs text-on-surface-variant">{row.eligibility_notes}</p>
                  )}
                  <p className="text-xs text-on-surface-variant font-mono">{formatDate(row.paid_on)}</p>
                </div>
              ))}
            </div>

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
        </>
      )}

      {/* Announcement tab */}
      {tab === "announcement" && (
        <div className="space-y-4">
          {!announcement ? (
            <div className="rounded-xl border border-outline-variant bg-white px-8 py-16 text-center space-y-3">
              <Megaphone className="size-10 mx-auto text-on-surface-variant opacity-40" />
              <p className="text-on-surface-variant">No active scholarship announcement at this time.</p>
              {canWrite(role) && (
                <Button onClick={() => setManageOpen(true)} className="gap-2">
                  <PlusCircle className="size-4" />
                  Create Announcement
                </Button>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-outline-variant bg-white p-6 space-y-5">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <h2 className="text-xl font-headline font-bold text-on-surface">{announcement.title}</h2>
                {canWrite(role) && (
                  <Button variant="outline" size="sm" onClick={() => setManageOpen(true)}>Edit</Button>
                )}
              </div>

              <p className="text-sm text-on-surface whitespace-pre-wrap">{announcement.description}</p>

              {announcement.eligibility_criteria && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Eligibility</p>
                  <p className="text-sm text-on-surface whitespace-pre-wrap">{announcement.eligibility_criteria}</p>
                </div>
              )}

              <div className="flex flex-wrap gap-4 text-sm text-on-surface-variant">
                {announcement.deadline && (
                  <span className="flex items-center gap-1.5">
                    <Calendar className="size-3.5" />
                    Deadline: {formatDate(announcement.deadline)}
                  </span>
                )}
                {announcement.contact && (
                  <span className="flex items-center gap-1.5">
                    <Phone className="size-3.5" />
                    {announcement.contact}
                  </span>
                )}
              </div>

              {/* Poster embed */}
              {announcement.poster_drive_url && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-on-surface-variant">Poster</p>
                  <iframe
                    src={getDrivePreviewUrl(announcement.poster_drive_url)}
                    className="w-full aspect-[3/4] rounded-lg border border-outline-variant"
                    allow="autoplay"
                    title="Scholarship Poster"
                  />
                  <a
                    href={announcement.poster_drive_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    Open poster in Drive <ExternalLink className="size-3" />
                  </a>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {announcement.form_url && (
                  <a
                    href={announcement.form_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-container transition-colors"
                  >
                    Apply Now <ExternalLink className="size-3.5" />
                  </a>
                )}
                {announcement.documents_drive_url && (
                  <a
                    href={announcement.documents_drive_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant text-sm font-medium text-on-surface hover:bg-surface-container transition-colors"
                  >
                    Supporting Documents <ExternalLink className="size-3.5" />
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      <LogPayoutModal
        open={payoutOpen}
        onOpenChange={setPayoutOpen}
        members={members}
        onSuccess={() => startTransition(() => router.refresh())}
      />

      <ManageAnnouncementModal
        open={manageOpen}
        onOpenChange={setManageOpen}
        existing={announcement}
        onSuccess={() => startTransition(() => router.refresh())}
      />
    </div>
  );
}
