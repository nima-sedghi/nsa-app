import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "voter_id";
const TWO_YEARS = 60 * 60 * 24 * 365 * 2;

export function middleware(req: NextRequest) {
  const res = NextResponse.next();
  if (!req.cookies.get(COOKIE_NAME)) {
    const id = crypto.randomUUID();
    res.cookies.set(COOKIE_NAME, id, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TWO_YEARS,
    });
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
