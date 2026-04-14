import Anthropic from "@anthropic-ai/sdk";
import { createInterface } from "node:readline";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export async function startChat(
  apiKey: string,
  onUsage: (inputTokens: number, outputTokens: number) => void,
  singlePrompt?: string,
): Promise<void> {
  const client = new Anthropic({ apiKey });
  const messages: Message[] = [];

  // Single prompt mode (from /ask command)
  if (singlePrompt) {
    messages.push({ role: "user", content: singlePrompt });
    try {
      process.stdout.write("\x1b[35mclaude>\x1b[0m ");
      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages,
      });
      const text =
        response.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("") || "(no text response)";
      console.log(text);
      console.log();
      onUsage(response.usage.input_tokens, response.usage.output_tokens);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.log(`\x1b[31mError: ${msg}\x1b[0m`);
    }
    return;
  }

  // Interactive mode
  const rl = createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  console.log("\x1b[36m╔══════════════════════════════════════╗\x1b[0m");
  console.log("\x1b[36m║\x1b[0m  Vibe with Friends — Claude Chat     \x1b[36m║\x1b[0m");
  console.log("\x1b[36m║\x1b[0m  Token usage grows your character     \x1b[36m║\x1b[0m");
  console.log("\x1b[36m║\x1b[0m                                      \x1b[36m║\x1b[0m");
  console.log("\x1b[36m║\x1b[0m  Commands:                           \x1b[36m║\x1b[0m");
  console.log("\x1b[36m║\x1b[0m    /quit   — exit                    \x1b[36m║\x1b[0m");
  console.log("\x1b[36m║\x1b[0m    /clear  — reset conversation      \x1b[36m║\x1b[0m");
  console.log("\x1b[36m║\x1b[0m    /help   — show this message       \x1b[36m║\x1b[0m");
  console.log("\x1b[36m╚══════════════════════════════════════╝\x1b[0m");
  console.log();

  const prompt = (): Promise<string> =>
    new Promise((resolve) => {
      rl.question("\x1b[32myou>\x1b[0m ", (answer) => resolve(answer));
    });

  while (true) {
    const input = await prompt();
    const trimmed = input.trim();

    if (!trimmed) continue;

    if (trimmed === "/quit") {
      console.log("\x1b[33mGoodbye!\x1b[0m");
      rl.close();
      return;
    }

    if (trimmed === "/clear") {
      messages.length = 0;
      console.log("\x1b[33mConversation cleared.\x1b[0m");
      continue;
    }

    if (trimmed === "/help") {
      console.log("  /quit   — exit");
      console.log("  /clear  — reset conversation");
      console.log("  /help   — show this message");
      continue;
    }

    messages.push({ role: "user", content: trimmed });

    try {
      process.stdout.write("\x1b[35mclaude>\x1b[0m ");

      const response = await client.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 1024,
        messages,
      });

      const text =
        response.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("") || "(no text response)";

      console.log(text);
      console.log();

      messages.push({ role: "assistant", content: text });

      // Report token usage via callback
      onUsage(response.usage.input_tokens, response.usage.output_tokens);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      console.log(`\x1b[31mError: ${msg}\x1b[0m`);
      messages.pop();
    }
  }
}
