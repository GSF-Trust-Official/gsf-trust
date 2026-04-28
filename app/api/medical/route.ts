import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest } from "@/lib/auth";
import { canWrite, isAdmin, isMember } from "@/lib/roles";
import { CreateCaseSchema } from "@/lib/validators/medical";
import { getMedicalCases, createMedicalCase } from "@/lib/queries/medicalCases";

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
    const page     = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const rawStatus = url.searchParams.get("status");
    const status    = (rawStatus === "open" || rawStatus === "closed") ? rawStatus : undefined;

    const result = await getMedicalCases(db, { status, page, pageSize: 20 }, isAdmin(user.role));
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/medical failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

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
    const parsed = CreateCaseSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid input", details: parsed.error.format() }, { status: 400 });

    const { beneficiary_name, mask_name, amount_requested, opened_at, description, notes } = parsed.data;

    const id = await createMedicalCase(db, {
      beneficiaryName: beneficiary_name,
      maskName:        mask_name,
      amountRequested: amount_requested,
      openedAt:        opened_at,
      description:     description ?? null,
      notes:           notes       ?? null,
      userId:          user.sub,
    });

    return NextResponse.json({ ok: true, id });
  } catch (err) {
    console.error("POST /api/medical failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
