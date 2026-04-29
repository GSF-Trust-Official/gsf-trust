"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Save, MessageCircle, Mail } from "lucide-react";

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

interface SubmitResult {
  ok:            boolean;
  email_sent?:   boolean;
  whatsapp_text?: string;
  error?:        string;
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
  const [, startTransition] = useTransition();
  const [whatsappText, setWhatsappText] = useState<string | null>(null);
  const [emailSent,    setEmailSent]    = useState(false);

  const [memberId,  setMemberId]  = useState(defaults.memberId ?? "");
  const [month,     setMonth]     = useState(String(defaults.month));
  const [year,      setYear]      = useState(String(defaults.year));
  const [amount,    setAmount]    = useState("300");
  const [paidDate,  setPaidDate]  = useState(today);
  const [mode,      setMode]      = useState("upi");
  const [reference, setReference] = useState("");

  useEffect(() => {
    if (open) {
      startTransition(() => {
        setMemberId(defaults.memberId ?? "");
        setMonth(String(defaults.month));
        setYear(String(defaults.year));
        setAmount("300");
        setPaidDate(today);
        setMode("upi");
        setReference("");
        setWhatsappText(null);
        setEmailSent(false);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaults.memberId, defaults.month, defaults.year]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!memberId) { toast.error("Please select a member"); return; }

    setLoading(true);
    try {
      const res  = await fetch("/api/subscriptions", {
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
      const data = (await res.json()) as SubmitResult;
      if (!res.ok) { toast.error(data.error ?? "Failed to log subscription"); return; }

      if (data.email_sent) {
        setEmailSent(true);
        toast.success("Subscription logged · Receipt emailed");
      } else {
        toast.success("Subscription logged");
      }

      if (data.whatsapp_text) setWhatsappText(data.whatsapp_text);
      else { onOpenChange(false); onSuccess(); }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function copyWhatsApp() {
    if (!whatsappText) return;
    navigator.clipboard.writeText(whatsappText).then(() => {
      toast.success("Receipt copied — paste into WhatsApp");
    });
  }

  function handleClose() {
    onOpenChange(false);
    if (whatsappText) onSuccess();
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear + 1, currentYear, currentYear - 1, currentYear - 2];

  // After save: show receipt action panel
  if (whatsappText) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg rounded-xl" showCloseButton>
          <DialogHeader className="p-5 pb-3">
            <DialogTitle>Subscription Logged</DialogTitle>
          </DialogHeader>
          <div className="px-5 pb-5 space-y-4">
            {emailSent && (
              <div className="flex items-center gap-2 rounded-lg bg-success-container/30 border border-success/20 p-3 text-sm text-success font-medium">
                <Mail className="size-4" />
                Receipt emailed to member
              </div>
            )}
            <div className="rounded-lg bg-surface-container p-3">
              <p className="text-xs text-on-surface-variant mb-2 font-semibold uppercase tracking-wide">WhatsApp receipt text</p>
              <pre className="text-xs text-on-surface whitespace-pre-wrap font-mono">{whatsappText}</pre>
            </div>
            <div className="flex gap-3">
              <Button onClick={copyWhatsApp} className="gap-2 flex-1">
                <MessageCircle className="size-4" />
                Copy for WhatsApp
              </Button>
              <Button variant="outline" onClick={handleClose}>Done</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

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
