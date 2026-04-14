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
  type ChatMessage,
} from "./game.js";

const MOVE_STEP = 50;

const DIRECTIONS: Record<string, [number, number]> = {
  n: [0, -MOVE_STEP],
  s: [0, MOVE_STEP],
  e: [MOVE_STEP, 0],
  w: [-MOVE_STEP, 0],
  ne: [MOVE_STEP, -MOVE_STEP],
  nw: [-MOVE_STEP, -MOVE_STEP],
  se: [MOVE_STEP, MOVE_STEP],
  sw: [-MOVE_STEP, MOVE_STEP],
  up: [0, -MOVE_STEP],
  down: [0, MOVE_STEP],
  left: [-MOVE_STEP, 0],
  right: [MOVE_STEP, 0],
};

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
  console.log("\x1b[36m=== Vibe with Friends CLI Setup ===\x1b[0m\n");

  const username = await ask(rl, "Your username: ");
  if (!username || username.length > 16) {
    console.error("\x1b[31mUsername must be 1-16 characters.\x1b[0m");
    process.exit(1);
  }

  const iconStr = await ask(rl, "Choose your Claude icon (0-7): ");
  const iconIndex = Math.min(7, Math.max(0, parseInt(iconStr) || 0));

  const apiKey = await ask(
    rl,
    "Your Anthropic API key for /ask (sk-ant-..., or press Enter to skip): ",
  );
  if (apiKey && !apiKey.startsWith("sk-ant-")) {
    console.warn(
      "\x1b[33m⚠ Key doesn't look like an Anthropic key. Continuing anyway.\x1b[0m",
    );
  }

  const serverUrl = await ask(
    rl,
    "Server URL (default: http://localhost:3000): ",
  );

  let config: FatClawConfig;

  if (apiKey) {
    const shouldEncrypt = await ask(
      rl,
      "Encrypt your API key with a passphrase? (y/n): ",
    );
    if (shouldEncrypt.toLowerCase() === "y") {
      const passphrase = await ask(rl, "Choose a passphrase: ");
      if (!passphrase) {
        console.error("\x1b[31mPassphrase cannot be empty.\x1b[0m");
        process.exit(1);
      }
      const confirm = await ask(rl, "Confirm passphrase: ");
      if (passphrase !== confirm) {
        console.error("\x1b[31mPassphrases don't match.\x1b[0m");
        process.exit(1);
      }
      config = {
        apiKey: encryptKey(apiKey, passphrase),
        encrypted: true,
        username,
        serverUrl: serverUrl || "http://localhost:3000",
        iconIndex,
      };
    } else {
      config = {
        apiKey,
        encrypted: false,
        username,
        serverUrl: serverUrl || "http://localhost:3000",
        iconIndex,
      };
    }
  } else {
    config = {
      apiKey: "",
      encrypted: false,
      username,
      serverUrl: serverUrl || "http://localhost:3000",
      iconIndex,
    };
  }

  writeConfig(config);
  console.log(
    `\n\x1b[32m✓ Config saved to ~/.fatclaw/config (permissions: 0600)\x1b[0m`,
  );
  return config;
}

function printHelp() {
  console.log(`
\x1b[36mVibe with Friends CLI\x1b[0m

\x1b[33mCommands:\x1b[0m
  (just type)      Send a chat message
  /move <dir>      Move: n, s, e, w, ne, nw, se, sw
  /players         List online players
  /pos             Show your position
  /ask <prompt>    Ask Claude (requires API key)
  /help            Show this help
  /quit            Exit
`);
}

async function startGame(config: FatClawConfig, apiKey: string) {
  const { serverUrl, username, iconIndex } = config;

  console.log(
    `\n\x1b[36mConnecting to ${serverUrl} as ${username}...\x1b[0m`,
  );

  let player: Player;
  try {
    player = await joinGame(serverUrl, username, iconIndex);
  } catch (e) {
    console.error(`\x1b[31mFailed to join: ${e}\x1b[0m`);
    process.exit(1);
  }

  console.log(
    `\x1b[32m✓ Joined! Position: (${Math.round(player.x)}, ${Math.round(player.y)})\x1b[0m`,
  );
  printHelp();

  // Track seen message IDs to avoid duplicates
  const seenMessages = new Set<string>();

  // Poll for new messages in the background
  const pollInterval = setInterval(async () => {
    try {
      const data = await getPlayers(serverUrl);
      for (const msg of data.messages) {
        if (!seenMessages.has(msg.id) && msg.username !== username) {
          seenMessages.add(msg.id);
          console.log(
            `\n\x1b[33m${msg.username}\x1b[0m: ${msg.text}`,
          );
          rl.prompt(true);
        }
      }
      // Update our player position from server
      const me = data.players.find((p) => p.id === player.id);
      if (me) {
        player.x = me.x;
        player.y = me.y;
      }
    } catch {
      // ignore poll errors
    }
  }, 1500);

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "\x1b[36m> \x1b[0m",
  });

  rl.prompt();

  rl.on("line", async (line: string) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    if (input === "/quit") {
      clearInterval(pollInterval);
      rl.close();
      console.log("\x1b[36mBye!\x1b[0m");
      process.exit(0);
    }

    if (input === "/help") {
      printHelp();
      rl.prompt();
      return;
    }

    if (input === "/pos") {
      console.log(
        `\x1b[36mPosition: (${Math.round(player.x)}, ${Math.round(player.y)})\x1b[0m`,
      );
      rl.prompt();
      return;
    }

    if (input === "/players") {
      try {
        const data = await getPlayers(serverUrl);
        console.log(`\x1b[36m${data.players.length} player(s) online:\x1b[0m`);
        for (const p of data.players) {
          const marker = p.id === player.id ? " \x1b[33m(you)\x1b[0m" : "";
          console.log(
            `  ${p.username} @ (${Math.round(p.x)}, ${Math.round(p.y)})${marker}`,
          );
        }
      } catch (e) {
        console.error(`\x1b[31mError: ${e}\x1b[0m`);
      }
      rl.prompt();
      return;
    }

    if (input.startsWith("/move ")) {
      const dir = input.slice(6).trim().toLowerCase();
      const delta = DIRECTIONS[dir];
      if (!delta) {
        console.log(
          "\x1b[31mUnknown direction. Use: n, s, e, w, ne, nw, se, sw\x1b[0m",
        );
        rl.prompt();
        return;
      }
      try {
        const updated = await movePlayer(
          serverUrl,
          player.id,
          player.x + delta[0],
          player.y + delta[1],
        );
        player.x = updated.x;
        player.y = updated.y;
        console.log(
          `\x1b[36mMoved to (${Math.round(player.x)}, ${Math.round(player.y)})\x1b[0m`,
        );
      } catch (e) {
        console.error(`\x1b[31mMove failed: ${e}\x1b[0m`);
      }
      rl.prompt();
      return;
    }

    if (input.startsWith("/ask ")) {
      const prompt = input.slice(5).trim();
      if (!apiKey) {
        console.log(
          "\x1b[31mNo API key configured. Run setup again to add one.\x1b[0m",
        );
        rl.prompt();
        return;
      }
      console.log("\x1b[36mAsking Claude...\x1b[0m");
      try {
        await startChat(apiKey, username, serverUrl, prompt);
      } catch (e) {
        console.error(`\x1b[31mClaude error: ${e}\x1b[0m`);
      }
      rl.prompt();
      return;
    }

    // Default: send as chat message
    try {
      const msg = await sendChat(serverUrl, player.id, input);
      seenMessages.add(msg.id);
      console.log(`\x1b[33m${username}\x1b[0m: ${input}`);
    } catch (e) {
      console.error(`\x1b[31mChat failed: ${e}\x1b[0m`);
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

  // Handle setup command
  if (args[0] === "setup") {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    await setup(rl);
    rl.close();
    return;
  }

  // Load config
  let config = readConfig();

  if (!config) {
    console.log("\x1b[33mNo config found. Let's set things up.\x1b[0m\n");
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    config = await setup(rl);
    rl.close();
    console.log(
      "\n\x1b[32mSetup complete! Run again to enter the world.\x1b[0m",
    );
    return;
  }

  // Handle missing iconIndex from old configs
  if (config.iconIndex === undefined) {
    config.iconIndex = 0;
  }

  // Decrypt API key if needed
  let apiKey = config.apiKey;
  if (config.encrypted && config.apiKey) {
    const rl = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const passphrase = await ask(rl, "Enter passphrase to unlock API key: ");
    rl.close();

    const decrypted = decryptKey(config.apiKey, passphrase);
    if (!decrypted) {
      console.error("\x1b[31mWrong passphrase.\x1b[0m");
      process.exit(1);
    }
    apiKey = decrypted;
  }

  await startGame(config, apiKey);
}

main().catch((err) => {
  console.error("\x1b[31mFatal error:\x1b[0m", err);
  process.exit(1);
});
