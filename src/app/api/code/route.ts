import { NextRequest, NextResponse } from "next/server";
import { updateCode } from "@/lib/gameState";

export async function POST(req: NextRequest) {
  const { id, linesOfCode } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const player = updateCode(id, linesOfCode);
  if (!player) return NextResponse.json({ error: "Player not found" }, { status: 404 });

  return NextResponse.json(player);
}
