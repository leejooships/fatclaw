import { NextRequest, NextResponse } from "next/server";
import { movePlayer } from "@/lib/gameState";

export async function POST(req: NextRequest) {
  const { id, x, y } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const player = movePlayer(id, x, y);
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  return NextResponse.json(player);
}
