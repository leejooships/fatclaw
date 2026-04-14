import { Server, routePartykitRequest } from "partyserver";
import type { Connection } from "partyserver";

interface Player {
  id: string;
  username: string;
  iconIndex: number;
  x: number;
  y: number;
  weeklyTokens: number;
  isAdmin: boolean;
}

interface ChatMessage {
  id: string;
  username: string;
  iconIndex: number;
  text: string;
  timestamp: number;
}

const WORLD_W = 3000;
const WORLD_H = 3000;
const MAX_MESSAGES = 50;
const MAX_AGE_MS = 10 * 60 * 1000;
const MAX_TEXT_LENGTH = 200;
const MAX_WEEKLY_TOKENS = 2_000_000_000; // 2B cap
const SYNC_SECRET = "fclaw_s3cr3t_2024";
// Admin usernames (case-insensitive) — server-authoritative, not client-spoofable
const ADMIN_USERNAMES = ["leejoo", "leej"];

export class GameServer extends Server {
  players = new Map<string, Player>();
  messages: ChatMessage[] = [];
  rateLimits = new Map<string, number[]>();
  lastMoveBroadcast = new Map<string, number>();

  onConnect(_conn: Connection) {
    // Wait for "join" message before creating a player
  }

  onMessage(conn: Connection, message: string | ArrayBuffer) {
    try {
      const raw = typeof message === "string" ? message : new TextDecoder().decode(message);
      const data = JSON.parse(raw);
      switch (data.type) {
        case "join":
          return this.handleJoin(conn, data);
        case "move":
          return this.handleMove(conn, data);
        case "chat":
          return this.handleChat(conn, data);
        case "stats":
          return this.handleStats(conn, data);
        case "sync_tokens":
          return this.handleSyncTokens(conn, data);
        case "poke":
          return this.handlePoke(conn, data);
        case "sync_for_user":
          return this.handleSyncForUser(data);
      }
    } catch {
      // ignore malformed messages
    }
  }

  onClose(conn: Connection) {
    const player = this.players.get(conn.id);
    if (player) {
      this.players.delete(conn.id);
      this.lastMoveBroadcast.delete(conn.id);
      this.broadcast(
        JSON.stringify({
          type: "player_left",
          id: player.id,
          username: player.username,
        }),
        [conn.id],
      );
    }
  }

  handleJoin(conn: Connection, data: { username: string; iconIndex: number }) {
    const username = (data.username || "").slice(0, 16);
    if (!username) return;
    const isAdmin = ADMIN_USERNAMES.some((a) => a.toLowerCase() === username.toLowerCase());

    // Check for reconnection (same username from a different connection)
    for (const [existingId, p] of this.players) {
      if (
        p.username.toLowerCase() === username.toLowerCase() &&
        existingId !== conn.id
      ) {
        this.players.delete(existingId);
        const player: Player = {
          id: conn.id,
          username,
          iconIndex: Math.min(7, Math.max(0, data.iconIndex ?? 0)),
          x: p.x,
          y: p.y,
          weeklyTokens: p.weeklyTokens,
          isAdmin,
        };
        this.players.set(conn.id, player);
        this.sendInit(conn, player);
        this.broadcast(
          JSON.stringify({ type: "player_joined", player }),
          [conn.id],
        );
        return;
      }
    }

    const player: Player = {
      id: conn.id,
      username,
      iconIndex: Math.min(7, Math.max(0, data.iconIndex ?? 0)),
      x: 400 + Math.random() * (WORLD_W - 800),
      y: 400 + Math.random() * (WORLD_H - 800),
      weeklyTokens: 0,
      isAdmin,
    };
    this.players.set(conn.id, player);
    this.sendInit(conn, player);
    this.broadcast(
      JSON.stringify({ type: "player_joined", player }),
      [conn.id],
    );
  }

  sendInit(conn: Connection, player: Player) {
    conn.send(
      JSON.stringify({
        type: "init",
        player,
        players: Array.from(this.players.values()),
        messages: this.getRecentMessages(),
      }),
    );
  }

  handleMove(conn: Connection, data: { x: number; y: number }) {
    const player = this.players.get(conn.id);
    if (!player) return;
    player.x = Math.max(20, Math.min(WORLD_W - 20, data.x));
    player.y = Math.max(20, Math.min(WORLD_H - 20, data.y));

    // Throttle broadcasts: max once per 50ms per player
    const now = Date.now();
    const last = this.lastMoveBroadcast.get(conn.id) || 0;
    if (now - last < 50) return;
    this.lastMoveBroadcast.set(conn.id, now);

    this.broadcast(
      JSON.stringify({
        type: "player_moved",
        id: player.id,
        x: player.x,
        y: player.y,
      }),
      [conn.id],
    );
  }

  handleChat(conn: Connection, data: { text: string }) {
    const player = this.players.get(conn.id);
    if (!player) return;

    // Rate limit: 10 messages per 10 seconds
    const now = Date.now();
    const timestamps = this.rateLimits.get(conn.id) || [];
    const recent = timestamps.filter((t) => t > now - 10_000);
    if (recent.length >= 10) return;
    recent.push(now);
    this.rateLimits.set(conn.id, recent);

    const text = (data.text || "")
      .replace(/<[^>]*>/g, "")
      .trim()
      .slice(0, MAX_TEXT_LENGTH);
    if (!text) return;

    const msg: ChatMessage = {
      id: Math.random().toString(36).slice(2, 10),
      username: player.username,
      iconIndex: player.iconIndex,
      text,
      timestamp: now,
    };
    this.messages.push(msg);
    this.pruneMessages();
    this.broadcast(JSON.stringify({ type: "chat", message: msg }));
  }

  handleSyncTokens(conn: Connection, data: { weeklyTokens: number }) {
    const player = this.players.get(conn.id);
    if (!player) return;
    const tokens = Math.min(MAX_WEEKLY_TOKENS, Math.max(0, data.weeklyTokens || 0));
    if (tokens === player.weeklyTokens) return;
    player.weeklyTokens = tokens;
    this.broadcast(
      JSON.stringify({
        type: "player_updated",
        id: player.id,
        weeklyTokens: player.weeklyTokens,
      }),
    );
  }

  handlePoke(conn: Connection, data: { direction: string }) {
    const player = this.players.get(conn.id);
    if (!player || !player.isAdmin) return;

    const dir = data.direction || "right";
    const POKE_RANGE = 120;
    const PUSH_FORCE = 80;

    // Direction vector
    let dx = 0, dy = 0;
    if (dir === "right") dx = 1;
    else if (dir === "left") dx = -1;
    else if (dir === "up") dy = -1;
    else if (dir === "down") dy = 1;

    // Broadcast poke animation to all clients
    this.broadcast(JSON.stringify({
      type: "poke",
      id: player.id,
      direction: dir,
    }));

    // Find players in poke direction and push them
    for (const [id, target] of this.players) {
      if (id === conn.id) continue;
      const tdx = target.x - player.x;
      const tdy = target.y - player.y;
      const dist = Math.sqrt(tdx * tdx + tdy * tdy);
      if (dist > POKE_RANGE || dist < 1) continue;

      // Check if target is roughly in the poke direction
      const dot = (tdx * dx + tdy * dy) / dist;
      if (dot < 0.3) continue; // Not in the right direction

      // Push target away
      target.x = Math.max(20, Math.min(3000 - 20, target.x + dx * PUSH_FORCE));
      target.y = Math.max(20, Math.min(3000 - 20, target.y + dy * PUSH_FORCE));

      this.broadcast(JSON.stringify({
        type: "player_moved",
        id: target.id,
        x: target.x,
        y: target.y,
      }));
    }
  }

  handleSyncForUser(data: { username: string; weeklyTokens: number; secret?: string }) {
    if (data.secret !== SYNC_SECRET) return;
    const username = (data.username || "").toLowerCase().trim();
    if (!username) return;
    const tokens = Math.min(MAX_WEEKLY_TOKENS, Math.max(0, data.weeklyTokens || 0));
    for (const player of this.players.values()) {
      if (player.username.toLowerCase() === username) {
        if (tokens === player.weeklyTokens) return;
        player.weeklyTokens = tokens;
        this.broadcast(
          JSON.stringify({
            type: "player_updated",
            id: player.id,
            weeklyTokens: player.weeklyTokens,
          }),
        );
        return;
      }
    }
  }

  handleStats(conn: Connection, data: { inputTokens: number; outputTokens: number }) {
    const player = this.players.get(conn.id);
    if (!player) return;
    // Cap per-call addition to 100k tokens to prevent abuse
    const input = Math.min(100_000, Math.max(0, data.inputTokens || 0));
    const output = Math.min(100_000, Math.max(0, data.outputTokens || 0));
    const tokens = input + output;
    if (tokens <= 0) return;
    player.weeklyTokens = Math.min(MAX_WEEKLY_TOKENS, player.weeklyTokens + tokens);
    this.broadcast(
      JSON.stringify({
        type: "player_updated",
        id: player.id,
        weeklyTokens: player.weeklyTokens,
      }),
    );
  }

  pruneMessages() {
    const cutoff = Date.now() - MAX_AGE_MS;
    while (this.messages.length > 0 && this.messages[0].timestamp < cutoff) {
      this.messages.shift();
    }
    while (this.messages.length > MAX_MESSAGES) {
      this.messages.shift();
    }
  }

  getRecentMessages(): ChatMessage[] {
    this.pruneMessages();
    return [...this.messages];
  }
}

interface Env {
  GameServer: DurableObjectNamespace;
}

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routePartykitRequest(request, env)) ||
      new Response("Not Found", { status: 404 })
    );
  },
} satisfies ExportedHandler<Env>;
