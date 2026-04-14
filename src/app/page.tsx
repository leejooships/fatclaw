"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import PartySocket from "partysocket";
import LoginScreen from "@/components/LoginScreen";
import GameCanvas from "@/components/GameCanvas";
import ChatPanel from "@/components/ChatPanel";
import TokenStatsPanel from "@/components/TokenStatsPanel";
import type { Player } from "@/lib/gameState";
import type { ChatMessage } from "@/lib/chatState";

interface SessionData {
  username: string;
  iconIndex: number;
}

export default function Home() {
  const [session, setSession] = useState<SessionData | null>(null);
  const [localPlayer, setLocalPlayer] = useState<Player | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatPanelOpen, setChatPanelOpen] = useState(false);
  const [statsPanelOpen, setStatsPanelOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const wsRef = useRef<PartySocket | null>(null);

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
          break;
        case "chat":
          setChatMessages((prev) => [...prev, data.message].slice(-50));
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

  // Google sign-in → get verified username, then connect to party
  const handleJoin = useCallback(
    async (googleIdToken: string, iconIndex: number) => {
      try {
        const res = await fetch("/api/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ googleIdToken }),
        });
        if (!res.ok) return;
        const { username } = await res.json();
        const sessionData: SessionData = { username, iconIndex };
        setSession(sessionData);
        localStorage.setItem("fatclaw_session", JSON.stringify(sessionData));
      } catch (e) {
        console.error("Join failed:", e);
      }
    },
    [],
  );

  // Movement via WebSocket
  const handleMove = useCallback((x: number, y: number) => {
    wsRef.current?.send(JSON.stringify({ type: "move", x, y }));
  }, []);

  // Chat via WebSocket
  const handleSendChat = useCallback((text: string) => {
    wsRef.current?.send(JSON.stringify({ type: "chat", text }));
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
    return <LoginScreen onJoin={handleJoin} />;
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
      />
      <div className="fixed top-4 left-4 z-50 flex gap-2">
        {!statsPanelOpen && (
          <button
            onClick={() => setStatsPanelOpen(true)}
            className="bg-gray-900/90 border border-gray-600 rounded-xl px-3 py-2 text-xs font-mono text-orange-400 hover:bg-gray-800 transition-colors cursor-pointer"
          >
            📊 Token Stats
          </button>
        )}
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
      <ChatPanel
        messages={chatMessages}
        onSend={handleSendChat}
        isOpen={chatPanelOpen}
        onToggle={() => setChatPanelOpen((o) => !o)}
        localUsername={session.username}
      />
    </>
  );
}
