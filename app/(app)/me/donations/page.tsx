"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import type { Donation } from "@/types";

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}
function fmtINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

const TYPE_CHIP: Record<string, string> = {
  hadiya: "bg-success-container text-success",
  zakat:  "bg-error-container text-error",
  other:  "bg-info-container text-info",
};

export default function MeDonationsPage() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/me/donations")
      .then((r) => r.json())
      .then((d: { donations?: Donation[] }) => setDonations(d.donations ?? []))
      .catch(() => toast.error("Failed to load donations"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <p className="text-sm text-on-surface-variant">Loading…</p>;

  const total = donations.reduce((sum, d) => sum + d.amount, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-bold text-on-surface">Donation History</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">
          {donations.length} donation{donations.length !== 1 ? "s" : ""} · Total: {fmtINR(total)}
        </p>
      </div>

      {donations.length === 0 ? (
        <p className="text-sm text-on-surface-variant">No donation records found.</p>
      ) : (
        <div className="space-y-2">
          {donations.map((d) => (
            <div key={d.id} className="rounded-xl border border-outline-variant bg-white p-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${TYPE_CHIP[d.type] ?? ""}`}>
                  {d.type}
                </span>
                <div>
                  <p className="text-sm font-medium text-on-surface">{fmtINR(d.amount)}</p>
                  <p className="text-xs text-on-surface-variant capitalize">
                    {d.category} · {d.mode ?? "—"} · {fmtDate(d.date)}
                  </p>
                </div>
              </div>
              {d.reference && (
                <p className="text-xs text-on-surface-variant font-mono shrink-0">{d.reference}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
