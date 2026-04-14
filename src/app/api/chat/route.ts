import { NextRequest, NextResponse } from "next/server";
import { addMessage } from "@/lib/chatState";
import { checkRateLimit } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { playerId, text } = body;

  if (typeof playerId !== "string" || !playerId) {
    return NextResponse.json({ error: "Missing playerId" }, { status: 400 });
  }
  if (typeof text !== "string" || !text.trim()) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }
  if (text.length > 200) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  // Rate limit: 10 messages per 10 seconds per player
  if (!checkRateLimit(`chat:${playerId}`, 10, 10_000)) {
    return NextResponse.json({ error: "Too many messages" }, { status: 429 });
  }

  const msg = addMessage(playerId, text);
  if (!msg) {
    return NextResponse.json({ error: "Player not found or invalid message" }, { status: 404 });
  }

  return NextResponse.json(msg);
}
