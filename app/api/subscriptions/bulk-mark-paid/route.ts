import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest } from "@/lib/auth";
import { canWrite } from "@/lib/roles";
import { BulkMarkPaidSchema } from "@/lib/validators/subscription";
import { bulkMarkPaid } from "@/lib/queries/subscriptions";

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
    const parsed = BulkMarkPaidSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid input", details: parsed.error.format() }, { status: 400 });

    await bulkMarkPaid(db, { ...parsed.data, userId: user.sub });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("POST /api/subscriptions/bulk-mark-paid failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
