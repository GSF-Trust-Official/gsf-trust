import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest } from "@/lib/auth";
import { isMember } from "@/lib/roles";
import { getLedger, type LedgerAccount } from "@/lib/queries/ledger";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    const user = await getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.mustChangePassword)
      return NextResponse.json({ error: "Password change required", code: "MUST_CHANGE_PASSWORD" }, { status: 403 });
    if (isMember(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url      = new URL(req.url);
    const account  = (url.searchParams.get("account") ?? "general") as LedgerAccount;
    const dateFrom = url.searchParams.get("dateFrom") ?? undefined;
    const dateTo   = url.searchParams.get("dateTo") ?? undefined;
    const category = url.searchParams.get("category") ?? undefined;
    const memberCode = url.searchParams.get("memberCode") ?? undefined;
    const direction  = (url.searchParams.get("direction") ?? undefined) as "in" | "out" | undefined;
    const page     = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const pageSize = 20;

    if (!["general", "zakat", "interest"].includes(account))
      return NextResponse.json({ error: "Invalid account" }, { status: 400 });

    const result = await getLedger(db, { account, dateFrom, dateTo, category, memberCode, direction, page, pageSize });
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    console.error("GET /api/ledger failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
