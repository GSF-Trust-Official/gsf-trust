"use client";

import { useState } from "react";
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

const fieldClass = "h-10 border-0 bg-surface-container px-3 text-sm shadow-none focus-visible:bg-white";
const selectClass = cn(
  fieldClass,
  "w-full rounded-lg outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
);

interface Props {
  open:            boolean;
  onOpenChange:    (v: boolean) => void;
  onSuccess:       () => void;
  defaultType?:    "credit" | "debit";
}

export function LogInterestModal({ open, onOpenChange, onSuccess, defaultType = "credit" }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [loading,     setLoading]     = useState(false);
  const [type,        setType]        = useState<"credit" | "debit">(defaultType);
  const [description, setDescription] = useState("");
  const [amount,      setAmount]      = useState("");
  const [date,        setDate]        = useState(today);
  const [reference,   setReference]   = useState("");

  const category = type === "credit" ? "Bank Interest" : "Distribution to Poor";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) { toast.error("Description is required"); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/ledger/interest", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          category,
          description: description.trim(),
          amount: amt,
          date,
          reference: reference.trim() || null,
          notes: null,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed to log entry"); return; }
      toast.success(type === "credit" ? "Bank interest logged" : "Distribution logged");
      onOpenChange(false);
      onSuccess();
      setDescription(""); setAmount(""); setDate(today); setReference("");
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-xl" showCloseButton>
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>Log Interest Transaction</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-5">
          {/* Type */}
          <div className="space-y-1.5">
            <Label>Transaction Type *</Label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setType("credit")}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition-colors border",
                  type === "credit"
                    ? "bg-success text-white border-success"
                    : "bg-surface-container text-on-surface-variant border-transparent hover:border-outline-variant"
                )}
              >
                Bank Interest Received
              </button>
              <button
                type="button"
                onClick={() => setType("debit")}
                className={cn(
                  "flex-1 py-2 rounded-lg text-sm font-medium transition-colors border",
                  type === "debit"
                    ? "bg-warning text-white border-warning"
                    : "bg-surface-container text-on-surface-variant border-transparent hover:border-outline-variant"
                )}
              >
                Distribute to Poor
              </button>
            </div>
            <p className="text-xs text-on-surface-variant">
              {type === "credit"
                ? "Records bank savings account interest credited."
                : "Records distribution of interest funds to eligible recipients."}
            </p>
          </div>

          {/* Category — auto-filled, shown read-only */}
          <div className="space-y-1.5">
            <Label>Category</Label>
            <div className="h-10 bg-surface-container rounded-lg px-3 flex items-center text-sm text-on-surface-variant">
              {category}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Input
              className={fieldClass}
              placeholder={type === "credit" ? "e.g. April 2026 savings interest" : "e.g. Distribution to poor — May 2026"}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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

          {/* Reference */}
          <div className="space-y-1.5">
            <Label>Reference <span className="font-normal text-on-surface-variant">(optional)</span></Label>
            <Input
              className={fieldClass}
              placeholder="Bank statement ref, receipt no…"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" size="lg" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="lg" className="h-11 gap-2 px-4" disabled={loading}>
              <Save className="size-4" />
              {loading ? "Saving…" : "Save Entry"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
