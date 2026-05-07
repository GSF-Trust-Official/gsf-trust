"use client";

import { useState } from "react";
import { Label }  from "@/components/ui/label";
import { Input }  from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, DatabaseBackup, Mail, Building2, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Settings {
  receipt_subscriptions_enabled?: string;
  receipt_donations_enabled?:     string;
  treasurer_email?: string;
  bank_name?:      string;
  account_name?:   string;
  account_number?: string;
  ifsc_code?:      string;
  branch?:         string;
  upi_id?:         string;
  gpay_number?:    string;
}

interface BackupResult {
  ok:       boolean;
  date:     string;
  files:    number;
  rows:     Record<string, number>;
  pruned:   number;
  driveUrl?: string;
  manual:   boolean;
}

interface Props { initialSettings: Settings }

export function SettingsClient({ initialSettings }: Props) {
  const [settings, setSettings] = useState<Settings>(initialSettings);
  const [saving,   setSaving]   = useState<string | null>(null);
  const [backing,  setBacking]  = useState(false);
  const [lastBackup, setLastBackup] = useState<BackupResult | null>(null);
  const [treasurerEmail, setTreasurerEmail] = useState(initialSettings.treasurer_email ?? "");

  // Banking form local state
  const [banking, setBanking] = useState({
    bank_name:      initialSettings.bank_name      ?? "",
    account_name:   initialSettings.account_name   ?? "",
    account_number: initialSettings.account_number ?? "",
    ifsc_code:      initialSettings.ifsc_code      ?? "",
    branch:         initialSettings.branch         ?? "",
    upi_id:         initialSettings.upi_id         ?? "",
    gpay_number:    initialSettings.gpay_number    ?? "",
  });

  async function patchSettings(updates: Partial<Settings>) {
    const key = Object.keys(updates)[0] ?? "save";
    setSaving(key);
    // Strip undefined values before sending — API rejects unknown keys
    const body = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    try {
      const res = await fetch("/api/settings", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSettings((prev) => ({ ...prev, ...updates }));
      toast.success("Setting saved");
    } catch {
      toast.error("Failed to save setting");
    } finally {
      setSaving(null);
    }
  }

  async function saveBanking() {
    setSaving("banking");
    try {
      const res = await fetch("/api/settings", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(banking),
      });
      if (!res.ok) throw new Error("Failed to save");
      setSettings((prev) => ({ ...prev, ...banking }));
      toast.success("Banking details saved");
    } catch {
      toast.error("Failed to save banking details");
    } finally {
      setSaving(null);
    }
  }

  async function runBackup() {
    setBacking(true);
    try {
      const res = await fetch("/api/backup", { method: "POST" });
      const json = await res.json() as BackupResult & { error?: string };
      if (!res.ok) throw new Error(json.error ?? "Backup failed");
      setLastBackup(json);
      toast.success(`Backup complete — ${json.files} file(s) uploaded`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Backup failed");
    } finally {
      setBacking(false);
    }
  }

  const subsEnabled  = settings.receipt_subscriptions_enabled !== "0";
  const donaEnabled  = settings.receipt_donations_enabled     !== "0";

  return (
    <div className="max-w-3xl space-y-6">

      {/* Email Receipts */}
      <section className="rounded-xl border border-outline-variant bg-white p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-primary" />
          <h2 className="text-base font-semibold text-on-surface">Email Receipts</h2>
        </div>
        <p className="text-sm text-on-surface-variant -mt-2">
          Receipts are sent automatically when a member has an email address on record.
        </p>

        <div className="space-y-4">
          {[
            {
              id:      "receipt-subs",
              label:   "Subscription payment receipts",
              key:     "receipt_subscriptions_enabled" as keyof Settings,
              enabled: subsEnabled,
            },
            {
              id:      "receipt-dona",
              label:   "Donation receipts",
              key:     "receipt_donations_enabled" as keyof Settings,
              enabled: donaEnabled,
            },
          ].map(({ id, label, key, enabled }) => (
            <div key={id} className="flex items-center justify-between">
              <Label htmlFor={id} className="text-sm text-on-surface">{label}</Label>
              <button
                id={id}
                type="button"
                role="switch"
                aria-checked={enabled}
                disabled={saving === key}
                onClick={() => patchSettings({ [key]: enabled ? "0" : "1" })}
                className={cn(
                  "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
                  "disabled:cursor-not-allowed disabled:opacity-50",
                  enabled ? "bg-primary" : "bg-outline-variant"
                )}
              >
                <span
                  className={cn(
                    "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform",
                    enabled ? "translate-x-5" : "translate-x-0"
                  )}
                />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Banking Details */}
      <section className="rounded-xl border border-outline-variant bg-white p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Building2 className="size-4 text-primary" />
          <h2 className="text-base font-semibold text-on-surface">Banking &amp; Payment Details</h2>
        </div>
        <p className="text-sm text-on-surface-variant -mt-2">
          Shown on the Payments page and used for the UPI QR code.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            { id: "bank_name",      label: "Bank Name",       placeholder: "e.g. State Bank of India" },
            { id: "account_name",   label: "Account Name",    placeholder: "e.g. GSF Foundation" },
            { id: "account_number", label: "Account Number",  placeholder: "Account number" },
            { id: "ifsc_code",      label: "IFSC Code",       placeholder: "e.g. SBIN0001234" },
            { id: "branch",         label: "Branch",          placeholder: "e.g. MG Road, Bangalore" },
            { id: "upi_id",         label: "UPI ID",          placeholder: "e.g. gsffoundation@okaxis" },
            { id: "gpay_number",    label: "GPay Number",     placeholder: "Phone number linked to GPay" },
          ].map(({ id, label, placeholder }) => (
            <div key={id} className="space-y-1.5">
              <Label htmlFor={id}>{label}</Label>
              <Input
                id={id}
                value={banking[id as keyof typeof banking]}
                onChange={(e) => setBanking((prev) => ({ ...prev, [id]: e.target.value }))}
                placeholder={placeholder}
                className="bg-surface-container border-0 shadow-none"
              />
            </div>
          ))}
        </div>

        <Button
          onClick={saveBanking}
          disabled={saving === "banking"}
          className="gap-2"
        >
          {saving === "banking" ? <Loader2 className="size-4 animate-spin" /> : null}
          Save Banking Details
        </Button>
      </section>

      {/* Manual Backup */}
      <section className="rounded-xl border border-outline-variant bg-white p-6 space-y-5">
        <div className="flex items-center gap-2">
          <DatabaseBackup className="size-4 text-primary" />
          <h2 className="text-base font-semibold text-on-surface">Database Backup</h2>
        </div>
        <p className="text-sm text-on-surface-variant -mt-2">
          All tables are exported as CSV and uploaded to the Foundation&apos;s Google Drive folder.
          Backups older than 30 weeks are automatically removed. The weekly automated backup
          runs every Sunday at midnight IST.
        </p>

        {/* Treasurer email for backup confirmations */}
        <div className="space-y-1.5">
          <Label htmlFor="treasurer-email">Treasurer Email</Label>
          <p className="text-xs text-on-surface-variant">
            Backup confirmation emails and new registration alerts are sent to this address.
          </p>
          <div className="flex gap-2">
            <Input
              id="treasurer-email"
              type="email"
              value={treasurerEmail}
              onChange={(e) => setTreasurerEmail(e.target.value)}
              placeholder="treasurer@example.com"
              className="bg-surface-container border-0 shadow-none"
            />
            <Button
              variant="outline"
              onClick={() => patchSettings({ treasurer_email: treasurerEmail.trim() || undefined })}
              disabled={saving === "treasurer_email"}
              className="shrink-0"
            >
              {saving === "treasurer_email" ? <Loader2 className="size-4 animate-spin" /> : "Save"}
            </Button>
          </div>
        </div>

        {lastBackup && (
          <div className="rounded-lg bg-success-container/30 border border-success/20 p-4 space-y-2">
            <div className="flex items-center gap-2 text-success font-semibold text-sm">
              <CheckCircle2 className="size-4" />
              Backup complete — {lastBackup.date}
            </div>
            <div className="grid grid-cols-2 gap-x-8 gap-y-1 text-xs text-on-surface-variant font-mono">
              {Object.entries(lastBackup.rows).map(([table, count]) => (
                <div key={table} className="flex justify-between">
                  <span>{table}</span>
                  <span className="font-semibold">{count.toLocaleString("en-IN")}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-on-surface-variant">
              {lastBackup.files} file(s) uploaded · {lastBackup.pruned} old file(s) pruned
              {lastBackup.driveUrl && (
                <>
                  {" · "}
                  <a
                    href={lastBackup.driveUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    View in Drive
                  </a>
                </>
              )}
            </p>
          </div>
        )}

        <Button
          variant="outline"
          onClick={runBackup}
          disabled={backing}
          className="gap-2"
        >
          {backing
            ? <Loader2 className="size-4 animate-spin" />
            : <DatabaseBackup className="size-4" />
          }
          {backing ? "Backing up…" : "Run Backup Now"}
        </Button>
      </section>
    </div>
  );
}
