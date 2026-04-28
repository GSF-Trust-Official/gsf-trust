import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest } from "@/lib/auth";
import { canWrite, isMember } from "@/lib/roles";
import { LogPayoutSchema } from "@/lib/validators/scholarship";
import { getScholarshipPayouts, insertScholarshipPayout } from "@/lib/queries/scholarshipPayouts";
import { getMemberById } from "@/lib/queries/members";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    const user = await getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (user.mustChangePassword)
      return NextResponse.json({ error: "Password change required", code: "MUST_CHANGE_PASSWORD" }, { status: 403 });
    if (isMember(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url          = new URL(req.url);
    const page         = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10));
    const academicYear = url.searchParams.get("academicYear") ?? undefined;

    const result = await getScholarshipPayouts(db, { academicYear, page, pageSize: 20 });
    return NextResponse.json(result);
  } catch (err) {
    console.error("GET /api/scholarship failed", err);
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
    const parsed = LogPayoutSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid input", details: parsed.error.format() }, { status: 400 });

    const { beneficiary_name, member_id, academic_year, amount, eligibility_notes, paid_on } = parsed.data;

    let memberCode: string | null = null;
    if (member_id) {
      const member = await getMemberById(db, member_id);
      memberCode = member?.code ?? null;
    }

    await insertScholarshipPayout(db, {
      beneficiaryName:  beneficiary_name,
      memberId:         member_id          ?? null,
      memberCode,
      academicYear:     academic_year,
      amount,
      eligibilityNotes: eligibility_notes  ?? null,
      paidOn:           paid_on,
      userId:           user.sub,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/scholarship failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
