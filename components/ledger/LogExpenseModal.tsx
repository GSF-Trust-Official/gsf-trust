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
import { GENERAL_CATEGORIES, ZAKAT_CATEGORIES } from "@/lib/validators/ledger";

const fieldClass = "h-10 border-0 bg-surface-container px-3 text-sm shadow-none focus-visible:bg-white";
const selectClass = cn(
  fieldClass,
  "w-full rounded-lg outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
);

interface Props {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess:    () => void;
}

export function LogExpenseModal({ open, onOpenChange, onSuccess }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [loading,     setLoading]     = useState(false);
  const [account,     setAccount]     = useState<"general" | "zakat">("general");
  const [category,    setCategory]    = useState("");
  const [description, setDescription] = useState("");
  const [amount,      setAmount]      = useState("");
  const [date,        setDate]        = useState(today);
  const [reference,   setReference]   = useState("");

  const categories = account === "zakat" ? ZAKAT_CATEGORIES : GENERAL_CATEGORIES;

  function handleAccountChange(val: "general" | "zakat") {
    setAccount(val);
    setCategory(""); // reset when account type changes
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!category) { toast.error("Please select a category"); return; }
    if (!description.trim()) { toast.error("Description is required"); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/ledger/expense", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          account,
          category,
          description: description.trim(),
          amount: amt,
          date,
          reference: reference.trim() || null,
          notes: null,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed to log expense"); return; }
      toast.success("Expense logged");
      onOpenChange(false);
      onSuccess();
      // reset form
      setAccount("general"); setCategory(""); setDescription(""); setAmount(""); setDate(today); setReference("");
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-xl" showCloseButton>
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>Log Expense</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-5">
          {/* Account */}
          <div className="space-y-1.5">
            <Label>Account *</Label>
            <div className="flex gap-2">
              {(["general", "zakat"] as const).map((acc) => (
                <button
                  key={acc}
                  type="button"
                  onClick={() => handleAccountChange(acc)}
                  className={cn(
                    "flex-1 py-2 rounded-lg text-sm font-medium transition-colors border",
                    account === acc
                      ? acc === "zakat"
                        ? "bg-error-container text-error border-error"
                        : "bg-primary text-white border-primary"
                      : "bg-surface-container text-on-surface-variant border-transparent hover:border-outline-variant"
                  )}
                >
                  {acc === "general" ? "General" : "Zakat (Restricted)"}
                </button>
              ))}
            </div>
            {account === "zakat" && (
              <p className="text-xs text-error bg-error-container rounded px-2 py-1">
                Zakat funds can only be used for Scholarship payouts.
              </p>
            )}
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
              placeholder="What was this expense for?"
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
              placeholder="Voucher no., transaction ref…"
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
              {loading ? "Saving…" : "Log Expense"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
