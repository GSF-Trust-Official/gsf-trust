import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED_PATHS = [
  "/dashboard",
  "/members",
  "/subscriptions",
  "/ledger",
  "/zakat",
  "/donations",
  "/medical",
  "/scholarship",
  "/reports",
  "/settings",
  "/change-password",
  "/api",
];

const PUBLIC_API = [
  "/api/auth/login",
  "/api/auth/logout",
  "/api/auth/register",
  "/api/auth/forgot-password",
  "/api/auth/set-password",
];

export async function middleware(req: NextRequest): Promise<NextResponse> {
  const { pathname } = req.nextUrl;

  if (PUBLIC_API.some((p) => pathname.startsWith(p))) return NextResponse.next();
  if (!PROTECTED_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const token = req.cookies.get("gsf-session")?.value;
  if (!token) return redirectToLogin(req);

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    await jwtVerify(token, secret);
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
