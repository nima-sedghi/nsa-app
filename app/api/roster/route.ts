import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { allowedStudents } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";
import { normalizeId, isDigitsOnly } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const rows = await db.select().from(allowedStudents);
  return NextResponse.json({ ids: rows.map((r) => r.studentId), count: rows.length });
}

const Schema = z.object({ ids: z.array(z.string().min(1).max(30)).max(20000) });

export async function POST(req: Request) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "ورودی نامعتبره" }, { status: 400 });

  const cleaned = Array.from(new Set(parsed.data.ids.map(normalizeId).filter(isDigitsOnly)));
  if (cleaned.length > 0) {
    await db
      .insert(allowedStudents)
      .values(cleaned.map((studentId) => ({ id: crypto.randomUUID(), studentId })))
      .onConflictDoNothing();
  }
  return NextResponse.json({ ok: true, added: cleaned.length });
}

export async function DELETE() {
  const denied = await requireAdmin();
  if (denied) return denied;

  await db.delete(allowedStudents);
  return NextResponse.json({ ok: true });
}
