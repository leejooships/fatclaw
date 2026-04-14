import { NextResponse } from "next/server";
import { getActivePlayers } from "@/lib/gameState";
import { getMessages } from "@/lib/chatState";

export const dynamic = "force-dynamic";

export async function GET() {
  const players = getActivePlayers();
  const messages = getMessages();
  return NextResponse.json({ players, messages });
}
