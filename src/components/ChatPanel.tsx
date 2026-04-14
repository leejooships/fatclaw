"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import type { ChatMessage } from "@/lib/chatState";

const ICON_COLORS = [
  "#d9773c", // Tangerine
  "#9b59b6", // Grape
  "#3498db", // Ocean
  "#2ecc71", // Mint
  "#e84393", // Sakura
  "#f1c40f", // Royal
  "#e74c3c", // Ember
  "#00cec9", // Arctic
];

interface ChatPanelProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isOpen: boolean;
  onToggle: () => void;
  localUsername: string;
}

function timeAgo(ts: number): string {
  const seconds = Math.floor((Date.now() - ts) / 1000);
  if (seconds < 10) return "now";
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h`;
}

export default function ChatPanel({
  messages,
  onSend,
  isOpen,
  onToggle,
  localUsername,
}: ChatPanelProps) {
  const [draft, setDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const prevCountRef = useRef(messages.length);
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

  // Track unread messages when panel is closed
  useEffect(() => {
    if (!isOpen && messages.length > prevCountRef.current) {
      setUnreadCount((c) => c + (messages.length - prevCountRef.current));
    }
    if (isOpen) {
      setUnreadCount(0);
    }
    prevCountRef.current = messages.length;
  }, [messages.length, isOpen]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (isOpen && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length, isOpen]);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Keyboard shortcut: Enter or backtick to open, Escape to close
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = document.activeElement?.tagName;
      const isTyping = tag === "INPUT" || tag === "TEXTAREA";

      if (
        e.key === "`" &&
        !e.ctrlKey &&
        !e.metaKey &&
        !isTyping
      ) {
        e.preventDefault();
        onToggle();
      }
      // Enter opens chat when not already typing
      if (e.key === "Enter" && !isOpen && !isTyping) {
        e.preventDefault();
        onToggle();
      }
      if (e.key === "Escape" && isOpen) {
        onToggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onToggle]);

  const handleSend = () => {
    const text = draft.trim();
    if (!text) return;
    onSend(text);
    setDraft("");
  };

  return (
    <>
      {/* Toggle button (visible when closed) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-6 left-6 z-50 bg-gray-900/90 border border-gray-600 rounded-xl px-4 py-3 text-sm font-mono text-orange-400 hover:bg-gray-800 transition-colors flex items-center gap-2 cursor-pointer"
        >
          <span className="text-lg">💬</span>
          <span>Chat</span>
          <span className="text-gray-600 text-xs">(Enter)</span>
          {unreadCount > 0 && (
            <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      )}

      {/* Chat panel */}
      <div
        className={`fixed z-40 transition-transform duration-300 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          width: "360px",
          height: minimized ? "auto" : "min(500px, 70vh)",
          bottom: `${-position.y}px`,
          left: `${position.x}px`,
        }}
      >
        <div className="bg-[#1a1a2e]/95 backdrop-blur-md border-r border-t border-gray-700 h-full flex flex-col rounded-tr-xl">
          {/* Header */}
          <div
            className={`flex items-center justify-between px-4 py-2 border-b border-gray-800 ${dragging ? "cursor-grabbing" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <button onClick={onToggle} className="w-3 h-3 rounded-full bg-red-500/80 hover:bg-red-400 cursor-pointer" title="Close" />
                <button onClick={() => setMinimized((m) => !m)} className="w-3 h-3 rounded-full bg-yellow-500/80 hover:bg-yellow-400 cursor-pointer" title="Minimize" />
                <button onMouseDown={onMouseDown} className="w-3 h-3 rounded-full bg-green-500/80 hover:bg-green-400 cursor-grab active:cursor-grabbing" title="Drag to move" />
              </div>
              <span className="text-xs text-gray-500 font-mono">chat</span>
            </div>
          </div>

          {!minimized && (
            <>
              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 overflow-y-auto px-3 py-2 space-y-2"
              >
                {messages.length === 0 && (
                  <p className="text-gray-600 text-xs text-center mt-8 font-mono">
                    No messages yet. Say hi!
                  </p>
                )}
                {messages.map((msg) => (
                  <div key={msg.id} className="text-sm">
                    <span
                      className="font-bold font-mono"
                      style={{
                        color:
                          msg.username === localUsername
                            ? "#ffd700"
                            : (ICON_COLORS[msg.iconIndex] ?? "#999"),
                      }}
                    >
                      {msg.username}
                    </span>
                    <span className="text-gray-600 text-xs ml-1.5">
                      {timeAgo(msg.timestamp)}
                    </span>
                    <p className="text-gray-300 text-sm leading-snug break-words">
                      {msg.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Input */}
              <div className="px-3 py-2 border-t border-gray-800">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex gap-2"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    maxLength={200}
                    placeholder="Type a message..."
                    className="flex-1 bg-gray-800/60 text-sm text-gray-200 font-mono rounded-lg px-3 py-2 placeholder:text-gray-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50"
                  />
                  <button
                    type="submit"
                    className="bg-orange-600/80 hover:bg-orange-500 text-white text-sm font-mono px-3 py-2 rounded-lg transition-colors cursor-pointer"
                  >
                    Send
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
