import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionUser } from "@/lib/session";
import { isMember } from "@/lib/roles";
import { getDonations } from "@/lib/queries/donations";
import { getAllMembers } from "@/lib/queries/members";
import { DonationsClient } from "@/components/donations/DonationsClient";

interface Props {
  searchParams: Promise<{
    page?:     string;
    type?:     string;
    category?: string;
    dateFrom?: string;
    dateTo?:   string;
  }>;
}

export default async function DonationsPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isMember(user.role)) redirect("/dashboard");

  const sp       = await searchParams;
  const page     = Math.max(1, parseInt(sp.page ?? "1", 10));
  const rawType  = sp.type;
  const type     = (rawType === "hadiya" || rawType === "zakat" || rawType === "other") ? rawType : undefined;
  const category = sp.category ?? undefined;
  const dateFrom = sp.dateFrom ?? undefined;
  const dateTo   = sp.dateTo   ?? undefined;

  const { env } = getCloudflareContext();

  const [data, members] = await Promise.all([
    getDonations(env.DB, { type, category, dateFrom, dateTo, page, pageSize: 20 }),
    getAllMembers(env.DB),
  ]);

  return (
    <DonationsClient
      initialData={data}
      members={members.map((m) => ({ id: m.id, code: m.code, name: m.name }))}
      role={user.role}
      type={type ?? ""}
      category={category ?? ""}
      dateFrom={dateFrom ?? ""}
      dateTo={dateTo ?? ""}
    />
  );
}
