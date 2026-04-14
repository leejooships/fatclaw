#!/usr/bin/env bun
import { createInterface } from "node:readline";
import { readConfig, writeConfig, type FatClawConfig } from "./config.js";
import { encryptKey, decryptKey } from "./crypto.js";
import { startChat } from "./chat.js";

function ask(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

async function setup(rl: ReturnType<typeof createInterface>): Promise<FatClawConfig> {
  console.log("\x1b[36m=== FatClaw CLI Setup ===\x1b[0m\n");

  const username = await ask(rl, "Your FatClaw username: ");
  if (!username || username.length > 16) {
    console.error("\x1b[31mUsername must be 1-16 characters.\x1b[0m");
    process.exit(1);
  }

  const apiKey = await ask(rl, "Your Anthropic API key (sk-ant-...): ");
  if (!apiKey.startsWith("sk-ant-")) {
    console.warn("\x1b[33m⚠ Key doesn't look like an Anthropic key. Continuing anyway.\x1b[0m");
  }

  const serverUrl = await ask(rl, "FatClaw server URL (default: http://localhost:3000): ");

  const shouldEncrypt = await ask(rl, "Encrypt your API key with a passphrase? (y/n): ");

  let config: FatClawConfig;

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
    };
  } else {
    config = {
      apiKey,
      encrypted: false,
      username,
      serverUrl: serverUrl || "http://localhost:3000",
    };
  }

  writeConfig(config);
  console.log(`\n\x1b[32m✓ Config saved to ~/.fatclaw/config (permissions: 0600)\x1b[0m`);
  return config;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  // Handle setup command
  if (args[0] === "setup") {
    await setup(rl);
    rl.close();
    return;
  }

  // Load config
  let config = readConfig();

  if (!config) {
    console.log("\x1b[33mNo config found. Let's set things up.\x1b[0m\n");
    config = await setup(rl);
    rl.close();
    console.log("\n\x1b[32mSetup complete! Run \x1b[36mfatclaw\x1b[32m again to start chatting.\x1b[0m");
    return;
  }

  rl.close();

  // Decrypt API key if needed
  let apiKey = config.apiKey;
  if (config.encrypted) {
    const rl2 = createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const passphrase = await ask(rl2, "Enter passphrase to unlock API key: ");
    rl2.close();

    const decrypted = decryptKey(config.apiKey, passphrase);
    if (!decrypted) {
      console.error("\x1b[31mWrong passphrase.\x1b[0m");
      process.exit(1);
    }
    apiKey = decrypted;
  }

  // Start chat
  await startChat(apiKey, config.username, config.serverUrl);
}

main().catch((err) => {
  console.error("\x1b[31mFatal error:\x1b[0m", err);
  process.exit(1);
});
