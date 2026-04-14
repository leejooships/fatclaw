import { NextRequest, NextResponse } from "next/server";
import { recordUsage, getWeeklyStats, getUserStats } from "@/lib/statsState";
import { checkRateLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Rate limit: 30 requests per minute per IP
  const ip = req.headers.get("x-forwarded-for") ?? "unknown";
  if (!checkRateLimit(`stats:${ip}`, 30, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await req.json();
  const { username, inputTokens, outputTokens, timestamp } = body;

  const ok = recordUsage({ username, inputTokens, outputTokens, timestamp });
  if (!ok) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");

  if (username) {
    const entries = getUserStats(username);
    return NextResponse.json({ username, entries });
  }

  const stats = getWeeklyStats();
  return NextResponse.json(stats);
}
