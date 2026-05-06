"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Users, Check, X, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RegistrationRequest, Member } from "@/types";

interface Props { members: Member[] }

type StatusFilter = "pending" | "approved" | "rejected";

export function RegistrationRequestsPanel({ members }: Props) {
  const [requests,     setRequests]     = useState<RegistrationRequest[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [filter,       setFilter]       = useState<StatusFilter>("pending");
  const [loading,      setLoading]      = useState(true);
  const [acting,       setActing]       = useState<string | null>(null);
  const [expanded,     setExpanded]     = useState<string | null>(null);
  const [linkMap,      setLinkMap]      = useState<Record<string, string>>({});
  const [rejectReason, setRejectReason] = useState<Record<string, string>>({});
  // Incrementing this triggers a re-fetch without changing filter.
  const [refreshKey,   setRefreshKey]   = useState(0);

  // Fetch runs when filter or refreshKey changes. setLoading(true) is always
  // called from event handlers (changeFilter / refresh) so the effect body
  // itself never calls setState synchronously.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/registrations?status=${filter}`)
      .then((r) => r.json() as Promise<{ requests: RegistrationRequest[]; pending_count: number }>)
      .then((data) => {
        if (cancelled) return;
        setRequests(data.requests ?? []);
        setPendingCount(data.pending_count ?? 0);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("Failed to load registrations");
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, [filter, refreshKey]);

  function changeFilter(f: StatusFilter) {
    setLoading(true);
    setFilter(f);
  }

  function refresh() {
    setLoading(true);
    setRefreshKey((k) => k + 1);
  }

  async function approve(id: string) {
    setActing(id);
    try {
      const res  = await fetch(`/api/admin/registrations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", linked_member_id: linkMap[id] || undefined }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
      toast.success("Approved — invite email sent");
      refresh();
    } catch { toast.error("Something went wrong"); }
    finally { setActing(null); }
  }

  async function reject(id: string) {
    setActing(id);
    try {
      const res  = await fetch(`/api/admin/registrations/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejection_reason: rejectReason[id] || undefined }),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed"); return; }
      toast.success("Registration rejected");
      refresh();
    } catch { toast.error("Something went wrong"); }
    finally { setActing(null); }
  }

  const fmtDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  return (
    <section className="rounded-xl border border-outline-variant bg-white p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="size-4 text-primary" />
          <h2 className="text-base font-semibold text-on-surface">
            Pending Registrations
            {pendingCount > 0 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-error px-2 py-0.5 text-xs font-semibold text-white">
                {pendingCount}
              </span>
            )}
          </h2>
        </div>
        <div className="flex gap-1">
          {(["pending", "approved", "rejected"] as StatusFilter[]).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => changeFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition-colors ${
                filter === s
                  ? "bg-primary text-white"
                  : "bg-surface-container text-on-surface-variant hover:bg-surface-high"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <p className="text-sm text-on-surface-variant">Loading…</p>
      ) : requests.length === 0 ? (
        <p className="text-sm text-on-surface-variant">
          No {filter} requests.
        </p>
      ) : (
        <div className="space-y-3">
          {requests.map((r) => (
            <div key={r.id} className="rounded-lg border border-outline-variant overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-surface-container transition-colors"
                onClick={() => setExpanded(expanded === r.id ? null : r.id)}
              >
                <div>
                  <p className="text-sm font-medium text-on-surface">{r.name}</p>
                  <p className="text-xs text-on-surface-variant">{r.email} · {fmtDate(r.created_at)}</p>
                </div>
                {expanded === r.id ? <ChevronUp className="size-4 text-on-surface-variant" /> : <ChevronDown className="size-4 text-on-surface-variant" />}
              </button>

              {expanded === r.id && (
                <div className="px-4 pb-4 space-y-3 border-t border-outline-variant pt-3">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {r.phone      && <div><span className="text-on-surface-variant text-xs">Phone</span><p>{r.phone}</p></div>}
                    {r.member_code && <div><span className="text-on-surface-variant text-xs">Member Code</span><p className="font-mono">{r.member_code}</p></div>}
                    {r.message    && <div className="col-span-2"><span className="text-on-surface-variant text-xs">Message</span><p className="mt-0.5 text-on-surface">{r.message}</p></div>}
                  </div>

                  {filter === "pending" && (
                    <div className="space-y-3 pt-1">
                      <div className="space-y-1">
                        <label className="text-xs text-on-surface-variant">Link to member (optional)</label>
                        <select
                          className="w-full rounded-lg bg-surface-container border-0 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                          value={linkMap[r.id] ?? ""}
                          onChange={(e) => setLinkMap((prev) => ({ ...prev, [r.id]: e.target.value }))}
                        >
                          <option value="">— No member link —</option>
                          {members.filter((m) => m.status === "active").map((m) => (
                            <option key={m.id} value={m.id}>{m.code} — {m.name}</option>
                          ))}
                        </select>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          className="gap-1.5 flex-1"
                          disabled={acting === r.id}
                          onClick={() => { void approve(r.id); }}
                        >
                          <Check className="size-3.5" />
                          Approve & Invite
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 flex-1 border-error text-error hover:bg-error-container"
                          disabled={acting === r.id}
                          onClick={() => { void reject(r.id); }}
                        >
                          <X className="size-3.5" />
                          Reject
                        </Button>
                      </div>

                      <div className="space-y-1">
                        <label className="text-xs text-on-surface-variant">Rejection reason (optional, sent to applicant)</label>
                        <input
                          type="text"
                          placeholder="e.g. Could not verify membership…"
                          value={rejectReason[r.id] ?? ""}
                          onChange={(e) => setRejectReason((prev) => ({ ...prev, [r.id]: e.target.value }))}
                          className="w-full rounded-lg bg-surface-container border-0 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                    </div>
                  )}

                  {filter !== "pending" && (
                    <div className="text-xs text-on-surface-variant space-y-1">
                      <p>Reviewed: {r.reviewed_at ? fmtDate(r.reviewed_at) : "—"}</p>
                      {r.rejection_reason && <p>Reason: {r.rejection_reason}</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
