import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionUser } from "@/lib/session";
import { isMember } from "@/lib/roles";
import { getAllMembers } from "@/lib/queries/members";
import { MembersClient } from "@/components/members/MembersClient";

export default async function MembersPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isMember(user.role)) redirect("/dashboard");

  const { env } = getCloudflareContext();
  const members = await getAllMembers(env.DB);

  return <MembersClient members={members} role={user.role} />;
}
