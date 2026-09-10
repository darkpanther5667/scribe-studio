import React from "react";
import { X, Command, Keyboard } from "lucide-react";

interface ShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ShortcutItem {
  keys: string[];
  label: string;
  desc: string;
}

const SHORTCUT_GROUPS: { group: string; items: ShortcutItem[] }[] = [
  {
    group: "Inking & Tools",
    items: [
      { keys: ["P"], label: "Pen Tool", desc: "Zero-latency vector chalk with pressure dynamics" },
      { keys: ["B"], label: "Highlighter", desc: "Semi-transparent fluorescent marker" },
      { keys: ["E"], label: "Precision Eraser", desc: "Swept-capsule eraser that slices intersecting strokes" },
      { keys: ["S"], label: "Lasso Select", desc: "Circle elements to move, duplicate, or delete" },
      { keys: ["Alt", "S"], label: "Smart Snap", desc: "Draw and hold 400ms to snap into geometric shapes" },
      { keys: ["T"], label: "Text", desc: "Click canvas to place typed notes" },
      { keys: ["N"], label: "Sticky Note", desc: "Place a pinned lecture sticky note card" },
      { keys: ["K"], label: "Laser Pointer", desc: "Fading comet trail for pointing during lectures" },
    ],
  },
  {
    group: "Geometric Shapes",
    items: [
      { keys: ["L"], label: "Straight Line", desc: "Snap-aligned straight vector rule" },
      { keys: ["A"], label: "Directional Arrow", desc: "Vector arrow with aligned arrowhead" },
      { keys: ["R"], label: "Rectangle / Box", desc: "Rectangles, squares, and boundary boxes" },
      { keys: ["C"], label: "Circle / Ellipse", desc: "Perfect circles and diagrams" },
      { keys: ["Y"], label: "Triangle", desc: "Geometric triangles for trigonometry & proofs" },
    ],
  },
  {
    group: "Navigation & Canvas",
    items: [
      { keys: ["H"], label: "Pan Canvas", desc: "Click and drag to pan across infinite blackboard" },
      { keys: ["Space", "Drag"], label: "Quick Pan", desc: "Hold spacebar anytime to pan with pen or mouse" },
      { keys: ["Wheel"], label: "Pinch / Zoom", desc: "Smooth zoom toward pointer focal point" },
      { keys: ["G"], label: "Cycle Grid", desc: "Toggle Dot Grid, Math Graph, or Pure Blackboard" },
    ],
  },
  {
    group: "History & Selection",
    items: [
      { keys: ["Ctrl", "Z"], label: "Undo", desc: "Revert last inking stroke, shape, or action" },
      { keys: ["Ctrl", "Y"], label: "Redo", desc: "Redo reverted whiteboard action" },
      { keys: ["Ctrl", "D"], label: "Duplicate", desc: "Duplicate active lasso selection (+32px offset)" },
      { keys: ["Del"], label: "Delete", desc: "Delete lasso selection or selected PDF page" },
      { keys: ["Esc"], label: "Deselect", desc: "Clear active selection or cancel modal" },
    ],
  },
];

export const ShortcutsModal: React.FC<ShortcutsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150 select-none"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl max-h-[85vh] flex flex-col rounded-2xl bg-zinc-950/95 border border-white/10 shadow-[0_25px_70px_rgba(0,0,0,0.95)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white tracking-wide">
                Keyboard Shortcuts & Gestures
              </h2>
              <p className="text-xs text-zinc-400">
                Master rapid whiteboard navigation and inking
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Shortcuts List */}
        <div className="p-6 overflow-y-auto space-y-6 divide-y divide-white/5">
          {SHORTCUT_GROUPS.map((group) => (
            <div key={group.group} className="pt-4 first:pt-0">
              <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-cyan-400/90 mb-3">
                {group.group}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {group.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5 hover:border-white/10 transition-colors"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-xs font-medium text-zinc-200">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-zinc-400 truncate">
                        {item.desc}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {item.keys.map((k) => (
                        <kbd
                          key={k}
                          className="px-2 py-0.5 rounded-md bg-zinc-900 border border-white/15 text-[11px] font-mono font-semibold text-zinc-200 shadow-sm"
                        >
                          {k}
                        </kbd>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-white/10 bg-white/[0.02] text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <Command className="w-3.5 h-3.5 text-zinc-500" />
            <span>Scribe Studio Pro</span>
          </div>
          <div>
            Press <kbd className="px-1.5 py-0.5 rounded bg-zinc-800 text-[10px] font-mono">Esc</kbd> to close
          </div>
        </div>
      </div>
    </div>
  );
};
