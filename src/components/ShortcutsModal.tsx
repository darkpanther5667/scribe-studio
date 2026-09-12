import React from "react";
import { X, Keyboard, Sparkles } from "lucide-react";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  label: string;
  badge?: string;
}

interface ShortcutCategory {
  title: string;
  items: ShortcutItem[];
}

const SHORTCUT_CATEGORIES: ShortcutCategory[] = [
  {
    title: "Inking & Pens",
    items: [
      { keys: ["P"], label: "Switch to Pen tool" },
      { keys: ["H"], label: "Switch to Under-ink Highlighter" },
      { keys: ["E"], label: "Switch to Precision Eraser" },
      { keys: ["1", "2", "3"], label: "Activate Favorite Pen slot 1, 2, or 3", badge: "NEW" },
      { keys: ["[", "]"], label: "Decrease / Increase Nib Thickness", badge: "NEW" },
      { keys: ["Barrel Rocker"], label: "Hold stylus side button to quickly erase or lasso", badge: "TABLET" },
      { keys: ["Scribble"], label: "Scratch back and forth to erase (Enable in Tablet Settings)", badge: "GESTURE" },
    ],
  },
  {
    title: "Tools & Geometric Shapes",
    items: [
      { keys: ["S"], label: "Lasso selection tool" },
      { keys: ["T"], label: "Canvas-direct typed text input" },
      { keys: ["N"], label: "Sticky note / callout card" },
      { keys: ["M"], label: "KaTeX math & LaTeX formula stamp" },
      { keys: ["K"], label: "Laser pointer with fading comet tail" },
      { keys: ["L"], label: "Straight line" },
      { keys: ["A"], label: "Vector arrow" },
      { keys: ["R"], label: "Rectangle / Box" },
      { keys: ["C"], label: "Circle / Ellipse" },
      { keys: ["X"], label: "X-Y Coordinate plane axes" },
    ],
  },
  {
    title: "Educator Superpowers",
    items: [
      { keys: ["Shift", "K"], label: "Toggle Focus Spotlight Beam", badge: "SUPERPOWER" },
      { keys: ["Shift", "R"], label: "Toggle STEM Virtual Acrylic Ruler", badge: "SUPERPOWER" },
      { keys: ["Shift", "F"], label: "Open Interactive Function Plotter Studio", badge: "SUPERPOWER" },
      { keys: ["Shift", "Curtain"], label: "Presentation Derivation Reveal Curtain" },
    ],
  },
  {
    title: "Canvas, Navigation & Session",
    items: [
      { keys: ["F"], label: "Toggle Zen Full-Screen distraction-free teaching mode", badge: "NEW" },
      { keys: ["Space", "+ Drag"], label: "Pan whiteboard blackboard" },
      { keys: ["Ctrl", "Z"], label: "Undo last action" },
      { keys: ["Ctrl", "Y"], label: "Redo action" },
      { keys: ["Ctrl", "N"], label: "Create clean new lecture notebook" },
      { keys: ["?"], label: "Open this keyboard shortcuts cheatsheet" },
    ],
  },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-3xl bg-zinc-950/95 border border-white/15 p-6 shadow-2xl flex flex-col gap-5 max-h-[85vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-1.5">
                Keyboard Shortcuts & Teaching Gestures
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              </h2>
              <p className="text-xs text-zinc-400">
                Speed up your whiteboard delivery with lightning-fast hotkeys
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto space-y-5 pr-1 text-xs">
          {SHORTCUT_CATEGORIES.map((cat) => (
            <div key={cat.title} className="flex flex-col gap-2">
              <div className="text-[11px] font-mono uppercase tracking-wider font-semibold text-sky-400/90">
                {cat.title}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {cat.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:bg-white/[0.06] transition-colors"
                  >
                    <span className="text-zinc-300 font-medium truncate pr-2">
                      {item.label}
                    </span>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.badge && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-sky-500/20 text-sky-300 border border-sky-500/30">
                          {item.badge}
                        </span>
                      )}
                      <div className="flex items-center gap-0.5">
                        {item.keys.map((k, kidx) => (
                          <kbd
                            key={kidx}
                            className="px-1.5 py-0.5 rounded-md bg-white/10 text-white font-mono text-[10px] font-semibold border border-white/10 shadow-sm"
                          >
                            {k}
                          </kbd>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-white/10 text-xs text-zinc-500">
          <span>Press <kbd className="px-1 py-0.5 rounded bg-white/10 text-zinc-300 font-mono">Esc</kbd> anytime to close</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-white text-zinc-950 font-bold hover:bg-zinc-200 transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
};
