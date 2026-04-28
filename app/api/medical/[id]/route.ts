import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest } from "@/lib/auth";
import { canWrite, isAdmin, isMember } from "@/lib/roles";
import { UpdateCaseSchema } from "@/lib/validators/medical";
import { getMedicalCaseById, updateMedicalCase } from "@/lib/queries/medicalCases";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    const user = await getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.mustChangePassword)
      return NextResponse.json({ error: "Password change required", code: "MUST_CHANGE_PASSWORD" }, { status: 403 });
    if (isMember(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const c = await getMedicalCaseById(db, id, isAdmin(user.role));
    if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(c);
  } catch (err) {
    console.error("GET /api/medical/[id] failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    const user = await getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.mustChangePassword)
      return NextResponse.json({ error: "Password change required", code: "MUST_CHANGE_PASSWORD" }, { status: 403 });
    if (!canWrite(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const { id } = await params;
    const before = await getMedicalCaseById(db, id, true);
    if (!before) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (before.status === "closed")
      return NextResponse.json({ error: "Case is already closed" }, { status: 400 });

    const body   = await req.json().catch(() => null);
    const parsed = UpdateCaseSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid input", details: parsed.error.format() }, { status: 400 });

    const { amount_paid, amount_external, notes, close } = parsed.data;

    await updateMedicalCase(db, id, before, {
      amountPaid:     amount_paid,
      amountExternal: amount_external,
      notes,
      status:    close ? "closed"     : undefined,
      closedAt:  close ? new Date().toISOString().slice(0, 10) : undefined,
      userId:    user.sub,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/medical/[id] failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
