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

interface Props {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess:    () => void;
}

export function AddCaseModal({ open, onOpenChange, onSuccess }: Props) {
  const today = new Date().toISOString().slice(0, 10);
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const [name,        setName]        = useState("");
  const [maskName,    setMaskName]    = useState(false);
  const [amount,      setAmount]      = useState("");
  const [openedAt,    setOpenedAt]    = useState(today);
  const [description, setDescription] = useState("");
  const [notes,       setNotes]       = useState("");

  useEffect(() => {
    if (open) {
      startTransition(() => {
        setName(""); setMaskName(false); setAmount("");
        setOpenedAt(today); setDescription(""); setNotes("");
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { toast.error("Beneficiary name is required"); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }

    setLoading(true);
    try {
      const res = await fetch("/api/medical", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          beneficiary_name: name.trim(),
          mask_name:        maskName,
          amount_requested: amt,
          opened_at:        openedAt,
          description:      description.trim() || undefined,
          notes:            notes.trim()       || undefined,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed to create case"); return; }
      toast.success("Medical case created");
      onOpenChange(false);
      onSuccess();
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-xl" showCloseButton>
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>Add Medical Case</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-5">
          <div className="space-y-1.5">
            <Label>Beneficiary Name *</Label>
            <Input
              className={fieldClass}
              placeholder="Full name of beneficiary"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="mask-name"
              type="checkbox"
              checked={maskName}
              onChange={(e) => setMaskName(e.target.checked)}
              className="h-4 w-4 rounded border-outline-variant accent-primary"
            />
            <Label htmlFor="mask-name" className="cursor-pointer font-normal">
              Mask name for privacy (viewers see &quot;XXXX&quot;)
            </Label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount Requested (₹) *</Label>
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
              <Label>Date Opened *</Label>
              <Input
                className={fieldClass}
                type="date"
                value={openedAt}
                onChange={(e) => setOpenedAt(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Description <span className="font-normal text-on-surface-variant">(optional)</span></Label>
            <textarea
              className={cn(fieldClass, "h-20 rounded-lg w-full resize-none py-2")}
              placeholder="Brief description of the case…"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Notes <span className="font-normal text-on-surface-variant">(optional)</span></Label>
            <textarea
              className={cn(fieldClass, "h-16 rounded-lg w-full resize-none py-2")}
              placeholder="Internal notes…"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" size="lg" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="lg" className="h-11 gap-2 px-4" disabled={loading}>
              <Save className="size-4" />
              {loading ? "Saving…" : "Create Case"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
