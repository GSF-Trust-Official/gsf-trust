import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isAdmin } from "@/lib/auth";

export default async function SettingsPage() {
  const user = await getSessionUser();
  if (!user || !isAdmin(user.role)) redirect("/dashboard");

  return (
    <div>
      <h1 className="font-headline text-2xl font-bold text-on-surface mb-6">
        Settings
      </h1>
      <p className="text-on-surface-variant">Coming in a future phase.</p>
    </div>
  );
}
