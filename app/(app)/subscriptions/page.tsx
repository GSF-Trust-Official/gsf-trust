import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionUser } from "@/lib/session";
import { isMember } from "@/lib/roles";
import { getMatrixForYear, getArrears } from "@/lib/queries/subscriptions";
import { SubscriptionMatrix } from "@/components/subscriptions/SubscriptionMatrix";

interface Props {
  searchParams: Promise<{ year?: string }>;
}

export default async function SubscriptionsPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isMember(user.role)) redirect("/dashboard");

  const { year: yearParam } = await searchParams;
  const year = parseInt(yearParam ?? "", 10) || new Date().getFullYear();

  const { env } = getCloudflareContext();

  const [matrix, arrears, membersResult] = await Promise.all([
    getMatrixForYear(env.DB, year),
    getArrears(env.DB),
    env.DB
      .prepare(
        "SELECT id, code, name, email FROM members WHERE status = 'active' ORDER BY code ASC"
      )
      .all<{ id: string; code: string; name: string; email: string | null }>(),
  ]);

  return (
    <SubscriptionMatrix
      matrix={matrix}
      arrears={arrears}
      year={year}
      role={user.role}
      members={membersResult.results}
    />
  );
}
