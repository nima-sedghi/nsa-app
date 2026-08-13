import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { rosterConfig } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const rows = await db.select().from(rosterConfig).limit(1);
  const cfg = rows[0] || { mode: "open", minLen: 8, maxLen: 10 };
  return NextResponse.json({ mode: cfg.mode, minLen: cfg.minLen, maxLen: cfg.maxLen });
}

const Schema = z.object({
  mode: z.enum(["open", "closed"]),
  minLen: z.number().int().min(1).max(30),
  maxLen: z.number().int().min(1).max(30),
});

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "ورودی نامعتبره" }, { status: 400 });

  const existing = await db.select().from(rosterConfig).limit(1);
  if (existing.length === 0) {
    await db.insert(rosterConfig).values({ id: 1, ...parsed.data });
  } else {
    await db.update(rosterConfig).set(parsed.data).where(eq(rosterConfig.id, existing[0].id));
  }
  return NextResponse.json({ ok: true });
}
