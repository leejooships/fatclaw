export async function reportUsage(
  serverUrl: string,
  data: {
    username: string;
    inputTokens: number;
    outputTokens: number;
    timestamp: number;
  },
): Promise<void> {
  try {
    await fetch(`${serverUrl}/api/stats`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {
    // Fire-and-forget — don't block the chat
  }
}

export async function fetchMyStats(
  serverUrl: string,
  username: string,
): Promise<void> {
  try {
    const res = await fetch(
      `${serverUrl}/api/stats?username=${encodeURIComponent(username)}`,
    );
    if (!res.ok) {
      console.log("\x1b[31mFailed to fetch stats\x1b[0m");
      return;
    }
    const data = await res.json();
    const entries = data.entries ?? [];

    if (entries.length === 0) {
      console.log("\x1b[33mNo usage recorded yet this week.\x1b[0m");
      return;
    }

    let totalIn = 0;
    let totalOut = 0;
    for (const e of entries) {
      totalIn += e.inputTokens;
      totalOut += e.outputTokens;
    }

    console.log("\x1b[36m┌─── Your Weekly Stats ───┐\x1b[0m");
    console.log(`\x1b[36m│\x1b[0m Requests:   ${entries.length}`);
    console.log(`\x1b[36m│\x1b[0m Input:      ${totalIn.toLocaleString()} tokens`);
    console.log(`\x1b[36m│\x1b[0m Output:     ${totalOut.toLocaleString()} tokens`);
    console.log(
      `\x1b[36m│\x1b[0m Total:      \x1b[33m${(totalIn + totalOut).toLocaleString()} tokens\x1b[0m`,
    );
    console.log("\x1b[36m└─────────────────────────┘\x1b[0m");
  } catch {
    console.log("\x1b[31mCould not reach server\x1b[0m");
  }
}
