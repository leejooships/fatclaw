"use client";

import { useRef, useEffect, useCallback } from "react";
import { ICONS, drawClaudeIcon } from "@/lib/icons";
import { WORLD_W, WORLD_H } from "@/lib/gameState";
import type { Player } from "@/lib/gameState";
import type { ChatMessage } from "@/lib/chatState";

interface GameCanvasProps {
  localPlayer: Player;
  players: Player[];
  chatMessages: ChatMessage[];
  chatOpen: boolean;
  onMove: (x: number, y: number) => void;
}

// Tokens needed to reach max size
const MAX_TOKENS_FOR_SIZE = 500_000;
const MIN_SIZE = 1;
const MAX_SIZE = 4;
const TILE_SIZE = 64;

function getPlayerSize(weeklyTokens: number): number {
  const t = Math.min(weeklyTokens, MAX_TOKENS_FOR_SIZE) / MAX_TOKENS_FOR_SIZE;
  return MIN_SIZE + t * (MAX_SIZE - MIN_SIZE);
}

// Deterministic random for world generation
function seededRandom(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return s / 2147483647;
  };
}

interface Decoration {
  x: number;
  y: number;
  type: "tree" | "rock" | "flower" | "bush" | "pond";
  variant: number;
}

// Generate world decorations once
function generateDecorations(): Decoration[] {
  const rand = seededRandom(42069);
  const decorations: Decoration[] = [];

  // Trees
  for (let i = 0; i < 120; i++) {
    decorations.push({
      x: rand() * WORLD_W,
      y: rand() * WORLD_H,
      type: "tree",
      variant: Math.floor(rand() * 3),
    });
  }

  // Rocks
  for (let i = 0; i < 60; i++) {
    decorations.push({
      x: rand() * WORLD_W,
      y: rand() * WORLD_H,
      type: "rock",
      variant: Math.floor(rand() * 2),
    });
  }

  // Flowers
  for (let i = 0; i < 200; i++) {
    decorations.push({
      x: rand() * WORLD_W,
      y: rand() * WORLD_H,
      type: "flower",
      variant: Math.floor(rand() * 4),
    });
  }

  // Bushes
  for (let i = 0; i < 80; i++) {
    decorations.push({
      x: rand() * WORLD_W,
      y: rand() * WORLD_H,
      type: "bush",
      variant: Math.floor(rand() * 2),
    });
  }

  // Ponds
  for (let i = 0; i < 8; i++) {
    decorations.push({
      x: 300 + rand() * (WORLD_W - 600),
      y: 300 + rand() * (WORLD_H - 600),
      type: "pond",
      variant: 0,
    });
  }

  return decorations;
}

const DECORATIONS = generateDecorations();


function drawDecoration(ctx: CanvasRenderingContext2D, d: Decoration) {
  switch (d.type) {
    case "tree": {
      // Trunk
      ctx.fillStyle = "#5d4037";
      ctx.fillRect(d.x - 4, d.y - 10, 8, 20);
      // Canopy
      const greens = ["#2e7d32", "#388e3c", "#1b5e20"];
      ctx.fillStyle = greens[d.variant];
      ctx.beginPath();
      ctx.arc(d.x, d.y - 22, 16 + d.variant * 4, 0, Math.PI * 2);
      ctx.fill();
      // Highlight
      ctx.fillStyle = "#43a047";
      ctx.beginPath();
      ctx.arc(d.x - 4, d.y - 26, 8, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "rock": {
      ctx.fillStyle = d.variant === 0 ? "#78909c" : "#90a4ae";
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, 12 + d.variant * 5, 8 + d.variant * 3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#b0bec5";
      ctx.beginPath();
      ctx.ellipse(d.x - 3, d.y - 2, 5, 3, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "flower": {
      const colors = ["#e91e63", "#ff9800", "#9c27b0", "#ffeb3b"];
      ctx.fillStyle = colors[d.variant];
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        ctx.beginPath();
        ctx.arc(d.x + Math.cos(a) * 3, d.y + Math.sin(a) * 3, 2.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = "#fff9c4";
      ctx.beginPath();
      ctx.arc(d.x, d.y, 2, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "bush": {
      ctx.fillStyle = d.variant === 0 ? "#4caf50" : "#66bb6a";
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, 14, 10, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#81c784";
      ctx.beginPath();
      ctx.ellipse(d.x + 5, d.y - 3, 8, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "pond": {
      ctx.fillStyle = "rgba(33, 150, 243, 0.4)";
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, 50, 35, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "rgba(100, 200, 255, 0.3)";
      ctx.beginPath();
      ctx.ellipse(d.x - 10, d.y - 5, 20, 12, -0.3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
}

function drawGround(ctx: CanvasRenderingContext2D, camX: number, camY: number, vw: number, vh: number) {
  // Draw visible tiles
  const startCol = Math.floor(camX / TILE_SIZE);
  const startRow = Math.floor(camY / TILE_SIZE);
  const endCol = Math.ceil((camX + vw) / TILE_SIZE);
  const endRow = Math.ceil((camY + vh) / TILE_SIZE);

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const x = c * TILE_SIZE;
      const y = r * TILE_SIZE;
      // Alternating grass shades
      const shade = (c + r) % 2 === 0 ? "#3a5a28" : "#3f6030";
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);
    }
  }

  // World border
  ctx.strokeStyle = "#2c4a1a";
  ctx.lineWidth = 4;
  ctx.strokeRect(0, 0, WORLD_W, WORLD_H);
}

const BUBBLE_MAX_WIDTH = 180;
const BUBBLE_PADDING_X = 10;
const BUBBLE_PADDING_Y = 6;
const BUBBLE_FONT_SIZE = 12;
const BUBBLE_TAIL_SIZE = 6;
const BUBBLE_DURATION_MS = 6000;

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function drawChatBubble(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  bubbleBottom: number,
  size: number,
) {
  ctx.font = `${BUBBLE_FONT_SIZE * size}px sans-serif`;
  const maxTextWidth = BUBBLE_MAX_WIDTH * size;
  const lines = wrapText(ctx, text, maxTextWidth);

  const lineHeight = BUBBLE_FONT_SIZE * size * 1.3;
  const paddingX = BUBBLE_PADDING_X * size;
  const paddingY = BUBBLE_PADDING_Y * size;
  const tailSize = BUBBLE_TAIL_SIZE * size;

  let textWidth = 0;
  for (const line of lines) {
    textWidth = Math.max(textWidth, ctx.measureText(line).width);
  }

  const bw = textWidth + paddingX * 2;
  const bh = lines.length * lineHeight + paddingY * 2;
  const bx = x - bw / 2;
  const by = bubbleBottom - bh - tailSize;
  const radius = 8 * size;

  // Bubble background
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.strokeStyle = "rgba(0, 0, 0, 0.15)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, radius);
  ctx.fill();
  ctx.stroke();

  // Tail
  ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
  ctx.beginPath();
  ctx.moveTo(x - tailSize, by + bh);
  ctx.lineTo(x, by + bh + tailSize);
  ctx.lineTo(x + tailSize, by + bh);
  ctx.closePath();
  ctx.fill();

  // Text
  ctx.fillStyle = "#1a1a1a";
  ctx.textAlign = "center";
  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, by + paddingY + (i + 0.8) * lineHeight);
  }
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  isLocal: boolean,
  chatText: string | null,
) {
  const size = getPlayerSize(player.weeklyTokens);
  const icon = ICONS[player.iconIndex] || ICONS[0];

  drawClaudeIcon(ctx, icon, player.x, player.y, size);

  // Username label
  ctx.font = `bold ${11 + size}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = isLocal ? "#ffd700" : "white";
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 3;
  const labelY = player.y - 30 * size;
  ctx.strokeText(player.username, player.x, labelY);
  ctx.fillText(player.username, player.x, labelY);

  // Token count badge
  if (player.weeklyTokens > 0) {
    const k = player.weeklyTokens >= 1000
      ? `${(player.weeklyTokens / 1000).toFixed(player.weeklyTokens >= 10000 ? 0 : 1)}k`
      : `${player.weeklyTokens}`;
    const badge = `${k} tokens`;
    ctx.font = `${9 + size * 0.5}px sans-serif`;
    ctx.fillStyle = "#a0a0a0";
    ctx.strokeStyle = "rgba(0,0,0,0.5)";
    ctx.lineWidth = 2;
    ctx.strokeText(badge, player.x, labelY + 14);
    ctx.fillText(badge, player.x, labelY + 14);
  }

  // Chat bubble
  if (chatText) {
    const bubbleBottom = player.weeklyTokens > 0 ? labelY - 4 * size : labelY - 4 * size;
    drawChatBubble(ctx, chatText, player.x, bubbleBottom, size);
  }

  // Local player indicator
  if (isLocal) {
    ctx.strokeStyle = "#ffd700";
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(player.x, player.y, 35 * size, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  players: Player[],
  localId: string,
  vw: number,
  vh: number,
) {
  const mmW = 150;
  const mmH = 150;
  const mmX = vw - mmW - 12;
  const mmY = 12;
  const scaleX = mmW / WORLD_W;
  const scaleY = mmH / WORLD_H;

  // Background
  ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
  ctx.strokeStyle = "rgba(255,255,255,0.2)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(mmX, mmY, mmW, mmH, 8);
  ctx.fill();
  ctx.stroke();

  // Players
  for (const p of players) {
    const px = mmX + p.x * scaleX;
    const py = mmY + p.y * scaleY;
    const icon = ICONS[p.iconIndex] || ICONS[0];
    const dotSize = 2 + getPlayerSize(p.weeklyTokens) * 0.8;
    ctx.fillStyle = p.id === localId ? "#ffd700" : icon.bodyColor;
    ctx.beginPath();
    ctx.arc(px, py, dotSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default function GameCanvas({ localPlayer, players, chatMessages, chatOpen, onMove }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const posRef = useRef({ x: localPlayer.x, y: localPlayer.y });
  const animFrameRef = useRef<number>(0);
  const chatMessagesRef = useRef(chatMessages);
  chatMessagesRef.current = chatMessages;
  const chatOpenRef = useRef(chatOpen);
  chatOpenRef.current = chatOpen;

  // Clear movement keys when chat opens
  useEffect(() => {
    if (chatOpen) {
      keysRef.current.clear();
    }
  }, [chatOpen]);

  // Sync position from server
  useEffect(() => {
    posRef.current = { x: localPlayer.x, y: localPlayer.y };
  }, [localPlayer.x, localPlayer.y]);

  // Keyboard handlers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // Don't capture movement keys when typing in inputs or chat is open
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (chatOpenRef.current) return;

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(e.key)) {
        e.preventDefault();
        keysRef.current.add(e.key.toLowerCase());
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, []);

  // Movement speed (bigger = slower)
  const getSpeed = useCallback(() => {
    const size = getPlayerSize(localPlayer.weeklyTokens);
    return Math.max(1.5, 5 - size * 0.8);
  }, [localPlayer.weeklyTokens]);

  // Resize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let lastMoveUpdate = 0;

    const loop = () => {
      const vw = canvas.width;
      const vh = canvas.height;

      // Process movement
      const keys = keysRef.current;
      const speed = getSpeed();
      let moved = false;

      if (keys.has("w") || keys.has("arrowup")) { posRef.current.y -= speed; moved = true; }
      if (keys.has("s") || keys.has("arrowdown")) { posRef.current.y += speed; moved = true; }
      if (keys.has("a") || keys.has("arrowleft")) { posRef.current.x -= speed; moved = true; }
      if (keys.has("d") || keys.has("arrowright")) { posRef.current.x += speed; moved = true; }

      // Clamp to world
      posRef.current.x = Math.max(30, Math.min(WORLD_W - 30, posRef.current.x));
      posRef.current.y = Math.max(30, Math.min(WORLD_H - 30, posRef.current.y));

      // Send position update (throttled)
      if (moved && Date.now() - lastMoveUpdate > 100) {
        lastMoveUpdate = Date.now();
        onMove(posRef.current.x, posRef.current.y);
      }

      // Camera
      const camX = posRef.current.x - vw / 2;
      const camY = posRef.current.y - vh / 2;

      // Clear
      ctx.fillStyle = "#2a4a18";
      ctx.fillRect(0, 0, vw, vh);

      // Transform to world space
      ctx.save();
      ctx.translate(-camX, -camY);

      // Ground
      drawGround(ctx, Math.max(0, camX), Math.max(0, camY), vw, vh);

      // Decorations (only visible ones)
      for (const d of DECORATIONS) {
        if (d.x > camX - 60 && d.x < camX + vw + 60 && d.y > camY - 60 && d.y < camY + vh + 60) {
          drawDecoration(ctx, d);
        }
      }

      // Players sorted by Y for depth
      const allPlayers = [...players];
      // Override local player position with our smooth local position
      const localInList = allPlayers.find((p) => p.id === localPlayer.id);
      if (localInList) {
        localInList.x = posRef.current.x;
        localInList.y = posRef.current.y;
      }
      allPlayers.sort((a, b) => a.y - b.y);

      // Build map of latest chat message per player (within bubble duration)
      const now = Date.now();
      const latestChat = new Map<string, string>();
      for (const msg of chatMessagesRef.current) {
        if (now - msg.timestamp < BUBBLE_DURATION_MS) {
          latestChat.set(msg.username, msg.text);
        }
      }

      for (const p of allPlayers) {
        if (p.x > camX - 100 && p.x < camX + vw + 100 && p.y > camY - 100 && p.y < camY + vh + 100) {
          drawPlayer(ctx, p, p.id === localPlayer.id, latestChat.get(p.username) ?? null);
        }
      }

      ctx.restore();

      // UI overlay (minimap)
      drawMinimap(ctx, players, localPlayer.id, vw, vh);

      // Player count
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.beginPath();
      ctx.roundRect(12, 12, 130, 32, 8);
      ctx.fill();
      ctx.fillStyle = "#a0a0a0";
      ctx.font = "13px sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`${players.length} player${players.length !== 1 ? "s" : ""} online`, 24, 33);

      // Controls hint
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath();
      ctx.roundRect(12, vh - 44, 200, 32, 8);
      ctx.fill();
      ctx.fillStyle = "#888";
      ctx.font = "11px sans-serif";
      ctx.fillText("WASD to move  |  Enter to chat", 24, vh - 24);

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [players, localPlayer, onMove, getSpeed]);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full"
      style={{ cursor: "crosshair" }}
    />
  );
}
