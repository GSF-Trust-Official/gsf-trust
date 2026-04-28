import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionUser } from "@/lib/session";
import { isMember } from "@/lib/roles";
import { getLedger } from "@/lib/queries/ledger";
import { LedgerPageClient } from "@/components/ledger/LedgerPageClient";
import { GENERAL_CATEGORIES } from "@/lib/validators/ledger";

interface Props {
  searchParams: Promise<{
    page?: string;
    dateFrom?: string;
    dateTo?: string;
    category?: string;
    memberCode?: string;
    direction?: string;
  }>;
}

export default async function LedgerPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isMember(user.role)) redirect("/dashboard");

  const sp = await searchParams;
  const page       = Math.max(1, parseInt(sp.page ?? "1", 10));
  const dateFrom   = sp.dateFrom   ?? undefined;
  const dateTo     = sp.dateTo     ?? undefined;
  const category   = sp.category   ?? undefined;
  const memberCode = sp.memberCode ?? undefined;
  const direction  = (sp.direction === "in" || sp.direction === "out") ? sp.direction : undefined;

  const { env } = getCloudflareContext();

  const result = await getLedger(env.DB, {
    account: "general",
    dateFrom, dateTo, category, memberCode, direction,
    page, pageSize: 20,
  });

  return (
    <LedgerPageClient
      account="general"
      entries={result.entries}
      total={result.total}
      balance={result.balance}
      page={result.page}
      pageSize={result.pageSize}
      role={user.role}
      categories={GENERAL_CATEGORIES}
      dateFrom={dateFrom}
      dateTo={dateTo}
      category={category}
      memberCode={memberCode}
      direction={direction ?? ""}
    />
  );
}
