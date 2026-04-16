"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import { ICONS, drawClaudeIcon, drawMapleSlime } from "@/lib/icons";
import { WORLD_W, WORLD_H } from "@/lib/gameState";
import type { Player } from "@/lib/gameState";
import type { ChatMessage } from "@/lib/chatState";

interface GameCanvasProps {
  localPlayer: Player;
  players: Player[];
  chatMessages: ChatMessage[];
  chatOpen: boolean;
  onMove: (x: number, y: number) => void;
  onPoke?: (direction: string) => void;
  onPokeReceived?: React.RefObject<((id: string, direction: string) => void) | null>;
  onWarcry?: () => void;
  onWarcryReceived?: React.RefObject<((id: string) => void) | null>;
}

interface PokeAnim {
  direction: string;
  startTime: number;
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

const POKE_DURATION_MS = 400;

function drawPokeHand(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  direction: string,
  progress: number, // 0-1
  size: number,
) {
  const s = size;
  // Slime body is ~24*s wide, so scale arm proportionally
  const bodyRadius = 24 * s;

  // Hand extends out then retracts
  const extend = progress < 0.5
    ? progress * 2        // 0→1 extend
    : (1 - progress) * 2; // 1→0 retract
  const reach = extend * bodyRadius * 1.2;

  let dx = 0, dy = 0;
  if (direction === "right") dx = 1;
  else if (direction === "left") dx = -1;
  else if (direction === "up") dy = -1;
  else if (direction === "down") dy = 1;

  // Arm starts at body edge, extends outward
  const armStartX = x + dx * bodyRadius * 0.6;
  const armStartY = y + dy * bodyRadius * 0.6;
  const handX = x + dx * (bodyRadius * 0.85 + reach);
  const handY = y + dy * (bodyRadius * 0.85 + reach);

  ctx.save();
  // Arm — thickness scales with slime size
  ctx.strokeStyle = "#f5d0a9";
  ctx.lineWidth = 4 * s;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(armStartX, armStartY);
  ctx.lineTo(handX, handY);
  ctx.stroke();

  // Hand (fist) — proportional to body
  const fistR = 4.5 * s;
  ctx.fillStyle = "#f5d0a9";
  ctx.beginPath();
  ctx.arc(handX, handY, fistR, 0, Math.PI * 2);
  ctx.fill();

  // Finger (pointing) — proportional
  const fingerLen = 6 * s;
  const fingerW = 2.5 * s;
  ctx.strokeStyle = "#f5d0a9";
  ctx.lineWidth = fingerW;
  ctx.beginPath();
  ctx.moveTo(handX, handY);
  ctx.lineTo(handX + dx * fingerLen, handY + dy * fingerLen);
  ctx.stroke();
  // Fingertip
  ctx.fillStyle = "#f0c0a0";
  ctx.beginPath();
  ctx.arc(handX + dx * fingerLen, handY + dy * fingerLen, fingerW * 0.7, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawPlayer(
  ctx: CanvasRenderingContext2D,
  player: Player,
  isLocal: boolean,
  chatText: string | null,
  isMoving: boolean,
  time: number,
  pokeAnim: PokeAnim | null,
) {
  const size = getPlayerSize(player.weeklyTokens);
  const icon = ICONS[player.iconIndex] || ICONS[0];
  // Bounce phase: 3 hops per second
  const bounceT = isMoving ? (time * 3) % 1 : 0;

  // Draw poke hand behind or in front depending on direction
  if (pokeAnim) {
    const elapsed = Date.now() - pokeAnim.startTime;
    const progress = Math.min(elapsed / POKE_DURATION_MS, 1);
    if (progress < 1) {
      drawPokeHand(ctx, player.x, player.y, pokeAnim.direction, progress, size);
    }
  }

  if (player.isAdmin) {
    drawMapleSlime(ctx, player.x, player.y, size, bounceT, isMoving, time);
  } else {
    drawClaudeIcon(ctx, icon, player.x, player.y, size, bounceT, isMoving, time);
  }

  // Username label (offset up to account for slime height)
  const isAdmin = !!player.isAdmin;
  ctx.font = `bold ${(isAdmin ? 13 : 11) + size}px sans-serif`;
  ctx.textAlign = "center";
  ctx.fillStyle = isAdmin ? "#ffd700" : isLocal ? "#ffd700" : "white";
  ctx.strokeStyle = "rgba(0,0,0,0.7)";
  ctx.lineWidth = 3;
  const labelY = player.y - 32 * size;
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
    const bubbleBottom = labelY - 4 * size;
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

export default function GameCanvas({ localPlayer, players, chatMessages, chatOpen, onMove, onPoke, onPokeReceived, onWarcry, onWarcryReceived }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const keysRef = useRef<Set<string>>(new Set());
  const posRef = useRef({ x: localPlayer.x, y: localPlayer.y });
  const animFrameRef = useRef<number>(0);
  const prevPosRef = useRef<Map<string, { x: number; y: number }>>(new Map());
  const pokeAnimsRef = useRef<Map<string, PokeAnim>>(new Map());
  const warcryAnimsRef = useRef<Map<string, number>>(new Map());
  const facingRef = useRef("right");
  const chatMessagesRef = useRef(chatMessages);
  chatMessagesRef.current = chatMessages;
  const chatOpenRef = useRef(chatOpen);
  chatOpenRef.current = chatOpen;

  // Register for incoming poke events from server
  useEffect(() => {
    if (onPokeReceived) {
      onPokeReceived.current = (id: string, direction: string) => {
        pokeAnimsRef.current.set(id, { direction, startTime: Date.now() });
      };
    }
    return () => {
      if (onPokeReceived) onPokeReceived.current = null;
    };
  }, [onPokeReceived]);

  // Register for incoming warcry events from server
  useEffect(() => {
    if (onWarcryReceived) {
      onWarcryReceived.current = (id: string) => {
        warcryAnimsRef.current.set(id, Date.now());
      };
    }
    return () => {
      if (onWarcryReceived) onWarcryReceived.current = null;
    };
  }, [onWarcryReceived]);

  // Clear movement keys when chat opens
  useEffect(() => {
    if (chatOpen) {
      keysRef.current.clear();
    }
  }, [chatOpen]);

  // Sync position from server — always sync if pushed (large jump), otherwise only when idle
  useEffect(() => {
    const dx = Math.abs(posRef.current.x - localPlayer.x);
    const dy = Math.abs(posRef.current.y - localPlayer.y);
    if (keysRef.current.size === 0 || dx > 20 || dy > 20) {
      posRef.current = { x: localPlayer.x, y: localPlayer.y };
    }
  }, [localPlayer.x, localPlayer.y]);

  // Keyboard handlers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;

      if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "w", "a", "s", "d"].includes(e.key)) {
        e.preventDefault();
        keysRef.current.add(e.key.toLowerCase());
        // Track facing direction
        const k = e.key.toLowerCase();
        if (k === "a" || k === "arrowleft") facingRef.current = "left";
        else if (k === "d" || k === "arrowright") facingRef.current = "right";
        else if (k === "w" || k === "arrowup") facingRef.current = "up";
        else if (k === "s" || k === "arrowdown") facingRef.current = "down";
      }

      // P to poke
      if (e.key.toLowerCase() === "p" && onPoke) {
        e.preventDefault();
        onPoke(facingRef.current);
        pokeAnimsRef.current.set(localPlayer.id, { direction: facingRef.current, startTime: Date.now() });
      }

      // O for warcry (#1 player only)
      if (e.key.toLowerCase() === "o" && onWarcry) {
        // Check if local player is #1 on leaderboard
        const topPlayer = [...players, localPlayer].reduce((top, p) =>
          p.weeklyTokens > top.weeklyTokens ? p : top
        );
        if (topPlayer.id === localPlayer.id && localPlayer.weeklyTokens > 0) {
          e.preventDefault();
          onWarcry();
          warcryAnimsRef.current.set(localPlayer.id, Date.now());
        }
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
  }, [localPlayer.id, onPoke, onWarcry]);

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
      const time = now / 1000; // seconds for animation
      const latestChat = new Map<string, string>();
      for (const msg of chatMessagesRef.current) {
        if (now - msg.timestamp < BUBBLE_DURATION_MS) {
          latestChat.set(msg.username, msg.text);
        }
      }

      // Detect which players are moving
      const prevPos = prevPosRef.current;
      const movingSet = new Set<string>();
      for (const p of allPlayers) {
        const prev = prevPos.get(p.id);
        if (prev && (Math.abs(p.x - prev.x) > 0.5 || Math.abs(p.y - prev.y) > 0.5)) {
          movingSet.add(p.id);
        }
        prevPos.set(p.id, { x: p.x, y: p.y });
      }

      // Clean up expired poke animations
      const pokeAnims = pokeAnimsRef.current;
      for (const [id, anim] of pokeAnims) {
        if (Date.now() - anim.startTime > POKE_DURATION_MS) pokeAnims.delete(id);
      }

      // Clean up expired warcry animations
      const WARCRY_DURATION_MS = 800;
      const warcryAnims = warcryAnimsRef.current;
      for (const [id, startTime] of warcryAnims) {
        if (Date.now() - startTime > WARCRY_DURATION_MS) warcryAnims.delete(id);
      }

      for (const p of allPlayers) {
        if (p.x > camX - 100 && p.x < camX + vw + 100 && p.y > camY - 100 && p.y < camY + vh + 100) {
          drawPlayer(ctx, p, p.id === localPlayer.id, latestChat.get(p.username) ?? null, movingSet.has(p.id), time, pokeAnims.get(p.id) ?? null);
        }
      }

      // Warcry visuals — rendered separately with large visibility range
      for (const [id, startTime] of warcryAnims) {
        const p = allPlayers.find((pl) => pl.id === id);
        if (!p) continue;
        const elapsed = Date.now() - startTime;
        const progress = elapsed / WARCRY_DURATION_MS;
        if (progress >= 1) continue;

        const size = getPlayerSize(p.weeklyTokens);
        const maxRadius = 300 * size;

        // Multiple expanding rings
        for (let ring = 0; ring < 3; ring++) {
          const ringProgress = Math.max(0, Math.min(1, (progress - ring * 0.15) / 0.7));
          if (ringProgress <= 0 || ringProgress >= 1) continue;
          const radius = ringProgress * maxRadius;
          const alpha = (1 - ringProgress) * 0.6;

          ctx.strokeStyle = `rgba(255, 50, 50, ${alpha})`;
          ctx.lineWidth = (4 - ringProgress * 3) * size;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Central flash
        if (progress < 0.3) {
          const flashAlpha = (1 - progress / 0.3) * 0.4;
          const flashR = 40 * size * (progress / 0.3);
          ctx.fillStyle = `rgba(255, 200, 50, ${flashAlpha})`;
          ctx.beginPath();
          ctx.arc(p.x, p.y, flashR, 0, Math.PI * 2);
          ctx.fill();
        }

        // "ROAR" text
        const textAlpha = progress < 0.5 ? 1 : 1 - (progress - 0.5) / 0.5;
        const textY = p.y - 40 * size - progress * 30;
        ctx.font = `bold ${20 * size}px sans-serif`;
        ctx.textAlign = "center";
        ctx.globalAlpha = textAlpha;
        ctx.fillStyle = "#ff3333";
        ctx.strokeStyle = "rgba(0,0,0,0.8)";
        ctx.lineWidth = 3;
        ctx.strokeText("ROAR!", p.x, textY);
        ctx.fillText("ROAR!", p.x, textY);
        ctx.globalAlpha = 1;
      }

      ctx.restore();

      // UI overlay (minimap)
      drawMinimap(ctx, players, localPlayer.id, vw, vh);

      // Player count (top center)
      ctx.textAlign = "center";
      const countText = `${players.length} player${players.length !== 1 ? "s" : ""} online`;
      ctx.font = "bold 13px sans-serif";
      const numWidth = ctx.measureText(`${players.length}`).width;
      ctx.font = "13px sans-serif";
      const restWidth = ctx.measureText(` player${players.length !== 1 ? "s" : ""} online`).width;
      const totalWidth = numWidth + restWidth;
      const countPad = 24;
      ctx.fillStyle = "rgba(0,0,0,0.6)";
      ctx.beginPath();
      ctx.roundRect(vw / 2 - (totalWidth + countPad) / 2, 12, totalWidth + countPad, 32, 8);
      ctx.fill();
      // Draw number bold, rest normal
      ctx.textAlign = "left";
      const countStartX = vw / 2 - totalWidth / 2;
      ctx.fillStyle = "white";
      ctx.font = "bold 13px sans-serif";
      ctx.fillText(`${players.length}`, countStartX, 33);
      ctx.fillStyle = "#a0a0a0";
      ctx.font = "13px sans-serif";
      ctx.fillText(` player${players.length !== 1 ? "s" : ""} online`, countStartX + numWidth, 33);

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [players, localPlayer, onMove, getSpeed]);

  const [showHint, setShowHint] = useState(true);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="fixed inset-0 w-full h-full"
        style={{ cursor: "crosshair" }}
      />
      {showHint && (
        <button
          onClick={() => setShowHint(false)}
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 bg-gray-900/90 border border-gray-600 rounded-xl px-5 py-3 text-sm font-mono text-gray-300 hover:bg-gray-800 transition-colors cursor-pointer flex items-center gap-3"
        >
          <span className="text-white font-bold">WASD</span> to move
          <span className="text-gray-500 text-xs ml-1">dismiss</span>
        </button>
      )}
    </>
  );
}
