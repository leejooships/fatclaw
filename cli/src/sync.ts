#!/usr/bin/env bun
/**
 * Lightweight background sync: reads Claude Code token usage from ~/.claude/
 * and pushes it to the party server without joining as a player.
 *
 * Usage: bun run cli/src/sync.ts [username]
 *
 * If username is omitted, reads from ~/.fatclaw/config.
 */
import { getClaudeCodeWeeklyTokens } from "./claude-usage.js";
import { readConfig } from "./config.js";

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";

const DEFAULT_SERVER = "fatclaw-party.h-leejoo99.workers.dev";
const SYNC_INTERVAL_MS = 30_000;

function getWsUrl(host: string): string {
  if (host.startsWith("ws://") || host.startsWith("wss://")) return host;
  const protocol = host.includes("localhost") ? "ws" : "wss";
  return `${protocol}://${host}/parties/game-server/main`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

async function main() {
  let username = process.argv[2];
  let serverUrl = DEFAULT_SERVER;

  if (!username) {
    const config = readConfig();
    if (config) {
      username = config.username;
      serverUrl = config.serverUrl || DEFAULT_SERVER;
    }
  }

  if (!username) {
    console.error(`${RED}Usage: bun run sync.ts <username>${RESET}`);
    console.error(`${DIM}Or run 'bun start' first to create a config.${RESET}`);
    process.exit(1);
  }

  const wsUrl = getWsUrl(serverUrl);
  console.log(`${CYAN}Syncing Claude Code usage for ${username}${RESET}`);
  console.log(`${DIM}Server: ${serverUrl}${RESET}`);

  // Initial read
  const initialTokens = await getClaudeCodeWeeklyTokens();
  console.log(`${GREEN}Current weekly usage: ${formatTokens(initialTokens)} tokens${RESET}`);

  let ws: WebSocket;
  let connected = false;

  function connect() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      connected = true;
      console.log(`${GREEN}Connected to server${RESET}`);
      sync();
    };

    ws.onclose = () => {
      connected = false;
      console.log(`${YELLOW}Disconnected, reconnecting in 5s...${RESET}`);
      setTimeout(connect, 5000);
    };

    ws.onerror = () => {};
  }

  async function sync() {
    if (!connected) return;
    try {
      const tokens = await getClaudeCodeWeeklyTokens();
      ws.send(JSON.stringify({
        type: "sync_for_user",
        username,
        weeklyTokens: tokens,
      }));
      console.log(`${DIM}[${new Date().toLocaleTimeString()}] Synced: ${formatTokens(tokens)} tokens${RESET}`);
    } catch (e) {
      console.error(`${RED}Sync error: ${e}${RESET}`);
    }
  }

  connect();

  // Periodic sync
  setInterval(sync, SYNC_INTERVAL_MS);

  // Keep alive
  process.on("SIGINT", () => {
    console.log(`\n${CYAN}Stopping sync.${RESET}`);
    ws?.close();
    process.exit(0);
  });
}

main().catch((err) => {
  console.error(`${RED}Fatal: ${err}${RESET}`);
  process.exit(1);
});
