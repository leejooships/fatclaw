import { existsSync, mkdirSync, readFileSync, writeFileSync, statSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export interface FatClawConfig {
  apiKey: string;
  encrypted: boolean;
  username: string;
  serverUrl: string;
  iconIndex: number;
  syncUsername?: string;
}

const CONFIG_DIR = join(homedir(), ".fatclaw");
const CONFIG_FILE = join(CONFIG_DIR, "config");

export function getConfigPath(): string {
  return CONFIG_FILE;
}

export function ensureConfigDir(): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { mode: 0o700 });
  }
}

function checkPermissions(path: string, expected: number): boolean {
  try {
    const mode = statSync(path).mode & 0o777;
    return mode === expected;
  } catch {
    return false;
  }
}

export function readConfig(): FatClawConfig | null {
  if (!existsSync(CONFIG_FILE)) return null;

  // Warn if permissions are too open
  if (!checkPermissions(CONFIG_FILE, 0o600)) {
    console.warn(
      "\x1b[33m⚠ Warning: config file permissions are too open. Run: chmod 600 " +
        CONFIG_FILE +
        "\x1b[0m",
    );
  }

  try {
    const raw = readFileSync(CONFIG_FILE, "utf-8");
    return JSON.parse(raw) as FatClawConfig;
  } catch {
    return null;
  }
}

export function writeConfig(config: FatClawConfig): void {
  ensureConfigDir();
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
  // Ensure permissions even if file existed
  chmodSync(CONFIG_FILE, 0o600);
}

export function clearConfig(): void {
  if (existsSync(CONFIG_FILE)) {
    writeFileSync(CONFIG_FILE, "", { mode: 0o600 });
  }
}
