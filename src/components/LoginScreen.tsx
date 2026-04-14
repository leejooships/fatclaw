"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { ICONS, drawClaudeIcon } from "@/lib/icons";

interface LoginScreenProps {
  onJoin: (googleIdToken: string, iconIndex: number) => void;
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
  const [selectedIcon, setSelectedIcon] = useState(0);
  const [error, setError] = useState("");
  const googleBtnRef = useRef<HTMLDivElement>(null);
  const selectedIconRef = useRef(selectedIcon);
  const onJoinRef = useRef(onJoin);
  const initializedRef = useRef(false);
  selectedIconRef.current = selectedIcon;
  onJoinRef.current = onJoin;

  useEffect(() => {
    if (initializedRef.current) return;

    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      setError("Google Client ID not configured");
      return;
    }

    let timer: ReturnType<typeof setTimeout>;

    const tryInit = () => {
      if (initializedRef.current) return;
      if (typeof google === "undefined" || !google.accounts?.id) {
        timer = setTimeout(tryInit, 200);
        return;
      }

      initializedRef.current = true;

      google.accounts.id.initialize({
        client_id: clientId,
        callback: (response: { credential: string }) => {
          onJoinRef.current(response.credential, selectedIconRef.current);
        },
      });

      if (googleBtnRef.current) {
        google.accounts.id.renderButton(googleBtnRef.current, {
          theme: "filled_black",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 320,
        });
      }
    };

    tryInit();
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="bg-gray-900/80 border border-gray-700 rounded-2xl p-8 max-w-md w-full">
        <h1 className="text-4xl font-black text-center text-orange-400 mb-2">
          Vibe with Friends
        </h1>
        <p className="text-gray-400 text-center text-sm mb-8">
          Hang out. Chat. Vibe.
        </p>

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

        {/* Google Sign-In */}
        <div className="flex justify-center mb-4">
          <div ref={googleBtnRef} />
        </div>

        {error && <p className="text-red-400 text-xs text-center mb-4">{error}</p>}

        <p className="text-xs text-gray-600 text-center mt-4">
          Sign in with Google to enter the world.
        </p>

        {/* CLI section */}
        <div className="mt-8 pt-6 border-t border-gray-700">
          <p className="text-sm text-gray-400 text-center mb-3">
            Or join from your terminal
          </p>
          <div className="bg-gray-800/80 rounded-lg px-4 py-3 font-mono text-sm text-gray-300">
            <p className="text-gray-500 mb-1"># Clone and run the CLI</p>
            <p>git clone https://github.com/leejooships/fatclaw.git</p>
            <p>cd fatclaw/cli</p>
            <p>bun install && bun start</p>
          </div>
          <p className="text-xs text-gray-600 text-center mt-2">
            Chat, move around, and ask Claude — all from the command line.
          </p>
        </div>
      </div>
    </div>
  );
}
