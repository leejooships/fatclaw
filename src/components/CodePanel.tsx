"use client";

import { useRef, useEffect } from "react";

interface CodePanelProps {
  code: string;
  onChange: (code: string) => void;
  linesOfCode: number;
  isOpen: boolean;
  onToggle: () => void;
}

export default function CodePanel({ code, onChange, linesOfCode, isOpen, onToggle }: CodePanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      // Small delay to let the panel animate open
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Listen for Tab key to toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Tab" && !e.shiftKey && !e.ctrlKey && !e.metaKey) {
        // Only intercept Tab if we're not focused on the textarea
        if (document.activeElement !== textareaRef.current) {
          e.preventDefault();
          onToggle();
        }
      }
      if (e.key === "Escape" && isOpen) {
        onToggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onToggle]);

  const fatPercent = Math.min(100, (linesOfCode / 300) * 100);

  return (
    <>
      {/* Toggle button (always visible) */}
      {!isOpen && (
        <button
          onClick={onToggle}
          className="fixed bottom-6 right-6 z-50 bg-gray-900/90 border border-gray-600 rounded-xl px-4 py-3 text-sm font-mono text-orange-400 hover:bg-gray-800 transition-colors flex items-center gap-2 cursor-pointer"
        >
          <span className="text-lg">{'</>'}</span>
          <span>Code ({linesOfCode} lines)</span>
          <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-orange-500 rounded-full transition-all duration-300"
              style={{ width: `${fatPercent}%` }}
            />
          </div>
        </button>
      )}

      {/* Panel */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-40 transition-transform duration-300 ${
          isOpen ? "translate-y-0" : "translate-y-full"
        }`}
      >
        <div className="bg-[#1a1a2e]/95 backdrop-blur-md border-t border-gray-700">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
            <div className="flex items-center gap-3">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/80" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                <div className="w-3 h-3 rounded-full bg-green-500/80" />
              </div>
              <span className="text-xs text-gray-500 font-mono">vibes.ts</span>
              <span className="text-xs text-gray-600 font-mono">{linesOfCode} lines</span>
              <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${fatPercent}%`,
                    background: "linear-gradient(90deg, #d9773c, #e8a065, #ff6b6b)",
                  }}
                />
              </div>
            </div>
            <button
              onClick={onToggle}
              className="text-gray-500 hover:text-white text-sm px-2 py-1 cursor-pointer"
            >
              Close (Esc)
            </button>
          </div>

          {/* Editor */}
          <textarea
            ref={textareaRef}
            value={code}
            onChange={(e) => onChange(e.target.value)}
            className="w-full h-48 bg-transparent text-sm font-mono text-green-300/90 p-4 resize-none placeholder:text-gray-600 focus:outline-none"
            placeholder="// Start vibe coding here to make your Claude BIGGER...
// Paste your code, write new code, go wild!
// Every non-empty line counts toward your fatness."
            spellCheck={false}
            autoCapitalize="off"
            autoCorrect="off"
          />
        </div>
      </div>
    </>
  );
}
