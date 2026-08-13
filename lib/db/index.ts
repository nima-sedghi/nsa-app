import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __nsaPgPool: Pool | undefined;
  // eslint-disable-next-line no-var
  var __nsaDb: ReturnType<typeof drizzle> | undefined;
}

function getDb() {
  if (global.__nsaDb) return global.__nsaDb;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL تنظیم نشده. تو Environment Variables بذارش.");
  }

  const pool =
    global.__nsaPgPool ??
    new Pool({
      connectionString,
      ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false },
      max: 3,
    });
  global.__nsaPgPool = pool;

  const instance = drizzle(pool, { schema });
  global.__nsaDb = instance;
  return instance;
}

// Resolved lazily on first actual query (not at import time), so `next build` doesn't
// need DATABASE_URL to be set — only the deployed runtime does.
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_target, prop) {
    return (getDb() as any)[prop];
  },
});
