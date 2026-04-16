"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import PartySocket from "partysocket";
import LoginScreen from "@/components/LoginScreen";
import GameCanvas from "@/components/GameCanvas";
import ChatPanel from "@/components/ChatPanel";
import TokenStatsPanel from "@/components/TokenStatsPanel";
import Leaderboard from "@/components/Leaderboard";
import type { Player } from "@/lib/gameState";
import type { ChatMessage } from "@/lib/chatState";

interface SessionData {
  username: string;
  iconIndex: number;
}

const BLOCKED_WORDS = [
  "fuck", "shit", "ass", "bitch", "dick", "pussy", "cock", "cunt",
  "nigger", "nigga", "faggot", "fag", "retard", "whore", "slut",
  "bastard", "damn", "piss", "nazi", "hitler", "rape", "kill",
];

function isCleanName(name: string): boolean {
  const lower = name.toLowerCase().replace(/[^a-z]/g, "");
  return !BLOCKED_WORDS.some((w) => lower.includes(w));
}

function NicknameModal({ firstName, onConfirm }: { firstName: string; onConfirm: (name: string) => void }) {
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = () => {
    const name = nickname.trim() || firstName;
    if (!isCleanName(name)) {
      setError("Please choose an appropriate name");
      return;
    }
    onConfirm(name);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60">
      <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full mx-4">
        <h2 className="text-lg font-bold text-white mb-1">Pick a nickname</h2>
        <p className="text-sm text-gray-400 mb-4">
          Or keep your first name: <span className="text-orange-400">{firstName}</span>
        </p>
        <input
          autoFocus
          type="text"
          value={nickname}
          onChange={(e) => { setNickname(e.target.value.slice(0, 16)); setError(""); }}
          placeholder={firstName}
          maxLength={16}
          className="w-full bg-gray-800 text-white text-sm font-mono rounded-lg px-3 py-2 mb-1 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />
        {error && <p className="text-red-400 text-xs mb-2">{error}</p>}
        <button
          onClick={handleSubmit}
          className="w-full bg-orange-600 hover:bg-orange-500 text-white font-mono text-sm py-2 rounded-lg transition-colors cursor-pointer mt-2"
        >
          {nickname.trim() ? `Join as ${nickname.trim()}` : `Join as ${firstName}`}
        </button>
      </div>
    </div>
  );
}

export default function Home() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [localPlayer, setLocalPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [statsPanelOpen, setStatsPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingJoin, setPendingJoin] = useState<{ firstName: string; iconIndex: number } | null>(null);
  const [showCliReminder, setShowCliReminder] = useState(false);
  const [cliCopied, setCliCopied] = useState(false);
  const wsRef = useRef<PartySocket | null>(null);
  const pokeCallbackRef = useRef<((id: string, direction: string) => void) | null>(null);
  const warcryCallbackRef = useRef<((id: string) => void) | null>(null);

  // Load session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("fatclaw_session");
    if (saved) {
      try {
        setSession(JSON.parse(saved) as SessionData);
      } catch {
        localStorage.removeItem("fatclaw_session");
      }
    }
    setLoading(false);
  }, []);

  // Connect to party server when session exists
  useEffect(() => {
    if (!session) return;

    const host = process.env.NEXT_PUBLIC_PARTY_HOST;
    if (!host) {
      console.error("NEXT_PUBLIC_PARTY_HOST not configured");
      return;
    }

    const ws = new PartySocket({
      host,
      party: "game-server",
      room: "main",
    });

    ws.addEventListener("open", () => {
      ws.send(
        JSON.stringify({
          type: "join",
          username: session.username,
          iconIndex: session.iconIndex,
        }),
      );
    });

    ws.addEventListener("message", (e) => {
      const data = JSON.parse(e.data);
      switch (data.type) {
        case "init":
          setLocalPlayer(data.player);
          setPlayers(data.players);
          setChatMessages(data.messages);
          break;
        case "player_joined":
          setPlayers((prev) => [
            ...prev.filter((p) => p.id !== data.player.id),
            data.player,
          ]);
          break;
        case "player_left":
          setPlayers((prev) => prev.filter((p) => p.id !== data.id));
          break;
        case "player_moved":
          setPlayers((prev) =>
            prev.map((p) =>
              p.id === data.id ? { ...p, x: data.x, y: data.y } : p,
            ),
          );
          // Update local player position when pushed by poke/warcry
          setLocalPlayer((prev) =>
            prev && prev.id === data.id
              ? { ...prev, x: data.x, y: data.y }
              : prev,
          );
          break;
        case "chat":
          setChatMessages((prev) => [...prev, data.message].slice(-50));
          break;
        case "poke":
          pokeCallbackRef.current?.(data.id, data.direction);
          break;
        case "warcry":
          warcryCallbackRef.current?.(data.id);
          break;
        case "player_updated":
          setLocalPlayer((prev) =>
            prev && prev.id === data.id
              ? { ...prev, weeklyTokens: data.weeklyTokens }
              : prev,
          );
          setPlayers((prev) =>
            prev.map((p) =>
              p.id === data.id
                ? { ...p, weeklyTokens: data.weeklyTokens }
                : p,
            ),
          );
          break;
      }
    });

    wsRef.current = ws;
    return () => {
      ws.close();
      wsRef.current = null;
    };
  }, [session]);

  // Google sign-in → get first name, show nickname picker (only if no saved nickname)
  const handleJoin = useCallback(
    async (googleIdToken: string, iconIndex: number) => {
      try {
        const res = await fetch("/api/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ googleIdToken }),
        });
        if (!res.ok) return;
        const { firstName } = await res.json();

        // Check if user already picked a nickname before
        const savedNickname = localStorage.getItem("fatclaw_nickname");
        if (savedNickname) {
          const sessionData: SessionData = { username: savedNickname, iconIndex };
          setSession(sessionData);
          localStorage.setItem("fatclaw_session", JSON.stringify(sessionData));
          setShowCliReminder(true);
        } else {
          setPendingJoin({ firstName, iconIndex });
        }
      } catch (e) {
        console.error("Join failed:", e);
      }
    },
    [],
  );

  // Nickname confirmed → create session and save nickname permanently
  const handleNicknameConfirm = useCallback(
    (username: string) => {
      if (!pendingJoin) return;
      localStorage.setItem("fatclaw_nickname", username);
      const sessionData: SessionData = { username, iconIndex: pendingJoin.iconIndex };
      setSession(sessionData);
      localStorage.setItem("fatclaw_session", JSON.stringify(sessionData));
      setPendingJoin(null);
    },
    [pendingJoin],
  );

  // Movement via WebSocket
  const handleMove = useCallback((x: number, y: number) => {
    wsRef.current?.send(JSON.stringify({ type: "move", x, y }));
  }, []);

  // Chat via WebSocket
  const handleSendChat = useCallback((text: string) => {
    wsRef.current?.send(JSON.stringify({ type: "chat", text }));
  }, []);

  const handlePoke = useCallback((direction: string) => {
    wsRef.current?.send(JSON.stringify({ type: "poke", direction }));
  }, []);

  const handleWarcry = useCallback(() => {
    wsRef.current?.send(JSON.stringify({ type: "warcry" }));
  }, []);

  // Logout
  const handleLogout = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    localStorage.removeItem("fatclaw_session");
    setSession(null);
    setLocalPlayer(null);
    setPlayers([]);
    setChatMessages([]);
  }, []);

  if (loading) {
    return <div className="min-h-screen" />;
  }

  if (!session) {
    return (
      <>
        <LoginScreen onJoin={handleJoin} />
        {pendingJoin && (
          <NicknameModal
            firstName={pendingJoin.firstName}
            onConfirm={handleNicknameConfirm}
          />
        )}
      </>
    );
  }

  if (!localPlayer) {
    return <div className="min-h-screen" />;
  }

  return (
    <>
      <GameCanvas
        localPlayer={localPlayer}
        players={players}
        chatMessages={chatMessages}
        chatOpen={chatPanelOpen}
        onMove={handleMove}
        onPoke={handlePoke}
        onPokeReceived={pokeCallbackRef}
        onWarcry={handleWarcry}
        onWarcryReceived={warcryCallbackRef}
      />
      {!statsPanelOpen && (
        <div className="fixed top-4 left-4 z-50">
          <button
            onClick={() => setStatsPanelOpen(true)}
            className="bg-gray-900/90 border border-gray-600 rounded-xl px-3 py-2 text-xs font-mono text-orange-400 hover:bg-gray-800 transition-colors cursor-pointer"
          >
            📊 Token Stats
          </button>
        </div>
      )}
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={handleLogout}
          className="bg-gray-900/90 border border-gray-600 rounded-xl px-3 py-2 text-xs font-mono text-gray-400 hover:text-red-400 hover:bg-gray-800 transition-colors cursor-pointer"
        >
          Logout
        </button>
      </div>
      <TokenStatsPanel
        isOpen={statsPanelOpen}
        onToggle={() => setStatsPanelOpen((o) => !o)}
        players={players}
      />
      <Leaderboard players={players} />
      <ChatPanel
        messages={chatMessages}
        onSend={handleSendChat}
        isOpen={chatPanelOpen}
        onToggle={() => setChatPanelOpen((o) => !o)}
        localUsername={session.username}
      />
      {showCliReminder && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 max-w-sm w-full mx-4">
            <h2 className="text-lg font-bold text-white mb-1">Welcome back!</h2>
            <p className="text-sm text-gray-400 mb-4">
              Don&apos;t forget to start your token sync so your slime keeps growing:
            </p>
            <div className="relative bg-gray-800/80 rounded-lg px-4 py-3 font-mono text-sm text-gray-300 mb-4">
              <p>cd fatclaw/cli && bun run sync</p>
              <button
                onClick={() => {
                  navigator.clipboard.writeText("cd fatclaw/cli && bun run sync");
                  setCliCopied(true);
                  setTimeout(() => setCliCopied(false), 2000);
                }}
                className="absolute top-2 right-2 px-2 py-1 text-xs rounded bg-gray-700 hover:bg-gray-600 text-gray-400 hover:text-gray-200 transition-colors cursor-pointer"
              >
                {cliCopied ? "Copied!" : "Copy"}
              </button>
            </div>
            <button
              onClick={() => setShowCliReminder(false)}
              className="w-full bg-orange-500 hover:bg-orange-400 text-white font-bold py-2 rounded-xl transition-colors cursor-pointer"
            >
              Got it!
            </button>
          </div>
        </div>
      )}
    </>
  );
}
