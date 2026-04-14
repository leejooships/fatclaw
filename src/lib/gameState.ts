export interface Player {
  id: string;
  username: string;
  iconIndex: number; // 0-7
  x: number;
  y: number;
  googleId?: string;
  lastActive: number; // timestamp
  todayDate: string; // YYYY-MM-DD for daily reset
}

// World size
export const WORLD_W = 3000;
export const WORLD_H = 3000;

// In-memory store (works in dev, need Redis/DB for prod)
const players = new Map<string, Player>();

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function checkDailyReset(player: Player) {
  const today = getToday();
  if (player.todayDate !== today) {
    player.todayDate = today;
  }
}

export function joinGame(username: string, iconIndex: number, googleId?: string): Player {
  // Check if player already exists (by googleId first, then username)
  for (const p of players.values()) {
    if (googleId && p.googleId === googleId) {
      p.username = username;
      p.iconIndex = iconIndex;
      p.lastActive = Date.now();
      checkDailyReset(p);
      return p;
    }
    if (!googleId && p.username.toLowerCase() === username.toLowerCase()) {
      p.iconIndex = iconIndex;
      p.lastActive = Date.now();
      checkDailyReset(p);
      return p;
    }
  }

  const id = Math.random().toString(36).slice(2, 10);
  const player: Player = {
    id,
    username,
    iconIndex: Math.min(7, Math.max(0, iconIndex)),
    x: 400 + Math.random() * (WORLD_W - 800),
    y: 400 + Math.random() * (WORLD_H - 800),
    googleId,
    lastActive: Date.now(),
    todayDate: getToday(),
  };
  players.set(id, player);
  return player;
}

export function movePlayer(id: string, x: number, y: number) {
  const p = players.get(id);
  if (!p) return null;
  p.x = Math.max(20, Math.min(WORLD_W - 20, x));
  p.y = Math.max(20, Math.min(WORLD_H - 20, y));
  p.lastActive = Date.now();
  checkDailyReset(p);
  return p;
}

export function getActivePlayers(): Player[] {
  const cutoff = Date.now() - 5 * 60 * 1000; // 5 min timeout
  const active: Player[] = [];
  for (const [id, p] of players) {
    if (p.lastActive < cutoff) {
      players.delete(id);
    } else {
      checkDailyReset(p);
      active.push(p);
    }
  }
  return active;
}

export function getPlayer(id: string): Player | undefined {
  const p = players.get(id);
  if (p) checkDailyReset(p);
  return p;
}
