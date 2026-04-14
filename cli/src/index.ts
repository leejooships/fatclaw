#!/usr/bin/env bun
import { createInterface } from "node:readline";
import { readConfig, writeConfig, type FatClawConfig } from "./config.js";
import { encryptKey, decryptKey } from "./crypto.js";
import { startChat } from "./chat.js";
import {
  joinGame,
  movePlayer,
  sendChat,
  getPlayers,
  type Player,
} from "./game.js";

const MOVE_STEP = 60;
const DEFAULT_SERVER = "https://fatclaw.vercel.app";

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
  // WASD aliases
  W: [0, -MOVE_STEP], S: [0, MOVE_STEP],
  A: [-MOVE_STEP, 0], D: [MOVE_STEP, 0],
};

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
    `${CYAN}Server URL (default: ${DEFAULT_SERVER}): ${RESET}`,
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

async function startGame(config: FatClawConfig, apiKey: string) {
  const { serverUrl, username, iconIndex } = config;

  console.log(`\n${CYAN}Connecting to ${DIM}${serverUrl}${RESET}${CYAN} as ${BOLD}${username}${RESET}${CYAN}...${RESET}`);

  let player: Player;
  try {
    player = await joinGame(serverUrl, username, iconIndex);
  } catch (e) {
    console.error(`${RED}Failed to join: ${e}${RESET}`);
    process.exit(1);
  }

  // Get initial state
  let knownPlayerIds = new Set<string>();
  const seenMessages = new Set<string>();

  try {
    const initial = await getPlayers(serverUrl);
    for (const p of initial.players) knownPlayerIds.add(p.id);
    // Seed seen messages so we don't replay history
    for (const msg of initial.messages) seenMessages.add(msg.id);

    console.log(`${GREEN}✓ Connected! ${initial.players.length} player(s) online${RESET}`);
  } catch {
    console.log(`${GREEN}✓ Connected!${RESET}`);
  }

  printHelp();

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: `${DIM}>${RESET} `,
  });

  // Clear current line and print message above the prompt
  function printAbove(text: string) {
    process.stdout.write(`\r\x1b[K${text}\n`);
    rl.prompt(true);
  }

  // Poll: keepalive + incoming messages + player tracking
  const pollInterval = setInterval(async () => {
    try {
      const data = await getPlayers(serverUrl);

      // Track joins/leaves
      const currentIds = new Set(data.players.map((p) => p.id));
      for (const p of data.players) {
        if (!knownPlayerIds.has(p.id) && p.id !== player.id) {
          printAbove(`${DIM}→ ${playerColor(p.iconIndex)}${p.username}${RESET}${DIM} joined${RESET}`);
        }
      }
      for (const id of knownPlayerIds) {
        if (!currentIds.has(id) && id !== player.id) {
          printAbove(`${DIM}← player left${RESET}`);
        }
      }
      knownPlayerIds = currentIds;

      // New chat messages
      for (const msg of data.messages) {
        if (!seenMessages.has(msg.id) && msg.username !== username) {
          seenMessages.add(msg.id);
          printAbove(`${playerColor(msg.iconIndex)}${msg.username}${RESET}: ${msg.text}`);
        }
      }

      // Sync position
      const me = data.players.find((p) => p.id === player.id);
      if (me) {
        player.x = me.x;
        player.y = me.y;
      } else {
        // Got disconnected, rejoin silently
        try {
          const rejoined = await joinGame(serverUrl, username, iconIndex);
          player.id = rejoined.id;
          player.x = rejoined.x;
          player.y = rejoined.y;
          printAbove(`${YELLOW}⚠ Reconnected${RESET}`);
        } catch {
          // will retry next poll
        }
      }
    } catch {
      // ignore poll errors
    }
  }, 2000);

  rl.prompt();

  rl.on("line", async (line: string) => {
    const input = line.trim();
    if (!input) { rl.prompt(); return; }

    // Quit
    if (input === "/quit" || input === "/q") {
      clearInterval(pollInterval);
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
      try {
        const data = await getPlayers(serverUrl);
        console.log(`\n${CYAN}${BOLD}${data.players.length} player(s) online:${RESET}`);
        for (const p of data.players) {
          const color = playerColor(p.iconIndex);
          const you = p.id === player.id ? ` ${YELLOW}(you)${RESET}` : "";
          const tokens = (p as Player & { weeklyTokens?: number }).weeklyTokens;
          const tokenStr = tokens ? ` ${DIM}${formatTokens(tokens)} tokens${RESET}` : "";
          console.log(`  ${color}${p.username}${RESET}${you}${tokenStr}`);
        }
        console.log();
      } catch (e) {
        console.error(`${RED}Error: ${e}${RESET}`);
      }
      rl.prompt();
      return;
    }

    // WASD movement (single letter)
    if (/^[wasd]$/i.test(input)) {
      const delta = DIRECTIONS[input.toUpperCase()];
      if (delta) {
        try {
          const updated = await movePlayer(serverUrl, player.id, player.x + delta[0], player.y + delta[1]);
          player.x = updated.x;
          player.y = updated.y;
        } catch { /* ignore */ }
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
      try {
        const updated = await movePlayer(serverUrl, player.id, player.x + delta[0], player.y + delta[1]);
        player.x = updated.x;
        player.y = updated.y;
        console.log(`${DIM}Moved to (${Math.round(player.x)}, ${Math.round(player.y)})${RESET}`);
      } catch (e) {
        console.error(`${RED}Move failed: ${e}${RESET}`);
      }
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
        await startChat(apiKey, username, serverUrl, prompt);
      } catch (e) {
        console.error(`${RED}Claude error: ${e}${RESET}`);
      }
      rl.prompt();
      return;
    }

    // Reconfigure
    if (input === "/setup") {
      clearInterval(pollInterval);
      rl.close();
      const setupRl = createInterface({ input: process.stdin, output: process.stdout });
      await setup(setupRl);
      setupRl.close();
      console.log(`\n${GREEN}Config updated! Restart the CLI to apply.${RESET}`);
      process.exit(0);
    }

    // Default: send as chat message
    try {
      const msg = await sendChat(serverUrl, player.id, input);
      seenMessages.add(msg.id);
      console.log(`${playerColor(iconIndex)}${username}${RESET}: ${input}`);
    } catch (e) {
      console.error(`${RED}Chat failed: ${e}${RESET}`);
    }
    rl.prompt();
  });

  rl.on("close", () => {
    clearInterval(pollInterval);
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
