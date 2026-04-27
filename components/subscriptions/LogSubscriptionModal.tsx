"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const fieldClass =
  "h-10 border-0 bg-surface-container px-3 text-sm shadow-none focus-visible:bg-white";
const selectClass = cn(
  fieldClass,
  "w-full rounded-lg outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
);

export interface LogSubDefaults {
  memberId?: string;
  month:     number;
  year:      number;
}

interface Props {
  open:          boolean;
  onOpenChange:  (v: boolean) => void;
  members:       Array<{ id: string; code: string; name: string }>;
  defaults:      LogSubDefaults;
  onSuccess:     () => void;
}

export function LogSubscriptionModal({
  open,
  onOpenChange,
  members,
  defaults,
  onSuccess,
}: Props) {
  const today     = new Date().toISOString().slice(0, 10);
  const [loading, setLoading] = useState(false);

  // Controlled form state so defaults can change when clicking different cells
  const [memberId,  setMemberId]  = useState(defaults.memberId ?? "");
  const [month,     setMonth]     = useState(String(defaults.month));
  const [year,      setYear]      = useState(String(defaults.year));
  const [amount,    setAmount]    = useState("300");
  const [paidDate,  setPaidDate]  = useState(today);
  const [mode,      setMode]      = useState("upi");
  const [reference, setReference] = useState("");

  // Sync defaults whenever the modal opens with new pre-fill values
  useEffect(() => {
    if (open) {
      setMemberId(defaults.memberId ?? "");
      setMonth(String(defaults.month));
      setYear(String(defaults.year));
      setAmount("300");
      setPaidDate(today);
      setMode("upi");
      setReference("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaults.memberId, defaults.month, defaults.year]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId) { toast.error("Please select a member"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id: memberId,
          month:     parseInt(month, 10),
          year:      parseInt(year, 10),
          amount:    parseFloat(amount),
          paid_date: paidDate,
          mode,
          reference: reference || null,
          notes:     null,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed to log subscription"); return; }
      toast.success("Subscription logged");
      onOpenChange(false);
      onSuccess();
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-xl" showCloseButton>
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>Log Subscription</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-5">
          {/* Member */}
          <div className="space-y-1.5">
            <Label>Member *</Label>
            <select
              className={selectClass}
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
            >
              <option value="" disabled>Select member...</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} — {m.name}
                </option>
              ))}
            </select>
          </div>

          {/* Month + Year */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Month *</Label>
              <select
                className={selectClass}
                value={month}
                onChange={(e) => setMonth(e.target.value)}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={String(i + 1)}>{m}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Year *</Label>
              <select
                className={selectClass}
                value={year}
                onChange={(e) => setYear(e.target.value)}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>{y}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Amount + Date */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount (₹) *</Label>
              <Input
                className={fieldClass}
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Payment Date *</Label>
              <Input
                className={fieldClass}
                type="date"
                value={paidDate}
                onChange={(e) => setPaidDate(e.target.value)}
              />
            </div>
          </div>

          {/* Mode */}
          <div className="space-y-1.5">
            <Label>Payment Mode *</Label>
            <select
              className={selectClass}
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="upi">UPI</option>
              <option value="bank">Bank Transfer</option>
              <option value="cash">Cash</option>
            </select>
          </div>

          {/* Reference */}
          <div className="space-y-1.5">
            <Label>Reference <span className="font-normal text-on-surface-variant">(optional)</span></Label>
            <Input
              className={fieldClass}
              placeholder="Transaction ID, cheque no..."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" size="lg" className="h-11 gap-2 px-4" disabled={loading}>
              <Save className="size-4" />
              {loading ? "Saving..." : "Log Subscription"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
