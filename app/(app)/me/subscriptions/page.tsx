"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Subscription } from "@/types";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

const STATUS_CHIP: Record<string, string> = {
  paid: "bg-primary-fixed text-on-primary-fixed-variant",
  due:  "bg-warning-container text-[#4d3600]",
  na:   "bg-info-container text-[#003b52]",
};
const STATUS_LABEL: Record<string, string> = { paid: "Paid", due: "Due", na: "N/A" };

export default function MeSubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/me/subscriptions")
      .then((r) => r.json())
      .then((d: { subscriptions?: Subscription[] }) => setSubs(d.subscriptions ?? []))
      .catch(() => toast.error("Failed to load subscriptions"))
      .finally(() => setLoading(false));
  }, []);

  async function downloadReceipt(sub: Subscription) {
    setDownloading(sub.id);
    try {
      const res = await fetch(`/api/me/receipts/${sub.id}`);
      if (!res.ok) { toast.error("Could not generate receipt"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `gsf-receipt-${sub.year}-${String(sub.month).padStart(2, "0")}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Failed to download receipt");
    } finally {
      setDownloading(null);
    }
  }

  if (loading) return <p className="text-sm text-on-surface-variant">Loading…</p>;

  const totalPaid = subs.filter((s) => s.status === "paid").reduce((sum, s) => sum + (s.amount ?? 300), 0);
  const dueCount  = subs.filter((s) => s.status === "due").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-bold text-on-surface">Subscription History</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">
          {subs.filter((s) => s.status === "paid").length} paid · {dueCount} due ·&nbsp;
          Total paid: {fmtINR(totalPaid)}
        </p>
      </div>

      {subs.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No subscription records found.</p>
      ) : (
        <div className="space-y-2">
          {subs.map((sub) => (
            <div
              key={sub.id}
              className="rounded-xl border border-outline-variant bg-white p-4 flex items-center justify-between gap-4"
            >
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_CHIP[sub.status] ?? ""}`}>
                  {STATUS_LABEL[sub.status] ?? sub.status}
                </span>
                <div>
                  <p className="text-sm font-medium text-on-surface">
                    {MONTHS[(sub.month ?? 1) - 1]} {sub.year}
                  </p>
                  {sub.status === "paid" && (
                    <p className="text-xs text-on-surface-variant">
                      {fmtINR(sub.amount ?? 300)} · {sub.mode?.toUpperCase() ?? "—"} · {fmtDate(sub.paid_date)}
                    </p>
                  )}
                </div>
              </div>
              {sub.status === "paid" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 shrink-0"
                  disabled={downloading === sub.id}
                  onClick={() => downloadReceipt(sub)}
                >
                  <Download className="size-3.5" />
                  {downloading === sub.id ? "…" : "Receipt"}
                </Button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
