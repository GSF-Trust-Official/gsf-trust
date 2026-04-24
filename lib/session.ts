import { cookies } from "next/headers";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { verifyToken, COOKIE_NAME } from "@/lib/auth";
import type { JwtPayload } from "@/types";

/**
 * Server-component session helper. Verifies the JWT signature and checks the
 * embedded tokenVersion against the DB so that logout and password-change
 * immediately revoke existing sessions.
 */
export async function getSessionUser(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const payload = await verifyToken(token);
    const { env } = getCloudflareContext();
    const row = await env.DB
      .prepare(
        "SELECT token_version FROM users WHERE id = ? AND is_active = 1"
      )
      .bind(payload.sub)
      .first<{ token_version: number }>();
    if (!row || row.token_version !== payload.tokenVersion) return null;
    return payload;
  } catch {
    return null;
  }
}
