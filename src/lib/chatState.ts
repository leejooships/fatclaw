import { getPlayer } from "./gameState";

export interface ChatMessage {
  id: string;
  username: string;
  iconIndex: number;
  text: string;
  timestamp: number;
}

const MAX_MESSAGES = 50;
const MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes
const MAX_TEXT_LENGTH = 200;

const messages: ChatMessage[] = [];

function sanitizeText(raw: string): string {
  return raw.replace(/<[^>]*>/g, "").trim().slice(0, MAX_TEXT_LENGTH);
}

function prune() {
  const cutoff = Date.now() - MAX_AGE_MS;
  // Remove expired messages from the front
  while (messages.length > 0 && messages[0].timestamp < cutoff) {
    messages.shift();
  }
  // Keep only the last MAX_MESSAGES
  while (messages.length > MAX_MESSAGES) {
    messages.shift();
  }
}

export function addMessage(
  playerId: string,
  text: string,
): ChatMessage | null {
  const player = getPlayer(playerId);
  if (!player) return null;

  const sanitized = sanitizeText(text);
  if (sanitized.length === 0) return null;

  const msg: ChatMessage = {
    id: Math.random().toString(36).slice(2, 10),
    username: player.username,
    iconIndex: player.iconIndex,
    text: sanitized,
    timestamp: Date.now(),
  };

  messages.push(msg);
  prune();
  return msg;
}

export function getMessages(since?: number): ChatMessage[] {
  prune();
  if (since == null) return [...messages];
  return messages.filter((m) => m.timestamp > since);
}
