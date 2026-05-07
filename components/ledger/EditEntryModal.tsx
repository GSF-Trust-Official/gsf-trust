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
import type { LedgerRow, LedgerAccount } from "@/lib/queries/ledger";

const fieldClass = "h-10 border-0 bg-surface-container px-3 text-sm shadow-none focus-visible:bg-white";
const selectClass = cn(
  fieldClass,
  "w-full rounded-lg outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
);

interface Props {
  open:         boolean;
  entry:        LedgerRow;
  account:      LedgerAccount;
  categories:   readonly string[];
  onOpenChange: (v: boolean) => void;
  onSuccess:    () => void;
}

export function EditEntryModal({ open, entry, account, categories, onOpenChange, onSuccess }: Props) {
  const [loading,     setLoading]     = useState(false);
  const [category,    setCategory]    = useState(entry.category);
  const [description, setDescription] = useState(entry.description);
  const [amount,      setAmount]      = useState(String(Math.abs(entry.amount)));
  const [date,        setDate]        = useState(entry.date);
  const [reference,   setReference]   = useState(entry.reference ?? "");
  const [notes,       setNotes]       = useState(entry.notes ?? "");
  const [, startTransition] = useTransition();

  // Sync form fields when a different entry is opened
  useEffect(() => {
    if (open) {
      startTransition(() => {
        setCategory(entry.category);
        setDescription(entry.description);
        setAmount(String(Math.abs(entry.amount)));
        setDate(entry.date);
        setReference(entry.reference ?? "");
        setNotes(entry.notes ?? "");
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, entry.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) { toast.error("Please select a category"); return; }
    if (!description.trim()) { toast.error("Description is required"); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }

    setLoading(true);
    try {
      const res = await fetch(`/api/ledger/${entry.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          description: description.trim(),
          amount: amt,
          date,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed to update entry"); return; }
      toast.success("Entry updated");
      onOpenChange(false);
      onSuccess();
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  }

  const isCredit = entry.amount >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-xl" showCloseButton>
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>Edit Entry</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-5">
          {/* Account — read only */}
          <div className="space-y-1.5">
            <Label>Account</Label>
            <div className="h-10 bg-surface-container rounded-lg px-3 flex items-center text-sm text-on-surface-variant capitalize">
              {account} — {isCredit ? "Inflow" : "Outflow"} (cannot change)
            </div>
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label>Category *</Label>
            <select className={selectClass} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="" disabled>Select category…</option>
              {categories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Description *</Label>
            <Input
              className={fieldClass}
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
                min="0.01"
                step="0.01"
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
              placeholder="Voucher no., ref…"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label>Notes <span className="font-normal text-on-surface-variant">(optional)</span></Label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Reason for edit, correction notes…"
              className="w-full rounded-lg bg-surface-container border-0 px-3 py-2 text-sm placeholder:text-on-surface-variant/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" size="lg" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="lg" className="h-11 gap-2 px-4" disabled={loading}>
              <Save className="size-4" />
              {loading ? "Saving…" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
