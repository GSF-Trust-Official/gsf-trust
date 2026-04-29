"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Save, MessageCircle, Mail } from "lucide-react";

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

const CATEGORIES = [
  { value: "general",     label: "General Fund" },
  { value: "medical",     label: "Medical Assistance" },
  { value: "scholarship", label: "Scholarship" },
  { value: "emergency",   label: "Emergency Relief" },
] as const;

const MODES = [
  { value: "upi",  label: "UPI" },
  { value: "bank", label: "Bank Transfer" },
  { value: "cash", label: "Cash" },
];

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

interface SubmitResult {
  ok:             boolean;
  email_sent?:    boolean;
  whatsapp_text?: string;
  error?:         string;
}

export function LogDonationModal({ open, onOpenChange, members, onSuccess }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [, startTransition] = useTransition();
  const [loading,      setLoading]      = useState(false);
  const [whatsappText, setWhatsappText] = useState<string | null>(null);
  const [emailSent,    setEmailSent]    = useState(false);

  const [donorMode,  setDonorMode]  = useState<"member" | "external">("member");
  const [memberId,   setMemberId]   = useState("");
  const [donorName,  setDonorName]  = useState("");
  const [type,       setType]       = useState<"hadiya" | "zakat" | "other">("hadiya");
  const [category,   setCategory]   = useState("general");
  const [amount,     setAmount]     = useState("");
  const [date,       setDate]       = useState(today);
  const [mode,       setMode]       = useState("upi");
  const [reference,  setReference]  = useState("");

  useEffect(() => {
    if (open) {
      startTransition(() => {
        setDonorMode("member");
        setMemberId("");
        setDonorName("");
        setType("hadiya");
        setCategory("general");
        setAmount("");
        setDate(today);
        setMode("upi");
        setReference("");
        setWhatsappText(null);
        setEmailSent(false);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function handleTypeChange(newType: "hadiya" | "zakat" | "other") {
    setType(newType);
    if (newType === "zakat") setCategory("scholarship");
  }

  const selectedMember = members.find((m) => m.id === memberId);
  const effectiveDonorName =
    donorMode === "member" && selectedMember ? selectedMember.name : donorName;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (donorMode === "member" && !memberId) {
      toast.error("Please select a member");
      return;
    }
    if (donorMode === "external" && !donorName.trim()) {
      toast.error("Donor name is required");
      return;
    }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/donations", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          member_id:  donorMode === "member" ? memberId : undefined,
          donor_name: effectiveDonorName,
          type,
          category,
          amount: amt,
          date,
          mode,
          reference: reference.trim() || null,
          notes: null,
        }),
      });
      const data = await res.json() as SubmitResult;
      if (!res.ok) { toast.error(data.error ?? "Failed to log donation"); return; }

      if (data.email_sent) {
        setEmailSent(true);
        toast.success("Donation logged · Receipt emailed");
      } else {
        toast.success("Donation logged");
      }

      if (data.whatsapp_text) setWhatsappText(data.whatsapp_text);
      else { onOpenChange(false); onSuccess(); }
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
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

  // After save: show receipt panel
  if (whatsappText) {
    return (
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-lg rounded-xl" showCloseButton>
          <DialogHeader className="p-5 pb-3">
            <DialogTitle>Donation Logged</DialogTitle>
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
          <DialogTitle>Log Donation</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-5">
          {/* Donor mode toggle */}
          <div className="space-y-1.5">
            <Label>Donor</Label>
            <div className="flex rounded-lg overflow-hidden border border-outline-variant">
              <button
                type="button"
                onClick={() => setDonorMode("member")}
                className={cn(
                  "flex-1 py-2 text-sm font-medium transition-colors",
                  donorMode === "member"
                    ? "bg-primary text-white"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-high"
                )}
              >
                Foundation Member
              </button>
              <button
                type="button"
                onClick={() => setDonorMode("external")}
                className={cn(
                  "flex-1 py-2 text-sm font-medium transition-colors",
                  donorMode === "external"
                    ? "bg-primary text-white"
                    : "bg-surface-container text-on-surface-variant hover:bg-surface-high"
                )}
              >
                External Donor
              </button>
            </div>
          </div>

          {/* Member select or free-text name */}
          {donorMode === "member" ? (
            <div className="space-y-1.5">
              <Label>Member *</Label>
              <select
                className={selectClass}
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
              >
                <option value="" disabled>Select member…</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.code} — {m.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label>Donor Name *</Label>
              <Input
                className={fieldClass}
                placeholder="Full name of donor"
                value={donorName}
                onChange={(e) => setDonorName(e.target.value)}
              />
            </div>
          )}

          {/* Donation type */}
          <div className="space-y-1.5">
            <Label>Donation Type *</Label>
            <div className="flex gap-2">
              {(["hadiya", "zakat", "other"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTypeChange(t)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium transition-colors border capitalize",
                    type === t
                      ? t === "hadiya"
                        ? "bg-success text-white border-success"
                        : t === "zakat"
                        ? "bg-error text-white border-error"
                        : "bg-info text-white border-info"
                      : "bg-surface-container text-on-surface-variant border-transparent hover:border-outline-variant"
                  )}
                >
                  {t === "hadiya" ? "Hadiya" : t === "zakat" ? "Zakat" : "Other"}
                </button>
              ))}
            </div>
          </div>

          {/* Zakat restricted callout */}
          {type === "zakat" && (
            <div className="rounded-lg bg-error-container px-4 py-3 text-sm text-error">
              <span className="font-semibold">Restricted:</span> Zakat will be posted to the restricted Zakat account and can only be used for Scholarship.
            </div>
          )}

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <select
              className={selectClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              disabled={type === "zakat"}
            >
              {CATEGORIES.map((c) => (
                <option
                  key={c.value}
                  value={c.value}
                  disabled={type === "zakat" && c.value !== "scholarship"}
                >
                  {c.label}
                </option>
              ))}
            </select>
            {type === "zakat" && (
              <p className="text-xs text-on-surface-variant">Zakat can only fund Scholarship payouts</p>
            )}
          </div>

          {/* Amount + Date */}
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
              <Label>Date *</Label>
              <Input
                className={fieldClass}
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
          </div>

          {/* Payment mode */}
          <div className="space-y-1.5">
            <Label>Payment Mode *</Label>
            <select
              className={selectClass}
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              {MODES.map((m) => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          {/* Reference */}
          <div className="space-y-1.5">
            <Label>Reference <span className="font-normal text-on-surface-variant">(optional)</span></Label>
            <Input
              className={fieldClass}
              placeholder="Transaction ID, cheque no…"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" size="lg" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="lg" className="h-11 gap-2 px-4" disabled={loading}>
              <Save className="size-4" />
              {loading ? "Saving…" : "Log Donation"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
