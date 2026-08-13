import { sql } from "drizzle-orm";
import { db } from "./db";

/**
 * Fixed-window rate limiter backed by Postgres, so it's correct even across many
 * serverless function instances (an in-memory Map would reset per cold start and
 * wouldn't be shared between instances at all).
 *
 * Uses a single atomic INSERT ... ON CONFLICT DO UPDATE ... RETURNING so concurrent
 * requests can't race past each other and both slip under the limit.
 */
export async function checkRateLimit(key: string, maxCount: number, windowSeconds: number): Promise<boolean> {
  const bucketMs = windowSeconds * 1000;
  const windowStartMs = Math.floor(Date.now() / bucketMs) * bucketMs;
  const id = `${key}:${windowStartMs}`;
  const windowStart = new Date(windowStartMs);

  const result = await db.execute<{ count: number }>(sql`
    INSERT INTO rate_limit_buckets (id, window_start, count)
    VALUES (${id}, ${windowStart}, 1)
    ON CONFLICT (id) DO UPDATE SET count = rate_limit_buckets.count + 1
    RETURNING count;
  `);

  const count = Number((result as any).rows?.[0]?.count ?? 1);
  return count <= maxCount;
}

export function getClientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") || "unknown";
}
