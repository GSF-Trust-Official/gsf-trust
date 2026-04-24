import { getSessionUser } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <div>
      <h1 className="font-headline text-2xl font-bold text-on-surface mb-1">
        Dashboard
      </h1>
      <p className="text-sm text-on-surface-variant mb-8">
        Welcome back, {user.name}.
      </p>
      <p className="text-on-surface-variant text-sm">
        KPIs and charts coming in Phase 3.
      </p>
    </div>
  );
}
