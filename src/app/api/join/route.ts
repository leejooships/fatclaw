import { NextRequest, NextResponse } from "next/server";
import { joinGame } from "@/lib/gameState";
import { verifyGoogleToken } from "@/lib/googleAuth";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { iconIndex } = body;

  // Google sign-in path
  if (body.googleIdToken) {
    const payload = await verifyGoogleToken(body.googleIdToken);
    if (!payload) {
      return NextResponse.json(
        { error: "Invalid Google token" },
        { status: 401 },
      );
    }
    const username = payload.name.slice(0, 16);
    const player = joinGame(username, iconIndex ?? 0, payload.sub);
    return NextResponse.json(player);
  }

  // CLI / legacy path
  const { username } = body;
  if (!username || typeof username !== "string" || username.trim().length < 1) {
    return NextResponse.json({ error: "Username required" }, { status: 400 });
  }
  if (username.length > 16) {
    return NextResponse.json({ error: "Username too long" }, { status: 400 });
  }

  const player = joinGame(username.trim(), iconIndex ?? 0);
  return NextResponse.json(player);
}
