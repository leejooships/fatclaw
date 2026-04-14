export interface TokenUsageEntry {
  username: string;
  inputTokens: number;
  outputTokens: number;
  timestamp: number;
}

export interface UserWeeklyStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestCount: number;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_TOKENS_PER_ENTRY = 10_000_000;

const usageEntries: TokenUsageEntry[] = [];

function prune() {
  const cutoff = Date.now() - SEVEN_DAYS_MS;
  while (usageEntries.length > 0 && usageEntries[0].timestamp < cutoff) {
    usageEntries.shift();
  }
}

export function recordUsage(entry: {
  username: string;
  inputTokens: number;
  outputTokens: number;
  timestamp: number;
}): boolean {
  // Validate
  if (
    typeof entry.username !== "string" ||
    entry.username.length < 1 ||
    entry.username.length > 16
  )
    return false;
  if (
    !Number.isInteger(entry.inputTokens) ||
    entry.inputTokens < 0 ||
    entry.inputTokens > MAX_TOKENS_PER_ENTRY
  )
    return false;
  if (
    !Number.isInteger(entry.outputTokens) ||
    entry.outputTokens < 0 ||
    entry.outputTokens > MAX_TOKENS_PER_ENTRY
  )
    return false;

  const now = Date.now();
  const oneHourAgo = now - 60 * 60 * 1000;
  if (entry.timestamp < oneHourAgo || entry.timestamp > now + 60_000)
    return false;

  usageEntries.push({
    username: entry.username,
    inputTokens: entry.inputTokens,
    outputTokens: entry.outputTokens,
    timestamp: entry.timestamp,
  });

  prune();
  return true;
}

export function getWeeklyStats(): Record<string, UserWeeklyStats> {
  prune();
  const stats: Record<string, UserWeeklyStats> = {};

  for (const entry of usageEntries) {
    if (!stats[entry.username]) {
      stats[entry.username] = {
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        requestCount: 0,
      };
    }
    const s = stats[entry.username];
    s.inputTokens += entry.inputTokens;
    s.outputTokens += entry.outputTokens;
    s.totalTokens += entry.inputTokens + entry.outputTokens;
    s.requestCount++;
  }

  return stats;
}

export function getUserStats(username: string): TokenUsageEntry[] {
  prune();
  return usageEntries.filter(
    (e) => e.username.toLowerCase() === username.toLowerCase(),
  );
}
