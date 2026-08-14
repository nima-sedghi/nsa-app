import { cookies } from "next/headers";

const COOKIE_NAME = "voter_id";

/**
 * Reads the anonymous voter identity assigned by middleware.ts. Should always be
 * present by the time an API route runs (middleware sets it on every request), but
 * falls back to generating one defensively in case a request somehow bypassed it.
 */
export async function getVoterId(): Promise<string> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(COOKIE_NAME)?.value;
  if (existing) return existing;
  const id = crypto.randomUUID();
  cookieStore.set(COOKIE_NAME, id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365 * 2,
  });
  return id;
}
