import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest } from "@/lib/auth";
import { canWrite } from "@/lib/roles";
import { LogExpenseSchema } from "@/lib/validators/ledger";
import { insertExpense } from "@/lib/queries/ledger";

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
    const parsed = LogExpenseSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid input", details: parsed.error.format() }, { status: 400 });

    const { account, category, description, amount, date, reference, notes } = parsed.data;

    // Double-enforce server-side Zakat restriction
    if (account === "zakat" && category !== "Scholarship")
      return NextResponse.json({ error: "Zakat account only allows Scholarship category" }, { status: 400 });

    await insertExpense(db, { account, category, description, amount, date, reference: reference ?? null, notes: notes ?? null, userId: user.sub });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/ledger/expense failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
