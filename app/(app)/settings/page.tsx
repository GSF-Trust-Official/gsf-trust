import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isAdmin } from "@/lib/roles";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSettings } from "@/lib/queries/settings";
import { SettingsClient } from "@/components/settings/SettingsClient";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (!isAdmin(user.role)) redirect("/dashboard");

  const { env } = getCloudflareContext();
  const settings = await getSettings(env.DB, [
    "receipt_subscriptions_enabled",
    "receipt_donations_enabled",
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
        <h1 className="text-2xl font-headline font-bold text-on-surface">Settings</h1>
        <p className="text-sm text-on-surface-variant mt-0.5">
          Configure receipts, banking details, and database backups.
        </p>
      </div>
      <SettingsClient initialSettings={settings} />
    </div>
  );
}
