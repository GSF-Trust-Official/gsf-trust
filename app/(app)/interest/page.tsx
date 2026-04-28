import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionUser } from "@/lib/session";
import { isMember } from "@/lib/roles";
import { getLedger } from "@/lib/queries/ledger";
import { LedgerPageClient } from "@/components/ledger/LedgerPageClient";
import { INTEREST_CATEGORIES } from "@/lib/validators/ledger";

interface Props {
  searchParams: Promise<{
    page?: string;
    dateFrom?: string;
    dateTo?: string;
    direction?: string;
  }>;
}

function InterestBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-warning-container text-warning text-xs font-semibold">
      <span className="w-1.5 h-1.5 rounded-full bg-warning" />
      Interest Payable to Poor
    </span>
  );
}

export default async function InterestPage({ searchParams }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isMember(user.role)) redirect("/dashboard");

  const sp = await searchParams;
  const page      = Math.max(1, parseInt(sp.page ?? "1", 10));
  const dateFrom  = sp.dateFrom  ?? undefined;
  const dateTo    = sp.dateTo    ?? undefined;
  const direction = (sp.direction === "in" || sp.direction === "out") ? sp.direction : undefined;

  const { env } = getCloudflareContext();

  const result = await getLedger(env.DB, {
    account: "interest",
    dateFrom, dateTo, direction,
    page, pageSize: 20,
  });

  return (
    <LedgerPageClient
      account="interest"
      entries={result.entries}
      total={result.total}
      balance={result.balance}
      page={result.page}
      pageSize={result.pageSize}
      role={user.role}
      categories={INTEREST_CATEGORIES}
      badge={<InterestBadge />}
      dateFrom={dateFrom}
      dateTo={dateTo}
      direction={direction ?? ""}
    />
  );
}
