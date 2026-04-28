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
import type { ScholarshipAnnouncement } from "@/types";

const fieldClass =
  "h-10 border-0 bg-surface-container px-3 text-sm shadow-none focus-visible:bg-white";
const textareaClass =
  "rounded-lg w-full resize-none py-2 border-0 bg-surface-container px-3 text-sm shadow-none";

interface Props {
  open:          boolean;
  onOpenChange:  (v: boolean) => void;
  existing:      ScholarshipAnnouncement | null;
  onSuccess:     () => void;
}

export function ManageAnnouncementModal({ open, onOpenChange, existing, onSuccess }: Props) {
  const [, startTransition] = useTransition();
  const [loading, setLoading] = useState(false);

  const [title,      setTitle]      = useState("");
  const [desc,       setDesc]       = useState("");
  const [eligibility, setEligibility] = useState("");
  const [deadline,   setDeadline]   = useState("");
  const [contact,    setContact]    = useState("");
  const [posterUrl,  setPosterUrl]  = useState("");
  const [docsUrl,    setDocsUrl]    = useState("");
  const [formUrl,    setFormUrl]    = useState("");
  const [isActive,   setIsActive]   = useState(false);

  useEffect(() => {
    if (open) {
      startTransition(() => {
        setTitle(existing?.title               ?? "");
        setDesc(existing?.description          ?? "");
        setEligibility(existing?.eligibility_criteria ?? "");
        setDeadline(existing?.deadline         ?? "");
        setContact(existing?.contact           ?? "");
        setPosterUrl(existing?.poster_drive_url    ?? "");
        setDocsUrl(existing?.documents_drive_url   ?? "");
        setFormUrl(existing?.form_url          ?? "");
        setIsActive((existing?.is_active ?? 0) === 1);
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, existing?.id]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim())  { toast.error("Title is required"); return; }
    if (!desc.trim())   { toast.error("Description is required"); return; }
    if (formUrl && !formUrl.startsWith("https://docs.google.com/forms/")) {
      toast.error("Application form must be a Google Forms URL"); return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/scholarship/announcement", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id:                   existing?.id,
          title:                title.trim(),
          description:          desc.trim(),
          eligibility_criteria: eligibility.trim() || undefined,
          deadline:             deadline            || null,
          contact:              contact.trim()      || undefined,
          poster_drive_url:     posterUrl.trim()    || null,
          documents_drive_url:  docsUrl.trim()      || null,
          form_url:             formUrl.trim()      || null,
          is_active:            isActive,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) { toast.error(data.error ?? "Failed to save announcement"); return; }
      toast.success(existing ? "Announcement updated" : "Announcement created");
      onOpenChange(false);
      onSuccess();
    } catch { toast.error("Something went wrong"); }
    finally { setLoading(false); }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-xl max-h-[90dvh] overflow-y-auto" showCloseButton>
        <DialogHeader className="p-5 pb-3">
          <DialogTitle>{existing ? "Edit Announcement" : "New Scholarship Announcement"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 pb-5">
          <div className="space-y-1.5">
            <Label>Title *</Label>
            <Input className={fieldClass} placeholder="e.g. GSF Scholarship 2025–2026" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Description *</Label>
            <textarea className={`${textareaClass} h-24`} placeholder="Details about the scholarship…" value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Eligibility Criteria <span className="font-normal text-on-surface-variant">(optional)</span></Label>
            <textarea className={`${textareaClass} h-16`} placeholder="Who can apply…" value={eligibility} onChange={(e) => setEligibility(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Application Deadline <span className="font-normal text-on-surface-variant">(optional)</span></Label>
              <Input className={fieldClass} type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Contact <span className="font-normal text-on-surface-variant">(optional)</span></Label>
              <Input className={fieldClass} placeholder="Email or phone" value={contact} onChange={(e) => setContact(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Poster (Google Drive link) <span className="font-normal text-on-surface-variant">(optional)</span></Label>
            <Input className={fieldClass} placeholder="https://drive.google.com/file/d/…" value={posterUrl} onChange={(e) => setPosterUrl(e.target.value)} />
            <p className="text-xs text-on-surface-variant">Make sure sharing is set to &ldquo;Anyone with the link&rdquo; in Drive.</p>
          </div>

          <div className="space-y-1.5">
            <Label>Supporting Docs (Google Drive link) <span className="font-normal text-on-surface-variant">(optional)</span></Label>
            <Input className={fieldClass} placeholder="https://drive.google.com/…" value={docsUrl} onChange={(e) => setDocsUrl(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label>Application Form (Google Forms URL) <span className="font-normal text-on-surface-variant">(optional)</span></Label>
            <Input className={fieldClass} placeholder="https://docs.google.com/forms/…" value={formUrl} onChange={(e) => setFormUrl(e.target.value)} />
          </div>

          <div className="flex items-center gap-3">
            <input
              id="is-active"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-outline-variant accent-primary"
            />
            <Label htmlFor="is-active" className="cursor-pointer font-normal">
              Publish immediately (visible to all users)
            </Label>
          </div>

          <div className="flex items-center justify-end gap-3 pt-1">
            <Button type="button" variant="ghost" size="lg" onClick={() => onOpenChange(false)} disabled={loading}>Cancel</Button>
            <Button type="submit" size="lg" className="h-11 gap-2 px-4" disabled={loading}>
              <Save className="size-4" />
              {loading ? "Saving…" : "Save Announcement"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
