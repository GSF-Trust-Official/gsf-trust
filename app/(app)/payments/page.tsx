import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSettings } from "@/lib/queries/settings";
import { PaymentsClient } from "@/components/payments/PaymentsClient";

export default async function PaymentsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");

  const { env } = getCloudflareContext();
  const banking = await getSettings(env.DB, [
    "bank_name",
    "account_name",
    "account_number",
    "ifsc_code",
    "branch",
    "upi_id",
    "gpay_number",
  ]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-bold text-on-surface">Make a Payment</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">
          Bank details and UPI QR code for subscription and donation payments.
        </p>
      </div>
      <PaymentsClient banking={banking} />
    </div>
  );
}
