import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import { getSettings, setSettings } from "@/lib/queries/settings";
import { z } from "zod";

// All keys managed via this endpoint
const SETTING_KEYS = [
  "receipt_subscriptions_enabled",
  "receipt_donations_enabled",
  "treasurer_email",
  "bank_name",
  "account_name",
  "account_number",
  "ifsc_code",
  "branch",
  "upi_id",
  "gpay_number",
] as const;

const UpdateSettingsSchema = z.object({
  receipt_subscriptions_enabled: z.enum(["0", "1"]).optional(),
  receipt_donations_enabled:     z.enum(["0", "1"]).optional(),
  treasurer_email: z.string().email("Must be a valid email").max(200).optional(),
  bank_name:      z.string().max(100).optional(),
  account_name:   z.string().max(100).optional(),
  account_number: z.string().max(30).optional(),
  ifsc_code:      z.string().max(20).optional(),
  branch:         z.string().max(100).optional(),
  upi_id:         z.string().max(100).optional(),
  gpay_number:    z.string().max(20).optional(),
});

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    const user = await getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdmin(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const settings = await getSettings(db, [...SETTING_KEYS]);
    return NextResponse.json({ ok: true, settings });
  } catch (err) {
    console.error("GET /api/settings failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(req: Request): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const db = env.DB;

    const user = await getUserFromRequest(req, db);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdmin(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const body   = await req.json().catch(() => null);
    const parsed = UpdateSettingsSchema.safeParse(body);
    if (!parsed.success)
      return NextResponse.json({ error: "Invalid input", details: parsed.error.format() }, { status: 400 });

    const updates = Object.fromEntries(
      Object.entries(parsed.data).filter(([, v]) => v !== undefined)
    ) as Record<string, string>;

    if (Object.keys(updates).length === 0)
      return NextResponse.json({ error: "No settings provided" }, { status: 400 });

    await setSettings(db, updates, user.sub);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("PATCH /api/settings failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
