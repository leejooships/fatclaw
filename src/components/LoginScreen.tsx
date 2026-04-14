"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ICONS, drawClaudeIcon } from "@/lib/icons";

interface LoginScreenProps {
  onJoin: (username: string, iconIndex: number, apiToken: string) => void;
}

function IconPreview({ index, selected, onClick }: { index: number; selected: boolean; onClick: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const icon = ICONS[index];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.clearRect(0, 0, 80, 80);
    drawClaudeIcon(ctx, icon, 40, 42, 1.2);
  }, [icon]);

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all cursor-pointer ${
        selected
          ? "border-orange-400 bg-orange-400/10 scale-110"
          : "border-gray-700 hover:border-gray-500 bg-gray-900/50"
      }`}
    >
      <canvas ref={canvasRef} width={80} height={80} className="w-16 h-16" />
      <span className="text-xs text-gray-400">{icon.name}</span>
    </button>
  );
}

export default function LoginScreen({ onJoin }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [apiToken, setApiToken] = useState("");
  const [selectedIcon, setSelectedIcon] = useState(0);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = username.trim();
    if (trimmed.length < 1) {
      setError("Enter a username");
      return;
    }
    if (trimmed.length > 16) {
      setError("Username too long (max 16 chars)");
      return;
    }
    if (!apiToken.trim()) {
      setError("Enter your API token");
      return;
    }
    onJoin(trimmed, selectedIcon, apiToken.trim());
  }, [username, apiToken, selectedIcon, onJoin]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-gray-900/80 border border-gray-700 rounded-2xl p-8 max-w-md w-full">
        <h1 className="text-4xl font-black text-center text-orange-400 mb-2">
          FatClaw
        </h1>
        <p className="text-gray-400 text-center text-sm mb-8">
          Vibe code. Get fat. Flex on everyone.
        </p>

        {/* Username */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="Enter your name..."
            maxLength={16}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-400 transition-colors"
            autoFocus
          />
          {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
        </div>

        {/* API Token */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-2">API Token</label>
          <input
            type="password"
            value={apiToken}
            onChange={(e) => {
              setApiToken(e.target.value);
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            placeholder="sk-ant-..."
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder:text-gray-600 focus:outline-none focus:border-orange-400 transition-colors font-mono text-sm"
          />
          <p className="text-yellow-500/80 text-xs mt-1.5">
            Limit your token to $1 max spend to be safe.
          </p>
        </div>

        {/* Icon selection */}
        <div className="mb-6">
          <label className="block text-sm text-gray-400 mb-3">Choose your Claude</label>
          <div className="grid grid-cols-4 gap-2">
            {ICONS.map((_, i) => (
              <IconPreview
                key={i}
                index={i}
                selected={selectedIcon === i}
                onClick={() => setSelectedIcon(i)}
              />
            ))}
          </div>
        </div>

        {/* Join button */}
        <button
          onClick={handleSubmit}
          className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-xl font-bold text-lg transition-colors cursor-pointer"
        >
          Enter the World
        </button>

        <p className="text-xs text-gray-600 text-center mt-4">
          Size resets daily. The grind never stops.
        </p>
      </div>
    </div>
  );
}
