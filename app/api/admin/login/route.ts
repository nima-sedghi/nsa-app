import { NextResponse } from "next/server";
import { verifyAdminPassword, createAdminSession } from "@/lib/auth";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ip = getClientIp(req);
  const okRate = await checkRateLimit(`admin-login:${ip}`, 8, 60);
  if (!okRate) {
    return NextResponse.json({ error: "تعداد تلاش زیاد بود، یه دقیقه صبر کن." }, { status: 429 });
  }

  const body = await req.json().catch(() => null);
  const password = body?.password;
  if (typeof password !== "string" || !password) {
    return NextResponse.json({ error: "رمز لازمه" }, { status: 400 });
  }

  const ok = await verifyAdminPassword(password);
  if (!ok) {
    return NextResponse.json({ error: "رمز اشتباهه" }, { status: 401 });
  }

  await createAdminSession();
  return NextResponse.json({ ok: true });
}
