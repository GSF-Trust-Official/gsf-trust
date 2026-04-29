"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ExternalLink, Calendar, FileText, GraduationCap } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ScholarshipAnnouncement } from "@/types";

function getDrivePreviewUrl(shareUrl: string): string {
  const idMatch = shareUrl.match(/\/d\/([a-zA-Z0-9_-]+)/);
  if (idMatch) return `https://drive.google.com/file/d/${idMatch[1]}/preview`;
  return shareUrl;
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export default function MeScholarshipPage() {
  const [announcement, setAnnouncement] = useState<ScholarshipAnnouncement | null | undefined>(undefined);

  useEffect(() => {
    fetch("/api/scholarship/announcement")
      .then((r) => r.json())
      .then((d: ScholarshipAnnouncement | null) => setAnnouncement(d))
      .catch(() => { toast.error("Failed to load announcement"); setAnnouncement(null); });
  }, []);

  if (announcement === undefined) {
    return <p className="text-sm text-on-surface-variant">Loading…</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-bold text-on-surface">Scholarship</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">Current scholarship opportunities from GSF Foundation</p>
      </div>

      {!announcement ? (
        <div className="rounded-xl border border-outline-variant bg-white p-8 text-center">
          <GraduationCap className="mx-auto size-10 text-on-surface-variant/40 mb-3" />
          <p className="text-sm font-medium text-on-surface">No active scholarship announcement</p>
          <p className="text-xs text-on-surface-variant mt-1">Check back later for upcoming opportunities.</p>
        </div>
      ) : (
        <div className="space-y-5">
          <div className="rounded-xl border border-outline-variant bg-white p-6 space-y-4">
            <div className="flex items-start gap-3">
              <GraduationCap className="size-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h2 className="text-lg font-headline font-semibold text-on-surface">{announcement.title}</h2>
                {announcement.deadline && (
                  <p className="text-xs text-on-surface-variant flex items-center gap-1 mt-1">
                    <Calendar className="size-3" />
                    Deadline: {fmtDate(announcement.deadline)}
                  </p>
                )}
              </div>
            </div>

            <p className="text-sm text-on-surface-variant whitespace-pre-line">{announcement.description}</p>

            {announcement.eligibility_criteria && (
              <div className="rounded-lg bg-surface-container p-4">
                <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-widest mb-1">Eligibility</p>
                <p className="text-sm text-on-surface whitespace-pre-line">{announcement.eligibility_criteria}</p>
              </div>
            )}

            {announcement.contact && (
              <p className="text-sm text-on-surface-variant">
                <span className="font-medium">Contact:</span> {announcement.contact}
              </p>
            )}

            <div className="flex flex-wrap gap-3 pt-2">
              {announcement.form_url && (
                <a href={announcement.form_url} target="_blank" rel="noopener noreferrer">
                  <Button className="gap-2">
                    <FileText className="size-4" />
                    Apply Now
                  </Button>
                </a>
              )}
              {announcement.poster_drive_url && (
                <a href={announcement.poster_drive_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2">
                    <ExternalLink className="size-4" />
                    View Poster
                  </Button>
                </a>
              )}
              {announcement.documents_drive_url && (
                <a href={announcement.documents_drive_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2">
                    <ExternalLink className="size-4" />
                    Supporting Documents
                  </Button>
                </a>
              )}
            </div>
          </div>

          {announcement.poster_drive_url && (
            <div className="rounded-xl border border-outline-variant overflow-hidden bg-white">
              <iframe
                src={getDrivePreviewUrl(announcement.poster_drive_url)}
                className="w-full aspect-[3/4]"
                allow="autoplay"
                title="Scholarship Poster"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
