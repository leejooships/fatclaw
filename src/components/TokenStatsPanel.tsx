"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { Player } from "@/lib/gameState";

interface TokenStatsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
  players: Player[];
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function TokenStatsPanel({ isOpen, onToggle, players }: TokenStatsPanelProps) {
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

  if (!isOpen) return null;

  const sorted = players
    .filter((p) => p.weeklyTokens > 0)
    .sort((a, b) => b.weeklyTokens - a.weeklyTokens);
  const maxTokens = sorted[0]?.weeklyTokens ?? 1;

  return (
    <div
      className="fixed z-50 w-80"
      style={{ top: `${16 + position.y}px`, left: `${16 + position.x}px` }}
    >
      <div className="bg-[#1a1a2e]/95 backdrop-blur-md border border-gray-700 rounded-xl overflow-hidden">
        {/* Header */}
        <div className={`flex items-center justify-between px-4 py-2 border-b border-gray-800 ${dragging ? "cursor-grabbing" : ""}`}>
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <button onClick={onToggle} className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-400 cursor-pointer" title="Close" />
              <button onClick={() => setMinimized((m) => !m)} className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-400 cursor-pointer" title="Minimize" />
              <button onMouseDown={onMouseDown} className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-400 cursor-grab active:cursor-grabbing" title="Drag to move" />
            </div>
            <span className="text-xs text-gray-500 font-mono">
              token usage (live)
            </span>
          </div>
        </div>

        {/* Content */}
        {!minimized && (
          <div className="px-4 py-3 max-h-80 overflow-y-auto">
            {sorted.length === 0 && (
              <p className="text-gray-600 text-xs text-center font-mono">
                No usage data yet. Use the CLI to chat with Claude!
              </p>
            )}
            <div className="space-y-3">
              {sorted.map((player, i) => (
                <div key={player.id}>
                  <div className="flex items-center justify-between text-xs font-mono mb-1">
                    <span className="text-gray-300">
                      <span className="text-gray-600 mr-1.5">#{i + 1}</span>
                      {player.username}
                    </span>
                    <span className="text-orange-400">
                      {formatTokens(player.weeklyTokens)} tokens
                    </span>
                  </div>
                  <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(player.weeklyTokens / maxTokens) * 100}%`,
                        background:
                          "linear-gradient(90deg, #d9773c, #e8a065, #ff6b6b)",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
