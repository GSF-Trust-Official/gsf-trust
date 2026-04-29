"use server";

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest } from "@/lib/auth";
import { isAdmin } from "@/lib/roles";
import type { RegistrationRequest } from "@/types";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const user = await getUserFromRequest(req, env.DB);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isAdmin(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const url = new URL(req.url);
    const status = url.searchParams.get("status") ?? "pending";

    const { results } = await env.DB
      .prepare(
        `SELECT * FROM registration_requests
         WHERE status = ?
         ORDER BY created_at DESC
         LIMIT 100`
      )
      .bind(status)
      .all<RegistrationRequest>();

    const pendingCount = await env.DB
      .prepare("SELECT COUNT(*) AS count FROM registration_requests WHERE status = 'pending'")
      .first<{ count: number }>();

    return NextResponse.json({ requests: results, pending_count: pendingCount?.count ?? 0 });
  } catch (err) {
    console.error("GET /api/admin/registrations failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
