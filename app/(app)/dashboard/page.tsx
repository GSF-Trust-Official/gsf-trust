import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getSessionUser } from "@/lib/session";
import { canWrite as canWriteRole, isMember } from "@/lib/roles";
import { getDashboardData } from "@/lib/queries/dashboard";
import { KpiTile } from "@/components/dashboard/KpiTile";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { QuickActions } from "@/components/dashboard/QuickActions";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isMember(user.role)) {
    return (
      <div className="space-y-2">
        <h1 className="font-headline text-2xl font-bold text-on-surface">
          Dashboard
        </h1>
        <p className="text-sm text-on-surface-variant">
          Member self-service is not available yet.
        </p>
      </div>
    );
  }

  const { env } = getCloudflareContext();

  const [data, membersResult] = await Promise.all([
    getDashboardData(env.DB),
    env.DB
      .prepare("SELECT id, code, name, email FROM members WHERE status = 'active' ORDER BY code ASC")
      .all<{ id: string; code: string; name: string; email: string | null }>(),
  ]);

  const { kpis, deltas, collectionRate, donationBreakdown, expenseAllocation, recentActivity } = data;
  const members = membersResult.results;
  const writeAccess = canWriteRole(user.role);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-headline text-2xl font-bold text-on-surface">Dashboard</h1>
          <p className="text-sm text-on-surface-variant mt-0.5">Welcome back, {user.name}.</p>
        </div>
        <QuickActions canWrite={writeAccess} members={members} />
      </div>

      {/* KPI tiles — 2 cols mobile, 3 cols tablet+desktop (2 rows of 3) */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <KpiTile
          label="Total Funds"
          value={kpis.total_funds}
          amountColor="text-primary"
          note="General + Zakat"
          delta={deltas.total_funds}
        />
        <KpiTile
          label="General"
          value={kpis.general_balance}
          amountColor="text-success"
          delta={deltas.general_balance}
        />
        <KpiTile
          label="Zakat"
          value={kpis.zakat_balance}
          amountColor="text-info"
          delta={deltas.zakat_balance}
        />
        <KpiTile
          label="Undistributed Interest"
          value={kpis.interest_balance}
          amountColor="text-warning"
          note="Awaiting distribution"
          tooltip="Bank savings interest — haram, must be distributed to the poor"
        />
        <KpiTile
          label="Medical Pool"
          value={kpis.medical_pool}
          amountColor="text-on-surface"
          note="Outstanding open cases"
        />
        <KpiTile
          label="Outstanding Dues"
          value={kpis.outstanding_dues}
          amountColor={kpis.outstanding_dues > 0 ? "text-error" : "text-success"}
        />
      </div>

      {/* Charts */}
      <DashboardCharts
        donationBreakdown={donationBreakdown}
        expenseAllocation={expenseAllocation}
        collectionRate={collectionRate}
      />

      {/* Recent activity */}
      <div>
        <h2 className="text-sm font-medium uppercase tracking-widest text-on-surface-variant mb-3">
          Recent Activity
        </h2>
        <RecentActivity rows={recentActivity} />
      </div>
    </div>
  );
}
