import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { COOKIE_NAME } from "@/lib/auth";
import type { JwtPayload } from "@/types";

export async function getSessionUser(): Promise<JwtPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}
