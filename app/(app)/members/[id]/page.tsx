import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { ChevronLeftIcon } from "lucide-react";

import { getSessionUser } from "@/lib/session";
import { isMember } from "@/lib/auth";
import { getMemberById } from "@/lib/queries/members";
import { formatDate } from "@/lib/utils";
import { MemberProfileClient } from "@/components/members/MemberProfileClient";

interface Props {
  params: Promise<{ id: string }>;
}

const KPI_PLACEHOLDERS = [
  { label: "Total Contributed", value: "₹0", sub: "Available in Phase 4" },
  { label: "Outstanding Dues", value: "₹0", sub: "Available in Phase 4" },
  { label: "Assistance Received", value: "₹0", sub: "Available in Phase 7" },
];

export default async function MemberProfilePage({ params }: Props) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (isMember(user.role)) redirect("/dashboard");

  const { id } = await params;
  const { env } = getCloudflareContext();
  const member = await getMemberById(env.DB, id);

  if (!member) notFound();

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <Link
        href="/members"
        className="inline-flex items-center gap-1 text-sm text-on-surface-variant hover:text-primary transition-colors"
      >
        <ChevronLeftIcon className="size-4" />
        All Members
      </Link>

      {/* Identity card */}
      <div className="bg-white rounded-2xl border border-outline-variant p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <p className="font-mono text-sm text-on-surface-variant">
              {member.code}
            </p>
            <h1 className="font-headline text-2xl font-bold text-on-surface mt-1">
              {member.name}
            </h1>
            {member.is_bod === 1 && (
              <span className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary-fixed text-on-primary-fixed-variant text-xs font-semibold">
                BOD — {member.bod_designation ?? "Board Member"}
              </span>
            )}
          </div>

          {/* Status badge + Edit/Deactivate (client component) */}
          <MemberProfileClient member={member} role={user.role} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 text-sm">
          {member.email && (
            <div>
              <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">
                Email
              </p>
              <p className="text-on-surface">{member.email}</p>
            </div>
          )}
          {member.phone && (
            <div>
              <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">
                Phone
              </p>
              <p className="text-on-surface">{member.phone}</p>
            </div>
          )}
          {member.address && (
            <div>
              <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">
                Address
              </p>
              <p className="text-on-surface">{member.address}</p>
            </div>
          )}
          <div>
            <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">
              Member Since
            </p>
            <p className="text-on-surface">{formatDate(member.join_date)}</p>
          </div>
        </div>

        {member.notes && (
          <div className="pt-2 border-t border-outline-variant">
            <p className="text-xs text-on-surface-variant uppercase tracking-widest mb-1">
              Notes
            </p>
            <p className="text-sm text-on-surface">{member.notes}</p>
          </div>
        )}
      </div>

      {/* KPI row — placeholders until Phase 4 / Phase 7 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {KPI_PLACEHOLDERS.map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white rounded-xl border border-outline-variant p-4"
          >
            <p className="text-xs uppercase tracking-widest text-on-surface-variant mb-2">
              {kpi.label}
            </p>
            <p className="font-headline text-2xl font-bold text-on-surface">
              {kpi.value}
            </p>
            <p className="text-xs text-on-surface-variant mt-1 opacity-60">
              {kpi.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Subscription history — placeholder until Phase 4 */}
      <div className="bg-white rounded-2xl border border-outline-variant p-6">
        <h2 className="font-headline text-lg font-semibold text-on-surface mb-4">
          Subscription History
        </h2>
        <p className="text-sm text-on-surface-variant">
          Subscription data will appear here in Phase 4.
        </p>
      </div>

      {/* Recent donations — placeholder until Phase 6 */}
      <div className="bg-white rounded-2xl border border-outline-variant p-6">
        <h2 className="font-headline text-lg font-semibold text-on-surface mb-4">
          Recent Donations
        </h2>
        <p className="text-sm text-on-surface-variant">
          Donation history will appear here in Phase 6.
        </p>
      </div>
    </div>
  );
}
