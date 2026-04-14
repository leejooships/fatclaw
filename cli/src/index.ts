#!/usr/bin/env bun
import { createInterface } from "node:readline";
import { readConfig, writeConfig, type FatClawConfig } from "./config.js";
import { encryptKey, decryptKey } from "./crypto.js";
import { startChat } from "./chat.js";
import { getClaudeCodeWeeklyTokens } from "./claude-usage.js";

const MOVE_STEP = 60;
const WORLD_MAX = 2980;
const WORLD_MIN = 20;
const DEFAULT_SERVER = "fatclaw-party.h-leejoo99.workers.dev";

const PLAYER_COLORS = [
  "\x1b[38;5;208m", // orange
  "\x1b[38;5;135m", // purple
  "\x1b[38;5;39m",  // blue
  "\x1b[38;5;48m",  // green
  "\x1b[38;5;199m", // pink
  "\x1b[38;5;220m", // yellow
  "\x1b[38;5;196m", // red
  "\x1b[38;5;51m",  // cyan
];

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const CYAN = "\x1b[36m";
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const YELLOW = "\x1b[33m";

const DIRECTIONS: Record<string, [number, number]> = {
  n: [0, -MOVE_STEP], s: [0, MOVE_STEP],
  e: [MOVE_STEP, 0],  w: [-MOVE_STEP, 0],
  ne: [MOVE_STEP, -MOVE_STEP], nw: [-MOVE_STEP, -MOVE_STEP],
  se: [MOVE_STEP, MOVE_STEP],  sw: [-MOVE_STEP, MOVE_STEP],
};

interface Player {
  id: string;
  username: string;
  iconIndex: number;
  x: number;
  y: number;
  weeklyTokens: number;
}

function playerColor(iconIndex: number): string {
  return PLAYER_COLORS[iconIndex % PLAYER_COLORS.length];
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}k`;
  return `${n}`;
}

function ask(
  rl: ReturnType<typeof createInterface>,
  question: string,
): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function getWsUrl(host: string): string {
  if (host.startsWith("ws://") || host.startsWith("wss://")) return host;
  const protocol = host.includes("localhost") ? "ws" : "wss";
  return `${protocol}://${host}/parties/gameserver/main`;
}

async function setup(
  rl: ReturnType<typeof createInterface>,
): Promise<FatClawConfig> {
  console.log(`\n${CYAN}${BOLD}=== Vibe with Friends CLI Setup ===${RESET}\n`);

  const username = await ask(rl, `${CYAN}Username (must match your Google name): ${RESET}`);
  if (!username || username.length > 16) {
    console.error(`${RED}Username must be 1-16 characters.${RESET}`);
    process.exit(1);
  }

  const iconStr = await ask(rl, `${CYAN}Claude icon (0-7, default 0): ${RESET}`);
  const iconIndex = Math.min(7, Math.max(0, parseInt(iconStr) || 0));

  const apiKey = await ask(
    rl,
    `${CYAN}Anthropic API key (sk-ant-..., Enter to skip): ${RESET}`,
  );
  if (apiKey && !apiKey.startsWith("sk-ant-")) {
    console.warn(`${YELLOW}⚠ Doesn't look like an Anthropic key. Continuing anyway.${RESET}`);
  }

  const serverUrl = await ask(
    rl,
    `${CYAN}Party server host (default: ${DEFAULT_SERVER}): ${RESET}`,
  );

  let config: FatClawConfig;
  const finalServerUrl = serverUrl || DEFAULT_SERVER;

  if (apiKey) {
    const shouldEncrypt = await ask(rl, `${CYAN}Encrypt API key with passphrase? (y/n): ${RESET}`);
    if (shouldEncrypt.toLowerCase() === "y") {
      const passphrase = await ask(rl, `${CYAN}Passphrase: ${RESET}`);
      if (!passphrase) {
        console.error(`${RED}Passphrase cannot be empty.${RESET}`);
        process.exit(1);
      }
      const confirm = await ask(rl, `${CYAN}Confirm passphrase: ${RESET}`);
      if (passphrase !== confirm) {
        console.error(`${RED}Passphrases don't match.${RESET}`);
        process.exit(1);
      }
      config = { apiKey: encryptKey(apiKey, passphrase), encrypted: true, username, serverUrl: finalServerUrl, iconIndex };
    } else {
      config = { apiKey, encrypted: false, username, serverUrl: finalServerUrl, iconIndex };
    }
  } else {
    config = { apiKey: "", encrypted: false, username, serverUrl: finalServerUrl, iconIndex };
  }

  writeConfig(config);
  console.log(`\n${GREEN}✓ Config saved to ~/.fatclaw/config${RESET}`);
  return config;
}

function printHelp() {
  console.log(`
${CYAN}${BOLD}Vibe with Friends CLI${RESET}

${YELLOW}Chat:${RESET}
  ${DIM}(just type)${RESET}      Send a chat message

${YELLOW}Movement:${RESET}
  ${BOLD}w/a/s/d${RESET}          Move up/left/down/right
  ${BOLD}/move <dir>${RESET}      Move: n, s, e, w, ne, nw, se, sw

${YELLOW}Claude:${RESET}
  ${BOLD}/ask <prompt>${RESET}    Ask Claude (uses your API key)

${YELLOW}Info:${RESET}
  ${BOLD}/players${RESET}         Who's online
  ${BOLD}/pos${RESET}             Your position

${YELLOW}Other:${RESET}
  ${BOLD}/setup${RESET}           Reconfigure
  ${BOLD}/help${RESET}            This message
  ${BOLD}/quit${RESET}            Exit
`);
}

function clamp(val: number): number {
  return Math.max(WORLD_MIN, Math.min(WORLD_MAX, val));
}

async function startGame(config: FatClawConfig, apiKey: string) {
  const { serverUrl, username, iconIndex } = config;
  const wsUrl = getWsUrl(serverUrl);

  console.log(`\n${CYAN}Connecting to ${DIM}${serverUrl}${RESET}${CYAN} as ${BOLD}${username}${RESET}${CYAN}...${RESET}`);

  let player: Player = { id: "", username, iconIndex, x: 0, y: 0, weeklyTokens: 0 };
  const knownPlayers = new Map<string, Player>();
  let connected = false;
  let intentionalClose = false;

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${DIM}>${RESET} `,
  });

  function printAbove(text: string) {
    process.stdout.write(`\r\x1b[K${text}\n`);
    rl.prompt(true);
  }

  // WebSocket with auto-reconnect
  let ws: WebSocket;

  function connect() {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "join", username, iconIndex }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        switch (data.type) {
          case "init":
            player = data.player;
            connected = true;
            knownPlayers.clear();
            for (const p of data.players as Player[]) knownPlayers.set(p.id, p);
            if (data.players.length > 0) {
              console.log(`${GREEN}✓ Connected! ${data.players.length} player(s) online${RESET}`);
            } else {
              console.log(`${GREEN}✓ Connected!${RESET}`);
            }
            printHelp();
            rl.prompt();
            break;

          case "player_joined":
            knownPlayers.set(data.player.id, data.player);
            if (data.player.id !== player.id) {
              printAbove(`${DIM}→ ${playerColor(data.player.iconIndex)}${data.player.username}${RESET}${DIM} joined${RESET}`);
            }
            break;

          case "player_left":
            knownPlayers.delete(data.id);
            if (data.id !== player.id) {
              printAbove(`${DIM}← ${data.username} left${RESET}`);
            }
            break;

          case "player_moved": {
            const p = knownPlayers.get(data.id);
            if (p) { p.x = data.x; p.y = data.y; }
            break;
          }

          case "chat":
            if (data.message.username !== username) {
              printAbove(`${playerColor(data.message.iconIndex)}${data.message.username}${RESET}: ${data.message.text}`);
            }
            break;

          case "player_updated": {
            const up = knownPlayers.get(data.id);
            if (up) up.weeklyTokens = data.weeklyTokens;
            if (data.id === player.id) player.weeklyTokens = data.weeklyTokens;
            break;
          }
        }
      } catch {
        // ignore malformed messages
      }
    };

    ws.onclose = () => {
      if (!intentionalClose) {
        connected = false;
        printAbove(`${YELLOW}⚠ Disconnected. Reconnecting...${RESET}`);
        setTimeout(connect, 2000);
      }
    };

    ws.onerror = () => {};
  }

  connect();

  // Wait for initial connection
  await new Promise<void>((resolve) => {
    const check = setInterval(() => {
      if (connected) { clearInterval(check); resolve(); }
    }, 100);
  });

  // Sync Claude Code token usage
  async function syncClaudeUsage() {
    try {
      const tokens = await getClaudeCodeWeeklyTokens();
      if (tokens > 0) {
        ws.send(JSON.stringify({ type: "sync_tokens", weeklyTokens: tokens }));
      }
    } catch {
      // ignore
    }
  }

  // Initial sync + periodic refresh (every 30s)
  syncClaudeUsage();
  const usageSyncInterval = setInterval(syncClaudeUsage, 30_000);

  rl.on("line", async (line: string) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }

    // Quit
    if (input === "/quit" || input === "/q") {
      intentionalClose = true;
      clearInterval(usageSyncInterval);
      ws.close();
      rl.close();
      console.log(`${CYAN}Bye!${RESET}`);
      process.exit(0);
    }

    // Help
    if (input === "/help" || input === "/h") {
      printHelp();
      rl.prompt();
      return;
    }

    // Position
    if (input === "/pos") {
      console.log(`${CYAN}Position: (${Math.round(player.x)}, ${Math.round(player.y)})${RESET}`);
      rl.prompt();
      return;
    }

    // Players
    if (input === "/players" || input === "/p") {
      console.log(`\n${CYAN}${BOLD}${knownPlayers.size} player(s) online:${RESET}`);
      for (const p of knownPlayers.values()) {
        const color = playerColor(p.iconIndex);
        const you = p.id === player.id ? ` ${YELLOW}(you)${RESET}` : "";
        const tokenStr = p.weeklyTokens ? ` ${DIM}${formatTokens(p.weeklyTokens)} tokens${RESET}` : "";
        console.log(`  ${color}${p.username}${RESET}${you}${tokenStr}`);
      }
      console.log();
      rl.prompt();
      return;
    }

    // WASD movement (single letter)
    if (/^[wasd]$/i.test(input)) {
      const deltas: Record<string, [number, number]> = {
        W: [0, -MOVE_STEP], S: [0, MOVE_STEP],
        A: [-MOVE_STEP, 0], D: [MOVE_STEP, 0],
      };
      const delta = deltas[input.toUpperCase()];
      if (delta) {
        player.x = clamp(player.x + delta[0]);
        player.y = clamp(player.y + delta[1]);
        ws.send(JSON.stringify({ type: "move", x: player.x, y: player.y }));
      }
      rl.prompt();
      return;
    }

    // /move command
    if (input.startsWith("/move ") || input.startsWith("/m ")) {
      const dir = input.split(" ")[1]?.toLowerCase();
      const delta = DIRECTIONS[dir];
      if (!delta) {
        console.log(`${RED}Unknown direction. Use: n, s, e, w, ne, nw, se, sw${RESET}`);
        rl.prompt();
        return;
      }
      player.x = clamp(player.x + delta[0]);
      player.y = clamp(player.y + delta[1]);
      ws.send(JSON.stringify({ type: "move", x: player.x, y: player.y }));
      console.log(`${DIM}Moved to (${Math.round(player.x)}, ${Math.round(player.y)})${RESET}`);
      rl.prompt();
      return;
    }

    // Ask Claude
    if (input.startsWith("/ask ")) {
      const prompt = input.slice(5).trim();
      if (!apiKey) {
        console.log(`${RED}No API key configured. Run /setup to add one.${RESET}`);
        rl.prompt();
        return;
      }
      console.log(`${DIM}Asking Claude...${RESET}`);
      try {
        await startChat(apiKey, (inp, out) => {
          ws.send(JSON.stringify({ type: "stats", inputTokens: inp, outputTokens: out }));
        }, prompt);
      } catch (e) {
        console.error(`${RED}Claude error: ${e}${RESET}`);
      }
      rl.prompt();
      return;
    }

    // Reconfigure
    if (input === "/setup") {
      intentionalClose = true;
      ws.close();
      rl.close();
      const setupRl = createInterface({ input: process.stdin, output: process.stdout });
      await setup(setupRl);
      setupRl.close();
      console.log(`\n${GREEN}Config updated! Restart the CLI to apply.${RESET}`);
      process.exit(0);
    }

    // Default: send as chat message
    ws.send(JSON.stringify({ type: "chat", text: input }));
    console.log(`${playerColor(iconIndex)}${username}${RESET}: ${input}`);
    rl.prompt();
  });

  rl.on("close", () => {
    intentionalClose = true;
    clearInterval(usageSyncInterval);
    ws.close();
    process.exit(0);
  });
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args[0] === "setup") {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    await setup(rl);
    rl.close();
    return;
  }

  let config = readConfig();

  if (!config) {
    console.log(`${YELLOW}No config found. Let's set things up.${RESET}\n`);
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    config = await setup(rl);
    rl.close();
    console.log(`\n${GREEN}Setup complete! Run again to enter the world.${RESET}`);
    return;
  }

  if (config.iconIndex === undefined) config.iconIndex = 0;

  let apiKey = config.apiKey;
  if (config.encrypted && config.apiKey) {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const passphrase = await ask(rl, `${CYAN}Passphrase: ${RESET}`);
    rl.close();
    const decrypted = decryptKey(config.apiKey, passphrase);
    if (!decrypted) {
      console.error(`${RED}Wrong passphrase.${RESET}`);
      process.exit(1);
    }
    apiKey = decrypted;
  }

  await startGame(config, apiKey);
}

main().catch((err) => {
  console.error(`${RED}Fatal error:${RESET}`, err);
  process.exit(1);
});
