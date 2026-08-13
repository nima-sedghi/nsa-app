import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { courses } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

const RenameSchema = z.object({ name: z.string().trim().min(1).max(200) });

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;

  const body = await req.json().catch(() => null);
  const parsed = RenameSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "نام نامعتبره" }, { status: 400 });

  await db.update(courses).set({ name: parsed.data.name }).where(eq(courses.id, id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = await requireAdmin();
  if (denied) return denied;
  const { id } = await params;

  // ON DELETE CASCADE on professors/votes takes care of the rest.
  await db.delete(courses).where(eq(courses.id, id));
  return NextResponse.json({ ok: true });
}
