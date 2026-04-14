import { readdir } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Read Claude Code's local JSONL logs to calculate weekly token usage.
 * Scans ~/.claude/projects/ for assistant messages with usage data.
 */
export async function getClaudeCodeWeeklyTokens(): Promise<number> {
  const projectsDir = join(homedir(), ".claude", "projects");
  const cutoff = new Date(Date.now() - SEVEN_DAYS_MS).toISOString();
  let totalTokens = 0;

  const jsonlFiles = await findJsonlFiles(projectsDir);

  for (const filePath of jsonlFiles) {
    try {
      const file = Bun.file(filePath);
      // Skip files not modified in the last 7 days
      const stat = await file.stat();
      if (stat.mtimeMs < Date.now() - SEVEN_DAYS_MS) continue;

      const content = await file.text();
      for (const line of content.split("\n")) {
        if (!line.includes('"usage"')) continue;
        try {
          const entry = JSON.parse(line);
          if (entry.type !== "assistant") continue;
          if (entry.timestamp && entry.timestamp < cutoff) continue;

          const usage = entry.message?.usage;
          if (!usage) continue;

          totalTokens +=
            (usage.input_tokens || 0) +
            (usage.cache_creation_input_tokens || 0) +
            (usage.cache_read_input_tokens || 0) +
            (usage.output_tokens || 0);
        } catch {
          // skip malformed lines
        }
      }
    } catch {
      // skip unreadable files
    }
  }

  return totalTokens;
}

async function findJsonlFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...(await findJsonlFiles(fullPath)));
      } else if (entry.name.endsWith(".jsonl")) {
        files.push(fullPath);
      }
    }
  } catch {
    // directory doesn't exist or not readable
  }
  return files;
}
