#!/usr/bin/env bun
/**
 * Background sync: reads Claude Code token usage from ~/.claude/
 * and pushes it to the party server.
 *
 * Usage: bun run sync [in-game-name]
 *
 * On first run, prompts for your in-game name and saves it.
 */
import { createInterface } from "node:readline";
import { getClaudeCodeWeeklyTokens } from "./claude-usage.js";
import { readConfig, writeConfig } from "./config.js";

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";

const DEFAULT_SERVER = "https://fatclaw.h-leejoo99.workers.dev";
const WS_SERVER = "fatclaw-party.h-leejoo99.workers.dev";
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

function ask(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function main() {
  let username = process.argv[2];
  const config = readConfig();

  // Use saved syncUsername if no argument given
  if (!username && config?.syncUsername) {
    username = config.syncUsername;
  }

  // Prompt for in-game name if we still don't have one
  if (!username) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    console.log(`\n${CYAN}What's your in-game name?${RESET}`);
    console.log(`${DIM}This must match the nickname you picked on the website.${RESET}`);
    username = await ask(rl, `${CYAN}> ${RESET}`);
    rl.close();

    if (!username) {
      console.error(`${RED}Name is required.${RESET}`);
      process.exit(1);
    }

    // Save it so they don't have to enter it again
    const updatedConfig = config || {
      apiKey: "",
      encrypted: false,
      username: username,
      serverUrl: WS_SERVER,
      iconIndex: 0,
    };
    updatedConfig.syncUsername = username;
    writeConfig(updatedConfig);
    console.log(`${GREEN}Saved! Next time just run: bun run sync${RESET}\n`);
  }

  const wsUrl = getWsUrl(WS_SERVER);
  console.log(`${CYAN}Syncing Claude Code usage for ${username}${RESET}`);
  console.log(`${DIM}Server: ${DEFAULT_SERVER}${RESET}`);

  const initialTokens = await getClaudeCodeWeeklyTokens();
  console.log(`${GREEN}Current weekly usage: ${formatTokens(initialTokens)} tokens${RESET}`);

  let ws: WebSocket;
  let connected = false;

  function connect() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      connected = true;
      console.log(`${GREEN}Connected to ${DEFAULT_SERVER}${RESET}`);
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
        secret: "fclaw_s3cr3t_2024",
      }));
      console.log(`${DIM}[${new Date().toLocaleTimeString()}] Synced: ${formatTokens(tokens)} tokens${RESET}`);
    } catch (e) {
      console.error(`${RED}Sync error: ${e}${RESET}`);
    }
  }

  connect();
  setInterval(sync, SYNC_INTERVAL_MS);

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
