export interface Player {
  id: string;
  username: string;
  iconIndex: number; // 0-7
  x: number;
  y: number;
  googleId?: string;
  weeklyTokens: number;
}

// World size
export const WORLD_W = 3000;
export const WORLD_H = 3000;
