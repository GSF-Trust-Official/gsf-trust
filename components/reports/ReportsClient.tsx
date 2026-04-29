"use client";

import { useState } from "react";
import {
  FileSpreadsheet, FileText, Download,
  Loader2, AlertCircle, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input }  from "@/components/ui/input";
import { Label }  from "@/components/ui/label";
import { toast }  from "sonner";

interface GeneratedReport {
  url:         string;
  filename:    string;
  format:      "excel" | "pdf";
  title:       string;
  generatedAt: Date;
  direct:      boolean;
}

function ExcelBtn({
  disabled,
  loading,
  onClick,
}: {
  disabled: boolean;
  loading:  boolean;
  onClick:  () => void;
}) {
  return (
    <Button className="gap-2" disabled={disabled} onClick={onClick}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : <FileSpreadsheet className="size-4" />}
      Generate Excel
    </Button>
  );
}

function PdfBtn({
  disabled,
  loading,
  onClick,
}: {
  disabled: boolean;
  loading:  boolean;
  onClick:  () => void;
}) {
  return (
    <Button variant="outline" className="gap-2" disabled={disabled} onClick={onClick}>
      {loading ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
      Generate PDF
    </Button>
  );
}

function yearRange(year: number) {
  return { from: `${year}-01-01`, to: `${year}-12-31` };
}

export function ReportsClient() {
  const [annualYear,  setAnnualYear]  = useState(String(new Date().getFullYear()));
  const [customFrom,  setCustomFrom]  = useState("");
  const [customTo,    setCustomTo]    = useState("");
  const [generating,  setGenerating]  = useState<string | null>(null);
  const [reports,     setReports]     = useState<GeneratedReport[]>([]);

  async function generate(params: {
    format: "excel" | "pdf";
    from:   string;
    to:     string;
    title:  string;
    key:    string;
  }) {
    setGenerating(params.key);
    try {
      const res = await fetch("/api/reports/generate", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: params.format,
          from:   params.from,
          to:     params.to,
          title:  params.title,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        throw new Error(err.error ?? "Failed to generate report");
      }

      const ct = res.headers.get("Content-Type") ?? "";

      if (ct.includes("application/json")) {
        const json = await res.json() as { url: string; filename: string };
        setReports((prev) => [
          {
            url: json.url, filename: json.filename,
            format: params.format, title: params.title,
            generatedAt: new Date(), direct: false,
          },
          ...prev,
        ]);
        toast.success("Report generated and saved to Google Drive");
      } else {
        const blob = await res.blob();
        const url  = URL.createObjectURL(blob);
        const cd   = res.headers.get("Content-Disposition") ?? "";
        const name = cd.match(/filename="(.+?)"/)?.[1] ?? params.title;
        const a    = document.createElement("a");
        a.href     = url;
        a.download = name;
        a.click();
        URL.revokeObjectURL(url);
        setReports((prev) => [
          {
            url: "", filename: name,
            format: params.format, title: params.title,
            generatedAt: new Date(), direct: true,
          },
          ...prev,
        ]);
        toast.success("Report downloaded to your device");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to generate report");
    } finally {
      setGenerating(null);
    }
  }

  const yearNum     = parseInt(annualYear, 10);
  const annualOk    = !isNaN(yearNum) && yearNum >= 2020 && yearNum <= 2099;
  const annualRange = annualOk ? yearRange(yearNum) : null;
  const customOk    = Boolean(customFrom && customTo && customFrom <= customTo);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-headline font-bold text-on-surface">Reports &amp; Exports</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">
          Generate Excel or PDF reports for any date range across all accounts.
        </p>
      </div>

      {/* Annual Report */}
      <div className="rounded-xl border border-outline-variant bg-white p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-on-surface">Annual Report</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Full-year report: General, Zakat, Subscriptions, Donations, Medical, Scholarship.
          </p>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1.5">
            <Label htmlFor="annual-year">Calendar Year</Label>
            <Input
              id="annual-year"
              type="number"
              min={2020}
              max={2099}
              value={annualYear}
              onChange={(e) => setAnnualYear(e.target.value)}
              className="h-9 w-28 bg-surface-container border-0 shadow-none"
            />
          </div>
          {annualRange && (
            <p className="text-xs text-on-surface-variant pb-2 font-mono">
              {annualRange.from} → {annualRange.to}
            </p>
          )}
        </div>

        <div className="flex gap-3 flex-wrap">
          <ExcelBtn
            disabled={!annualOk || generating !== null}
            loading={generating === "annual-excel"}
            onClick={() => annualRange && generate({
              format: "excel", from: annualRange.from, to: annualRange.to,
              title: `Annual Report ${yearNum}`, key: "annual-excel",
            })}
          />
          <PdfBtn
            disabled={!annualOk || generating !== null}
            loading={generating === "annual-pdf"}
            onClick={() => annualRange && generate({
              format: "pdf", from: annualRange.from, to: annualRange.to,
              title: `Annual Report ${yearNum}`, key: "annual-pdf",
            })}
          />
        </div>
      </div>

      {/* Custom Range */}
      <div className="rounded-xl border border-outline-variant bg-white p-6 space-y-5">
        <div>
          <h2 className="text-base font-semibold text-on-surface">Custom Date Range</h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            Export entries for any period across all accounts.
          </p>
        </div>

        <div className="flex items-end gap-3 flex-wrap">
          <div className="space-y-1.5">
            <Label htmlFor="from-date">From</Label>
            <Input
              id="from-date"
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="h-9 w-40 bg-surface-container border-0 shadow-none"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="to-date">To</Label>
            <Input
              id="to-date"
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              className="h-9 w-40 bg-surface-container border-0 shadow-none"
            />
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <ExcelBtn
            disabled={!customOk || generating !== null}
            loading={generating === "custom-excel"}
            onClick={() => generate({
              format: "excel", from: customFrom, to: customTo,
              title: `Report ${customFrom} to ${customTo}`, key: "custom-excel",
            })}
          />
          <PdfBtn
            disabled={!customOk || generating !== null}
            loading={generating === "custom-pdf"}
            onClick={() => generate({
              format: "pdf", from: customFrom, to: customTo,
              title: `Report ${customFrom} to ${customTo}`, key: "custom-pdf",
            })}
          />
        </div>
      </div>

      {/* Generated this session */}
      {reports.length > 0 && (
        <div className="rounded-xl border border-outline-variant bg-white p-6 space-y-3">
          <h2 className="text-base font-semibold text-on-surface">Generated This Session</h2>
          <div className="divide-y divide-outline-variant/50">
            {reports.map((r, i) => (
              <div key={i} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  {r.format === "excel"
                    ? <FileSpreadsheet className="size-5 text-success shrink-0" />
                    : <FileText        className="size-5 text-error   shrink-0" />
                  }
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-on-surface truncate">{r.title}</p>
                    <p className="text-xs text-on-surface-variant font-mono">
                      {r.format.toUpperCase()} · {r.generatedAt.toLocaleTimeString("en-IN")}
                    </p>
                  </div>
                </div>
                {r.direct ? (
                  <span className="flex items-center gap-1.5 text-xs text-success shrink-0">
                    <CheckCircle2 className="size-3.5" /> Downloaded
                  </span>
                ) : (
                  <a href={r.url} target="_blank" rel="noopener noreferrer" className="shrink-0">
                    <Button variant="outline" size="sm" className="gap-1.5">
                      <Download className="size-3.5" />
                      Download
                    </Button>
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info note */}
      <div className="rounded-xl border border-outline-variant bg-surface-low p-4 flex gap-3 items-start text-sm text-on-surface-variant">
        <AlertCircle className="size-4 shrink-0 mt-0.5" />
        <span>
          Reports are uploaded to the Foundation&apos;s Google Drive folder automatically when Drive is configured.
          If not configured, the file downloads directly to your device.
        </span>
      </div>
    </div>
  );
}
