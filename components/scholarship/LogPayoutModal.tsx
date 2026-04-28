"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const fieldClass =
  "h-10 border-0 bg-surface-container px-3 text-sm shadow-none focus-visible:bg-white";
const selectClass = cn(
  fieldClass,
  "w-full rounded-lg outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
);

interface Props {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  members:      Array<{ id: string; code: string; name: string }>;
  onSuccess:    () => void;
}

export function LogPayoutModal({ open, onOpenChange, members, onSuccess }: Props) {
  const today      = new Date().toISOString().slice(0, 10);
  const currentYear = new Date().getFullYear();
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const [donorMode,         setDonorMode]         = useState<"member" | "external">("member");
  const [memberId,          setMemberId]           = useState("");
  const [beneficiaryName,   setBeneficiaryName]   = useState("");
  const [academicYear,      setAcademicYear]       = useState(`${currentYear - 1}-${currentYear}`);
  const [amount,            setAmount]             = useState("");
  const [paidOn,            setPaidOn]             = useState(today);
  const [eligibilityNotes,  setEligibilityNotes]  = useState("");

  useEffect(() => {
    if (open) {
      startTransition(() => {
        setDonorMode("member"); setMemberId(""); setBeneficiaryName("");
        setAcademicYear(`${currentYear - 1}-${currentYear}`);
        setAmount(""); setPaidOn(today); setEligibilityNotes("");
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const selectedMember = members.find((m) => m.id === memberId);
  const effectiveName  = donorMode === "member" && selectedMember ? selectedMember.name : beneficiaryName;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (donorMode === "member" && !memberId) { toast.error("Please select a member"); return; }
    if (donorMode === "external" && !beneficiaryName.trim()) { toast.error("Beneficiary name is required"); return; }
    if (!academicYear.trim()) { toast.error("Academic year is required"); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/scholarship", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beneficiary_name:  effectiveName,
          member_id:         donorMode === "member" ? memberId : undefined,
          academic_year:     academicYear.trim(),
          amount:            amt,
          eligibility_notes: eligibilityNotes.trim() || undefined,
          paid_on:           paidOn,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed to log payout"); return; }
      toast.success("Scholarship payout logged");
      onOpenChange(false);
      onSuccess();
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-xl" showCloseButton>
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>Log Scholarship Payout</DialogTitle>
        </DialogHeader>

        <div className="rounded-lg bg-error-container px-4 py-2.5 mx-5 text-sm text-error">
          <span className="font-semibold">Zakat restricted:</span> Payout will deduct from the Zakat account.
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-5 pt-1">
          {/* Beneficiary toggle */}
          <div className="space-y-1.5">
            <Label>Beneficiary</Label>
            <div className="flex rounded-lg overflow-hidden border border-outline-variant">
              {(["member", "external"] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setDonorMode(mode)}
                  className={cn(
                    "flex-1 py-2 text-sm font-medium transition-colors",
                    donorMode === mode
                      ? "bg-primary text-white"
                      : "bg-surface-container text-on-surface-variant hover:bg-surface-high"
                  )}
                >
                  {mode === "member" ? "Foundation Member" : "External Beneficiary"}
                </button>
              ))}
            </div>
          </div>

          {donorMode === "member" ? (
            <div className="space-y-1.5">
              <Label>Member *</Label>
              <select className={selectClass} value={memberId} onChange={(e) => setMemberId(e.target.value)}>
                <option value="" disabled>Select member…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>{m.code} — {m.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Beneficiary Name *</Label>
              <Input
                className={fieldClass}
                placeholder="Full name"
                value={beneficiaryName}
                onChange={(e) => setBeneficiaryName(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Academic Year *</Label>
            <Input
              className={fieldClass}
              placeholder="e.g. 2024-2025"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (₹) *</Label>
              <Input
                className={fieldClass}
                type="number"
                min="1"
                step="0.01"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Date Paid *</Label>
              <Input
                className={fieldClass}
                type="date"
                value={paidOn}
                onChange={(e) => setPaidOn(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Eligibility Notes <span className="font-normal text-on-surface-variant">(optional)</span></Label>
            <textarea
              className="h-16 rounded-lg w-full resize-none py-2 border-0 bg-surface-container px-3 text-sm shadow-none"
              placeholder="Eligibility criteria met, supporting documents…"
              value={eligibilityNotes}
              onChange={(e) => setEligibilityNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" size="lg" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="lg" className="h-11 gap-2 px-4" disabled={loading}>
              <Save className="size-4" />
              {loading ? "Saving…" : "Log Payout"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
