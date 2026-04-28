import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest } from "@/lib/auth";
import { canWrite, isAdmin } from "@/lib/roles";
import { EditEntrySchema } from "@/lib/validators/ledger";
import { updateEntry, softDeleteEntry } from "@/lib/queries/ledger";
import type { LedgerEntry } from "@/types";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    const { id } = await params;

    const user = await getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.mustChangePassword)
      return NextResponse.json({ error: "Password change required", code: "MUST_CHANGE_PASSWORD" }, { status: 403 });
    if (!canWrite(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const existing = await db
      .prepare("SELECT * FROM ledger_entries WHERE id = ? AND is_deleted = 0")
      .bind(id)
      .first<LedgerEntry>();
    if (!existing) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    const body   = await req.json().catch(() => null);
    const parsed = EditEntrySchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid input", details: parsed.error.format() }, { status: 400 });

    const { category, description, amount, date, reference, notes } = parsed.data;

    // Category restriction: zakat can only be Scholarship
    if (existing.account === "zakat" && category !== "Scholarship")
      return NextResponse.json({ error: "Zakat entries must use Scholarship category" }, { status: 400 });

    // Interest account restrictions
    if (existing.account === "interest") {
      const isCredit = existing.amount > 0;
      if (isCredit && category !== "Bank Interest")
        return NextResponse.json({ error: "Interest credit entries must use 'Bank Interest' category" }, { status: 400 });
      if (!isCredit && !["Distribution to Poor", "Charity Distribution"].includes(category))
        return NextResponse.json({ error: "Interest debit entries must use 'Distribution to Poor' or 'Charity Distribution'" }, { status: 400 });
    }

    // Preserve the sign of the original amount
    const signedAmount = existing.amount >= 0 ? Math.abs(amount) : -Math.abs(amount);

    await updateEntry(db, {
      id,
      category,
      description,
      amount: signedAmount,
      date,
      reference: reference ?? null,
      notes: notes ?? null,
      userId: user.sub,
      before: existing,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/ledger/[id] failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: RouteContext): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;
    const { id } = await params;

    const user = await getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.mustChangePassword)
      return NextResponse.json({ error: "Password change required", code: "MUST_CHANGE_PASSWORD" }, { status: 403 });
    if (!isAdmin(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const existing = await db
      .prepare("SELECT * FROM ledger_entries WHERE id = ? AND is_deleted = 0")
      .bind(id)
      .first<LedgerEntry>();
    if (!existing) return NextResponse.json({ error: "Entry not found" }, { status: 404 });

    await softDeleteEntry(db, { id, userId: user.sub, before: existing });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("DELETE /api/ledger/[id] failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
