import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest } from "@/lib/auth";
import { canWrite } from "@/lib/roles";
import { LogInterestSchema } from "@/lib/validators/ledger";
import { insertInterest } from "@/lib/queries/ledger";

const ALLOWED_DEBIT_CATEGORIES = ["Distribution to Poor", "Charity Distribution"];

export async function POST(req: Request): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    const user = await getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.mustChangePassword)
      return NextResponse.json({ error: "Password change required", code: "MUST_CHANGE_PASSWORD" }, { status: 403 });
    if (!canWrite(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body   = await req.json().catch(() => null);
    const parsed = LogInterestSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid input", details: parsed.error.format() }, { status: 400 });

    const { type, category, description, amount, date, reference, notes } = parsed.data;

    // Double-enforce server-side interest isolation
    if (type === "credit" && category !== "Bank Interest")
      return NextResponse.json({ error: "Interest credits must use 'Bank Interest' category" }, { status: 400 });
    if (type === "debit" && !ALLOWED_DEBIT_CATEGORIES.includes(category))
      return NextResponse.json({ error: "Interest debits must use 'Distribution to Poor' or 'Charity Distribution'" }, { status: 400 });

    await insertInterest(db, { type, category, description, amount, date, reference: reference ?? null, notes: notes ?? null, userId: user.sub });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/ledger/interest failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
