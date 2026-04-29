import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { isMember } from "@/lib/roles";
import { ReportsClient } from "@/components/reports/ReportsClient";

export default async function ReportsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.mustChangePassword) redirect("/change-password");
  if (isMember(user.role)) redirect("/me");

  return <ReportsClient role={user.role} />;
}
