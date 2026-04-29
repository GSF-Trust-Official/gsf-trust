"use server";

import { NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { getUserFromRequest } from "@/lib/auth";
import { isMember } from "@/lib/roles";
import type { Subscription } from "@/types";

export async function GET(req: Request): Promise<NextResponse> {
  try {
    const { env } = getCloudflareContext();
    const user = await getUserFromRequest(req, env.DB);
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!isMember(user.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (!user.memberId) return NextResponse.json({ error: "No member linked to this account" }, { status: 422 });

    const { results } = await env.DB
      .prepare(
        `SELECT * FROM subscriptions
         WHERE member_id = ?
         ORDER BY year DESC, month DESC`
      )
      .bind(user.memberId)
      .all<Subscription>();

    return NextResponse.json({ subscriptions: results });
  } catch (err) {
    console.error("GET /api/me/subscriptions failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
