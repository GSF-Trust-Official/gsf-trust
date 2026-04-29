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
         WHERE member_id = ? AND status = 'due'
         ORDER BY year ASC, month ASC`
      )
      .bind(user.memberId)
      .all<Subscription>();

    const total = results.reduce((sum, s) => sum + (s.amount ?? 300), 0);

    return NextResponse.json({ dues: results, total_due: total });
  } catch (err) {
    console.error("GET /api/me/dues failed", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
