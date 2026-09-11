import React, { useState, useRef } from "react";
import { Eye, EyeOff, GripHorizontal, X } from "lucide-react";

interface PresentationCurtainProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PresentationCurtain: React.FC<PresentationCurtainProps> = ({ isOpen, onClose }) => {
  const [curtainY, setCurtainY] = useState(300); // Y position from top of screen in px
  const isDraggingRef = useRef(false);
  const dragStartYRef = useRef(0);
  const startCurtainYRef = useRef(0);

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    dragStartYRef.current = e.clientY;
    startCurtainYRef.current = curtainY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dy = e.clientY - dragStartYRef.current;
    const newY = Math.max(80, Math.min(window.innerHeight - 80, startCurtainYRef.current + dy));
    setCurtainY(newY);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-30 overflow-hidden">
      {/* Covered Frosted Area (below curtainY) */}
      <div
        className="absolute inset-x-0 bottom-0 pointer-events-auto backdrop-blur-3xl bg-zinc-950/92 border-t-2 border-cyan-500/60 shadow-[0_-20px_50px_rgba(0,0,0,0.8)] flex flex-col items-center justify-start transition-all"
        style={{ top: `${curtainY}px` }}
      >
        {/* Grab Handle Bar */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className="
            -mt-4 flex items-center gap-2 px-4 py-1.5 rounded-full
            bg-zinc-900 border border-cyan-500/40 shadow-lg shadow-cyan-500/20
            cursor-row-resize hover:bg-zinc-800 transition-all select-none
          "
        >
          <GripHorizontal className="w-4 h-4 text-cyan-400" />
          <span className="text-[11px] font-bold text-zinc-200 tracking-wide">
            Drag to Reveal Solution
          </span>
          <div className="flex items-center gap-1 pl-2 border-l border-white/10">
            <button
              onClick={() => setCurtainY(window.innerHeight - 100)}
              title="Reveal All"
              className="p-0.5 rounded text-zinc-400 hover:text-white"
            >
              <Eye className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurtainY(120)}
              title="Hide All"
              className="p-0.5 rounded text-zinc-400 hover:text-white"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={onClose}
              title="Close Curtain"
              className="p-0.5 rounded text-zinc-400 hover:text-rose-400"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Shaded Background Hint */}
        <div className="mt-12 text-center text-zinc-600 font-mono text-xs select-none">
          ✦ Hidden Derivation Area • Drag bar down to present step-by-step
        </div>
      </div>
    </div>
  );
};
