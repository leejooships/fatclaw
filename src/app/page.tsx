"use client";

import { useState, useEffect, useCallback } from "react";
import LoginScreen from "@/components/LoginScreen";
import GameCanvas from "@/components/GameCanvas";
import ChatPanel from "@/components/ChatPanel";
import TokenStatsPanel from "@/components/TokenStatsPanel";
import type { Player } from "@/lib/gameState";
import type { ChatMessage } from "@/lib/chatState";

interface SessionData {
  id: string;
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

  // Load session from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("fatclaw_session");
    if (saved) {
      try {
        const data = JSON.parse(saved) as SessionData;
        // Rejoin by username (for reconnection after timeout)
        rejoinByUsername(data.username, data.iconIndex);
      } catch {
        localStorage.removeItem("fatclaw_session");
      }
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Rejoin by username (for session restore / reconnection)
  const rejoinByUsername = useCallback(async (username: string, iconIndex: number) => {
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, iconIndex }),
      });
      if (!res.ok) return;
      const player: Player = await res.json();
      setLocalPlayer(player);
      setSession({ id: player.id, username: player.username, iconIndex: player.iconIndex });
      localStorage.setItem("fatclaw_session", JSON.stringify({
        id: player.id,
        username: player.username,
        iconIndex: player.iconIndex,
      }));
    } catch (e) {
      console.error("Rejoin failed:", e);
    }
  }, []);

  // Join game via Google sign-in
  const handleJoin = useCallback(async (googleIdToken: string, iconIndex: number) => {
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ googleIdToken, iconIndex }),
      });
      if (!res.ok) return;
      const player: Player = await res.json();
      setLocalPlayer(player);
      setSession({ id: player.id, username: player.username, iconIndex: player.iconIndex });
      localStorage.setItem("fatclaw_session", JSON.stringify({
        id: player.id,
        username: player.username,
        iconIndex: player.iconIndex,
      }));
    } catch (e) {
      console.error("Join failed:", e);
    }
  }, []);

  // Poll players
  useEffect(() => {
    if (!session) return;
    const poll = async () => {
      try {
        const res = await fetch("/api/players");
        if (res.ok) {
          const data: { players: Player[]; messages: ChatMessage[] } = await res.json();
          setPlayers(data.players);
          setChatMessages(data.messages);
          // Update local player from server
          const me = data.players.find((p) => p.id === session.id);
          if (me) setLocalPlayer(me);
          else {
            // We got disconnected (5min timeout), rejoin
            rejoinByUsername(session.username, session.iconIndex);
          }
        }
      } catch {
        // ignore
      }
    };
    poll();
    const interval = setInterval(poll, 800);
    return () => clearInterval(interval);
  }, [session, rejoinByUsername]);

  // Send chat message
  const handleSendChat = useCallback(async (text: string) => {
    if (!session) return;
    try {
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ playerId: session.id, text }),
      });
    } catch {
      // ignore
    }
  }, [session]);

  // Logout
  const handleLogout = useCallback(() => {
    localStorage.removeItem("fatclaw_session");
    setSession(null);
    setLocalPlayer(null);
  }, []);

  // Handle movement
  const handleMove = useCallback(async (x: number, y: number) => {
    if (!session) return;
    try {
      await fetch("/api/move", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: session.id, x, y }),
      });
    } catch {
      // ignore
    }
  }, [session]);


  // Not logged in yet
  if (!session || !localPlayer) {
    return <LoginScreen onJoin={handleJoin} />;
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
