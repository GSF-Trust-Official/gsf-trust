import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";
import type { JwtPayload } from "@/types";

const PROTECTED_PATHS = [
  "/dashboard",
  "/members",
  "/subscriptions",
  "/ledger",
  "/zakat",
  "/interest",
  "/donations",
  "/medical",
  "/scholarship",
  "/reports",
  "/settings",
  "/payments",
  "/me",
  "/change-password",
  "/api",
];

// Foundation-wide routes that the member role may NOT access.
const MEMBER_BLOCKED_PATHS = [
  "/dashboard",
  "/members",
  "/subscriptions",
  "/ledger",
  "/zakat",
  "/interest",
  "/donations",
  "/medical",
  "/reports",
  "/settings",
];

const PUBLIC_API = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/set-password",
];

// Paths that mustChangePassword users may still access.
const CHANGE_PASSWORD_PATHS = [
  "/change-password",
  "/api/auth/change-password",
];

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  if (PUBLIC_API.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (!PROTECTED_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get("gsf-session")?.value;
  if (!token) return redirectToLogin(req);

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);
    const jwtPayload = payload as unknown as JwtPayload;

    // Enforce server-side: users with mustChangePassword may only access
    // the change-password flow until they set a new password.
    if (
      jwtPayload.mustChangePassword &&
      !CHANGE_PASSWORD_PATHS.some((p) => pathname.startsWith(p))
    ) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json(
          { error: "Password change required", code: "MUST_CHANGE_PASSWORD" },
          { status: 403 }
        );
      }
      const url = req.nextUrl.clone();
      url.pathname = "/change-password";
      return NextResponse.redirect(url);
    }

    // member role may not access Foundation-wide routes — redirect to /me.
    if (
      jwtPayload.role === "member" &&
      MEMBER_BLOCKED_PATHS.some((p) => pathname.startsWith(p))
    ) {
      if (pathname.startsWith("/api")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/me";
      return NextResponse.redirect(url);
    }

    return NextResponse.next();
  } catch {
    return redirectToLogin(req);
  }
}

function redirectToLogin(req: NextRequest): NextResponse {
  if (req.nextUrl.pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|login|register|set-password).*)",
  ],
};
