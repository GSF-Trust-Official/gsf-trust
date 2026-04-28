"use client";

import { useState, useEffect, useTransition } from "react";
import { toast } from "sonner";
import { Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { MedicalCase } from "@/types";

const fieldClass =
  "h-10 border-0 bg-surface-container px-3 text-sm shadow-none focus-visible:bg-white";

interface Props {
  open:         boolean;
  onOpenChange: (v: boolean) => void;
  medCase:      MedicalCase;
  onSuccess:    () => void;
}

export function UpdateCaseModal({ open, onOpenChange, medCase, onSuccess }: Props) {
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const [amountPaid,     setAmountPaid]     = useState(String(medCase.amount_paid));
  const [amountExternal, setAmountExternal] = useState(String(medCase.amount_external));
  const [notes,          setNotes]          = useState(medCase.notes ?? "");
  const [closing,        setClosing]        = useState(false);

  useEffect(() => {
    if (open) {
      startTransition(() => {
        setAmountPaid(String(medCase.amount_paid));
        setAmountExternal(String(medCase.amount_external));
        setNotes(medCase.notes ?? "");
        setClosing(false);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, medCase.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const paid     = parseFloat(amountPaid)     || 0;
    const external = parseFloat(amountExternal) || 0;

    setLoading(true);
    try {
      const res = await fetch(`/api/medical/${medCase.id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount_paid:     paid,
          amount_external: external,
          notes:           notes.trim() || null,
          close:           closing,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed to update case"); return; }
      toast.success(closing ? "Case closed" : "Case updated");
      onOpenChange(false);
      onSuccess();
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-xl" showCloseButton>
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>Update Case — {medCase.case_ref}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-5">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Amount Paid by Foundation (₹)</Label>
              <Input
                className={fieldClass}
                type="number"
                min="0"
                step="0.01"
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>External Pledge Received (₹)</Label>
              <Input
                className={fieldClass}
                type="number"
                min="0"
                step="0.01"
                value={amountExternal}
                onChange={(e) => setAmountExternal(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Notes <span className="font-normal text-on-surface-variant">(optional)</span></Label>
            <textarea
              className="h-16 rounded-lg w-full resize-none py-2 border-0 bg-surface-container px-3 text-sm shadow-none focus-visible:bg-white"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="close-case"
              type="checkbox"
              checked={closing}
              onChange={(e) => setClosing(e.target.checked)}
              className="h-4 w-4 rounded border-outline-variant accent-primary"
            />
            <Label htmlFor="close-case" className="cursor-pointer font-normal text-error">
              Mark this case as closed
            </Label>
          </div>

          {closing && (
            <p className="text-xs text-on-surface-variant rounded-lg bg-error-container px-3 py-2">
              Closing this case is irreversible from this screen. It will set today as the closed date.
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" size="lg" onClick={() => onOpenChange(false)} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" size="lg" className="h-11 gap-2 px-4" disabled={loading}
              variant={closing ? "destructive" : "default"}>
              <Save className="size-4" />
              {loading ? "Saving…" : closing ? "Close Case" : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
