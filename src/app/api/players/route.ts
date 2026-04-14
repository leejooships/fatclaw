import { NextResponse } from "next/server";
import { getActivePlayers, syncWeeklyTokens } from "@/lib/gameState";
import { getMessages } from "@/lib/chatState";
import { getWeeklyStats } from "@/lib/statsState";

export const dynamic = "force-dynamic";

export async function GET() {
  // Sync weekly token usage into player data
  const weeklyStats = getWeeklyStats();
  const tokensByUsername: Record<string, number> = {};
  for (const [username, stats] of Object.entries(weeklyStats)) {
    tokensByUsername[username.toLowerCase()] = stats.totalTokens;
  }
  syncWeeklyTokens(tokensByUsername);

  const players = getActivePlayers();
  const messages = getMessages();
  return NextResponse.json({ players, messages });
}
