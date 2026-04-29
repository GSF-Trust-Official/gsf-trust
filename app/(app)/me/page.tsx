import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { isMember } from "@/lib/roles";
import Link from "next/link";
import type { Subscription } from "@/types";

function formatINR(n: number) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(n);
}

export default async function MeDashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (!isMember(user.role)) redirect("/dashboard");
  if (!user.memberId) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-headline font-bold text-on-surface">Welcome, {user.name}</h1>
        <p className="text-on-surface-variant text-sm">
          Your account is not yet linked to a member record. Please contact the Treasurer.
        </p>
      </div>
    );
  }

  const { env } = getCloudflareContext();
  const db = env.DB;

  const [member, dues, totalSubs] = await Promise.all([
    db.prepare("SELECT name, code, join_date FROM members WHERE id = ?").bind(user.memberId).first<{ name: string; code: string; join_date: string }>(),
    db.prepare("SELECT COUNT(*) AS count, SUM(amount) AS total FROM subscriptions WHERE member_id = ? AND status = 'due'").bind(user.memberId).first<{ count: number; total: number | null }>(),
    db.prepare("SELECT SUM(amount) AS total FROM subscriptions WHERE member_id = ? AND status = 'paid'").bind(user.memberId).first<{ total: number | null }>(),
  ]);

  const dueCount = dues?.count ?? 0;
  const dueTotal = dues?.total ?? 0;
  const totalPaid = totalSubs?.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-headline font-bold text-on-surface">
          Assalamu Alaikum, {user.name}
        </h1>
        <p className="text-sm text-on-surface-variant mt-0.5">
          Member {member?.code} · Joined {member?.join_date ? new Date(member.join_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : ""}
        </p>
      </div>

      {dueCount > 0 && (
        <div className="rounded-xl border-2 border-warning bg-warning-container/30 p-5">
          <p className="text-sm font-semibold text-[#4d3600]">Outstanding Dues</p>
          <p className="text-3xl font-headline font-bold text-[#4d3600] mt-1">{formatINR(dueTotal)}</p>
          <p className="text-xs text-[#4d3600]/80 mt-1">{dueCount} month{dueCount > 1 ? "s" : ""} overdue</p>
          <Link href="/payments" className="mt-3 inline-flex items-center text-sm font-medium text-warning hover:underline">
            View payment details →
          </Link>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl border border-outline-variant bg-white p-5">
          <p className="text-xs text-on-surface-variant uppercase tracking-widest">Total Paid</p>
          <p className="text-2xl font-headline font-bold text-success mt-1">{formatINR(totalPaid)}</p>
          <p className="text-xs text-on-surface-variant mt-1">All subscriptions</p>
        </div>
        {dueCount === 0 && (
          <div className="rounded-xl border border-outline-variant bg-white p-5">
            <p className="text-xs text-on-surface-variant uppercase tracking-widest">Status</p>
            <p className="text-2xl font-headline font-bold text-success mt-1">✓ Up to Date</p>
            <p className="text-xs text-on-surface-variant mt-1">No outstanding dues</p>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/me/subscriptions" className="rounded-xl border border-outline-variant bg-white p-5 hover:bg-surface-container transition-colors">
          <p className="font-semibold text-on-surface text-sm">Subscription History</p>
          <p className="text-xs text-on-surface-variant mt-1">View and download receipts for all your payments</p>
        </Link>
        <Link href="/me/donations" className="rounded-xl border border-outline-variant bg-white p-5 hover:bg-surface-container transition-colors">
          <p className="font-semibold text-on-surface text-sm">Donation History</p>
          <p className="text-xs text-on-surface-variant mt-1">All Hadiya, Zakat, and other donations</p>
        </Link>
        <Link href="/payments" className="rounded-xl border border-outline-variant bg-white p-5 hover:bg-surface-container transition-colors">
          <p className="font-semibold text-on-surface text-sm">Make a Payment</p>
          <p className="text-xs text-on-surface-variant mt-1">Bank details and UPI QR code</p>
        </Link>
        <Link href="/me/scholarship" className="rounded-xl border border-outline-variant bg-white p-5 hover:bg-surface-container transition-colors">
          <p className="font-semibold text-on-surface text-sm">Scholarship Announcements</p>
          <p className="text-xs text-on-surface-variant mt-1">View current scholarship opportunities</p>
        </Link>
      </div>
    </div>
  );
}
