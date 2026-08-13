import { NextResponse } from "next/server";
import { z } from "zod";
import crypto from "crypto";
import { db } from "@/lib/db";
import { professors } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const Schema = z.object({ name: z.string().trim().min(1).max(200) });

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "نام نامعتبره" }, { status: 400 });

  const newId = crypto.randomUUID();
  await db.insert(professors).values({ id: newId, courseId: id, name: parsed.data.name });
  return NextResponse.json({ ok: true, id: newId });
}
