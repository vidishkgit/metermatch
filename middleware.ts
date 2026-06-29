import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

const PUBLIC_PATHS = ["/login", "/verify"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));

  const token = req.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  // Signed-in users shouldn't sit on the auth pages.
  if (session && isPublic) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Everything else requires a session.
  if (!session && !isPublic) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // Protect all routes except Next internals, static assets, and the favicon/icon.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|.*\\.svg$).*)"],
};
