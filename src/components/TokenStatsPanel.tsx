"use client";

import { useState, useEffect, useCallback } from "react";

interface UserWeeklyStats {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  requestCount: number;
}

interface TokenStatsPanelProps {
  isOpen: boolean;
  onToggle: () => void;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default function TokenStatsPanel({ isOpen, onToggle }: TokenStatsPanelProps) {
  const [stats, setStats] = useState<Record<string, UserWeeklyStats>>({});
  const [loading, setLoading] = useState(false);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        setStats(await res.json());
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchStats();
  }, [isOpen, fetchStats]);

  const sorted = Object.entries(stats).sort(
    ([, a], [, b]) => b.totalTokens - a.totalTokens,
  );
  const maxTokens = sorted[0]?.[1]?.totalTokens ?? 1;

  if (!isOpen) return null;

  return (
    <div className="fixed top-4 left-4 z-50 w-80">
      <div className="bg-[#1a1a2e]/95 backdrop-blur-md border border-gray-700 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
              <div className="w-3 h-3 rounded-full bg-green-500/80" />
            </div>
            <span className="text-xs text-gray-500 font-mono">
              token usage (7d)
            </span>
          </div>
          <button
            onClick={onToggle}
            className="text-gray-500 hover:text-white text-sm px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="px-4 py-3 max-h-80 overflow-y-auto">
          {loading && sorted.length === 0 && (
            <p className="text-gray-600 text-xs text-center font-mono">
              Loading...
            </p>
          )}
          {!loading && sorted.length === 0 && (
            <p className="text-gray-600 text-xs text-center font-mono">
              No usage data yet. Use the CLI to chat with Claude!
            </p>
          )}
          <div className="space-y-3">
            {sorted.map(([username, data], i) => (
              <div key={username}>
                <div className="flex items-center justify-between text-xs font-mono mb-1">
                  <span className="text-gray-300">
                    <span className="text-gray-600 mr-1.5">#{i + 1}</span>
                    {username}
                  </span>
                  <span className="text-orange-400">
                    {formatTokens(data.totalTokens)} tokens
                  </span>
                </div>
                <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${(data.totalTokens / maxTokens) * 100}%`,
                      background:
                        "linear-gradient(90deg, #d9773c, #e8a065, #ff6b6b)",
                    }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-600 font-mono mt-0.5">
                  <span>
                    {formatTokens(data.inputTokens)} in /{" "}
                    {formatTokens(data.outputTokens)} out
                  </span>
                  <span>{data.requestCount} reqs</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
