import { NextResponse } from "next/server";
import { isAdminRequest } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const authed = await isAdminRequest();
  return NextResponse.json({ authed });
}
