"use client";

import { useEffect, useState } from "react";
import { Building2, Smartphone, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";

interface Props {
  banking: Record<string, string>;
}

function maskAccountNumber(num: string): string {
  if (num.length <= 4) return num;
  return "X".repeat(num.length - 4) + num.slice(-4);
}

export function PaymentsClient({ banking }: Props) {
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied]       = useState<string | null>(null);

  const upiId      = banking.upi_id ?? "";
  const gpayNumber = banking.gpay_number ?? "";

  useEffect(() => {
    if (!upiId) return;
    const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent("GSF Trust")}&cu=INR`;
    QRCode.toDataURL(upiUrl, { width: 240, margin: 2, color: { dark: "#004235", light: "#ffffff" } })
      .then(setQrDataUrl)
      .catch(() => setQrDataUrl(null));
  }, [upiId]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(key);
      toast.success("Copied to clipboard");
      setTimeout(() => setCopied(null), 2000);
    });
  }

  const hasDetails =
    banking.bank_name || banking.account_number || banking.upi_id || banking.gpay_number;

  if (!hasDetails) {
    return (
      <div className="rounded-xl border border-outline-variant bg-white p-8 text-center text-sm text-on-surface-variant">
        Payment details have not been configured yet. Contact the Treasurer.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

      {/* Bank transfer details */}
      {(banking.bank_name || banking.account_number) && (
        <section className="rounded-xl border border-outline-variant bg-white p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Building2 className="size-4 text-primary" />
            <h2 className="text-base font-semibold text-on-surface">Bank Transfer</h2>
          </div>

          <div className="space-y-3">
            {[
              { label: "Bank Name",       value: banking.bank_name,      key: "bank_name"      },
              { label: "Account Name",    value: banking.account_name,   key: "account_name"   },
              { label: "Account Number",  value: banking.account_number ? maskAccountNumber(banking.account_number) : undefined, rawValue: banking.account_number, key: "account_number" },
              { label: "IFSC Code",       value: banking.ifsc_code,      key: "ifsc_code"      },
              { label: "Branch",          value: banking.branch,         key: "branch"         },
            ].filter((r) => r.value).map(({ label, value, rawValue, key }) => (
              <div key={key} className="flex items-center justify-between gap-4 rounded-lg bg-surface-container px-4 py-3">
                <div>
                  <p className="text-xs text-on-surface-variant">{label}</p>
                  <p className="text-sm font-medium text-on-surface font-mono">{value}</p>
                </div>
                <button
                  type="button"
                  aria-label={`Copy ${label}`}
                  onClick={() => copy(rawValue ?? value!, key)}
                  className="text-on-surface-variant hover:text-primary transition-colors shrink-0"
                >
                  {copied === key
                    ? <CheckCircle2 className="size-4 text-success" />
                    : <Copy className="size-4" />
                  }
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* UPI / QR section */}
      {(upiId || gpayNumber) && (
        <section className="rounded-xl border border-outline-variant bg-white p-6 space-y-5">
          <div className="flex items-center gap-2">
            <Smartphone className="size-4 text-primary" />
            <h2 className="text-base font-semibold text-on-surface">UPI / GPay</h2>
          </div>

          {qrDataUrl && (
            <div className="flex flex-col items-center gap-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="Scan to pay via UPI" width={200} height={200} className="rounded-xl border border-outline-variant" />
              <p className="text-xs text-on-surface-variant text-center max-w-50">
                Scan with any UPI app. Enter the amount yourself, then send a screenshot to the Treasurer.
              </p>
            </div>
          )}

          <div className="space-y-3">
            {upiId && (
              <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-container px-4 py-3">
                <div>
                  <p className="text-xs text-on-surface-variant">UPI ID</p>
                  <p className="text-sm font-medium text-on-surface font-mono">{upiId}</p>
                </div>
                <button
                  type="button"
                  aria-label="Copy UPI ID"
                  onClick={() => copy(upiId, "upi_id")}
                  className="text-on-surface-variant hover:text-primary transition-colors shrink-0"
                >
                  {copied === "upi_id" ? <CheckCircle2 className="size-4 text-success" /> : <Copy className="size-4" />}
                </button>
              </div>
            )}
            {gpayNumber && (
              <div className="flex items-center justify-between gap-4 rounded-lg bg-surface-container px-4 py-3">
                <div>
                  <p className="text-xs text-on-surface-variant">GPay Number</p>
                  <p className="text-sm font-medium text-on-surface font-mono">{gpayNumber}</p>
                </div>
                <button
                  type="button"
                  aria-label="Copy GPay number"
                  onClick={() => copy(gpayNumber, "gpay_number")}
                  className="text-on-surface-variant hover:text-primary transition-colors shrink-0"
                >
                  {copied === "gpay_number" ? <CheckCircle2 className="size-4 text-success" /> : <Copy className="size-4" />}
                </button>
              </div>
            )}
          </div>

          <div className="rounded-lg bg-info-container/40 border border-info/20 px-4 py-3 text-xs text-info">
            After paying, send a screenshot to the Treasurer via WhatsApp so your payment can be recorded.
          </div>
        </section>
      )}
    </div>
  );
}
