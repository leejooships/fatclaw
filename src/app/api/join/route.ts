import { NextRequest, NextResponse } from "next/server";
import { joinGame } from "@/lib/gameState";

export async function POST(req: NextRequest) {
  const { username, iconIndex } = await req.json();

  if (!username || typeof username !== "string" || username.trim().length < 1) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }
  if (username.length > 16) {
    return NextResponse.json({ error: "Username too long" }, { status: 400 });
  }

  const player = joinGame(username.trim(), iconIndex ?? 0);
  return NextResponse.json(player);
}
