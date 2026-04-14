"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Player } from "@/lib/gameState";

interface LeaderboardProps {
  players: Player[];
}

const MEDALS = ["🥇", "🥈", "🥉"];

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function Leaderboard({ players }: LeaderboardProps) {
  const [open, setOpen] = useState(true);
  const [minimized, setMinimized] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y };
  }, [position]);

  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX - dragOffset.current.x, y: e.clientY - dragOffset.current.y });
    };
    const onUp = () => setDragging(false);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => { window.removeEventListener("mousemove", onMove); window.removeEventListener("mouseup", onUp); };
  }, [dragging]);

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed top-4 right-[180px] z-50 bg-gray-900/90 border border-gray-600 rounded-xl px-3 py-2 text-xs font-mono text-orange-400 hover:bg-gray-800 transition-colors cursor-pointer"
      >
        Leaderboard
      </button>
    );
  }

  const sorted = players
    .filter((p) => p.weeklyTokens > 0)
    .sort((a, b) => b.weeklyTokens - a.weeklyTokens)
    .slice(0, 10);

  return (
    <div
      className="fixed z-50 w-64"
      style={{ top: `calc(50% - 150px + ${position.y}px)`, right: `${16 - position.x}px` }}
    >
      <div className="bg-[#1a1a2e]/95 backdrop-blur-md border border-gray-700 rounded-xl overflow-hidden">
        <div className={`flex items-center justify-between px-4 py-2 border-b border-gray-800 ${dragging ? "cursor-grabbing" : ""}`}>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <button onClick={() => setOpen(false)} className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-400 cursor-pointer" title="Close" />
              <button onClick={() => setMinimized((m) => !m)} className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-400 cursor-pointer" title="Minimize" />
              <button onMouseDown={onMouseDown} className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-400 cursor-grab active:cursor-grabbing" title="Drag to move" />
            </div>
            <span className="text-xs text-gray-500 font-mono">leaderboard</span>
          </div>
        </div>

        {!minimized && (
          <div className="px-3 py-2 max-h-80 overflow-y-auto">
            {sorted.length === 0 && (
              <p className="text-gray-600 text-xs text-center font-mono py-3">
                No data yet
              </p>
            )}
            {sorted.map((player, i) => (
              <div key={player.id} className="flex items-center gap-2 py-1.5 border-b border-gray-800/50 last:border-0">
                <span className="w-5 text-center text-xs">
                  {i < 3 ? MEDALS[i] : <span className="text-gray-600 font-mono">{i + 1}</span>}
                </span>
                <span className={`flex-1 text-xs font-mono truncate ${i === 0 ? "text-yellow-300 font-bold" : "text-gray-300"}`}>
                  {player.username}
                </span>
                <span className="text-xs font-mono text-orange-400">
                  {formatTokens(player.weeklyTokens)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
