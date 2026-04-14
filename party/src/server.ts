import { Server, routePartykitRequest } from "partyserver";
import type { Connection } from "partyserver";

interface Player {
  id: string;
  username: string;
  iconIndex: number;
  x: number;
  y: number;
  weeklyTokens: number;
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

export class GameServer extends Server {
  players = new Map<string, Player>();
  messages: ChatMessage[] = [];
  rateLimits = new Map<string, number[]>();

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
    const tokens = Math.max(0, data.weeklyTokens || 0);
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

  handleSyncForUser(data: { username: string; weeklyTokens: number }) {
    const username = (data.username || "").toLowerCase();
    if (!username) return;
    const tokens = Math.max(0, data.weeklyTokens || 0);
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
    const tokens =
      Math.max(0, data.inputTokens || 0) + Math.max(0, data.outputTokens || 0);
    if (tokens <= 0) return;
    player.weeklyTokens += tokens;
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
