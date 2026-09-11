import React, { useState } from "react";
import {
  PenLine,
  Highlighter,
  Eraser,
  LassoSelect,
  Undo2,
  Redo2,
  ChevronLeft,
  ChevronRight,
  Plus,
  ChevronDown,
  ChevronUp,
  Maximize2,
  MoveHorizontal,
} from "lucide-react";
import type { ToolMode, FavoritePen } from "../types/whiteboard";

interface FloatingMiniDockProps {
  isVisible: boolean;
  mode: ToolMode;
  onModeChange: (m: ToolMode) => void;
  color: string;
  onOpenColorPicker: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  currentSlideIndex: number;
  totalSlides: number;
  onPrevSlide: () => void;
  onNextSlide: () => void;
  onAddSlide: () => void;
  favoritePens: FavoritePen[];
  activeFavoriteIndex: number | null;
  onSelectFavoritePen: (index: number) => void;
  isZenMode?: boolean;
  onToggleZenMode?: () => void;
}

export const FloatingMiniDock: React.FC<FloatingMiniDockProps> = ({
  isVisible,
  mode,
  onModeChange,
  color,
  onOpenColorPicker,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  currentSlideIndex,
  totalSlides,
  onPrevSlide,
  onNextSlide,
  onAddSlide,
  favoritePens,
  activeFavoriteIndex,
  onSelectFavoritePen,
  isZenMode = false,
  onToggleZenMode,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [side, setSide] = useState<"left" | "right">("left");

  if (!isVisible) return null;

  return (
    <div
      className={`
        fixed z-40 select-none transition-all duration-300
        ${side === "left" ? "left-3" : "right-3"}
        top-1/2 -translate-y-1/2
      `}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex flex-col items-center gap-2 p-1.5 rounded-2xl bg-zinc-950/92 backdrop-blur-2xl border border-white/15 shadow-[0_12px_40px_rgba(0,0,0,0.8)]">
        {/* Toggle Minimize & Side Switcher */}
        <div className="flex items-center justify-between w-full px-1 pt-0.5">
          <button
            onClick={() => setSide((s) => (s === "left" ? "right" : "left"))}
            title={`Switch to ${side === "left" ? "Right" : "Left"} handed dock`}
            className="p-0.5 rounded text-zinc-500 hover:text-zinc-300"
          >
            <MoveHorizontal className="w-3 h-3" />
          </button>
          <button
            onClick={() => setIsMinimized((m) => !m)}
            title={isMinimized ? "Expand Mini Dock" : "Minimize Mini Dock"}
            className="p-0.5 rounded text-zinc-500 hover:text-zinc-300"
          >
            {isMinimized ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
          </button>
        </div>

        {/* Minimized compact indicator */}
        {isMinimized ? (
          <div
            onClick={() => setIsMinimized(false)}
            className="cursor-pointer flex flex-col items-center gap-1.5 py-1"
            title="Click to expand mini inking dock"
          >
            <div
              className="w-5 h-5 rounded-full border border-white/30 shadow-md"
              style={{ backgroundColor: color }}
            />
            <span className="text-[10px] font-mono text-zinc-400">
              {currentSlideIndex + 1}/{totalSlides}
            </span>
          </div>
        ) : (
          /* Expanded Mini Dock */
          <>
            {/* 1. Core Inking Tools */}
            <div className="flex flex-col items-center gap-1 p-0.5 rounded-xl bg-white/[0.04] border border-white/5">
              {/* Pen */}
              <button
                onClick={() => onModeChange("draw")}
                title="Pen (P)"
                className={`p-2 rounded-xl transition-all ${
                  mode === "draw"
                    ? "bg-white text-zinc-950 shadow-md font-bold scale-105"
                    : "text-zinc-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <PenLine className="w-4 h-4" />
              </button>

              {/* Highlighter */}
              <button
                onClick={() => onModeChange("highlighter")}
                title="Under-ink Highlighter (H)"
                className={`p-2 rounded-xl transition-all ${
                  mode === "highlighter"
                    ? "bg-amber-400 text-zinc-950 shadow-md font-bold scale-105"
                    : "text-zinc-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <Highlighter className="w-4 h-4" />
              </button>

              {/* Eraser */}
              <button
                onClick={() => onModeChange("erase")}
                title="Precision Eraser (E)"
                className={`p-2 rounded-xl transition-all ${
                  mode === "erase"
                    ? "bg-rose-500 text-white shadow-md font-bold scale-105"
                    : "text-zinc-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <Eraser className="w-4 h-4" />
              </button>

              {/* Lasso */}
              <button
                onClick={() => onModeChange("lasso")}
                title="Lasso Selection (S)"
                className={`p-2 rounded-xl transition-all ${
                  mode === "lasso"
                    ? "bg-cyan-400 text-zinc-950 shadow-md font-bold scale-105"
                    : "text-zinc-400 hover:text-white hover:bg-white/10"
                }`}
              >
                <LassoSelect className="w-4 h-4" />
              </button>
            </div>

            {/* 2. Educator Favorite Pens Bar (1, 2, 3) */}
            <div className="flex flex-col items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/5">
              <span className="text-[8px] uppercase tracking-wider font-mono text-zinc-500">
                Fav
              </span>
              {favoritePens.slice(0, 3).map((pen, idx) => {
                const isActive = activeFavoriteIndex === idx;
                return (
                  <button
                    key={pen.id || idx}
                    onClick={() => onSelectFavoritePen(idx)}
                    title={`Favorite ${idx + 1}: ${pen.name} (${idx + 1})`}
                    className={`
                      w-6 h-6 rounded-lg transition-all relative flex items-center justify-center
                      ${
                        isActive
                          ? "ring-2 ring-white scale-110 shadow-md"
                          : "opacity-80 hover:opacity-100 hover:scale-105"
                      }
                    `}
                    style={{ backgroundColor: pen.color }}
                  >
                    <span className="text-[9px] font-mono font-bold text-zinc-950 bg-white/70 px-0.5 rounded shadow-sm">
                      {idx + 1}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* 3. Active Color Swatch (Click to open Color Studio) */}
            <button
              onClick={onOpenColorPicker}
              title="Open Educator Color Studio"
              className="w-7 h-7 rounded-xl border-2 border-white/30 hover:scale-110 active:scale-95 transition-transform shadow-lg relative group"
              style={{ backgroundColor: color }}
            >
              <span className="absolute inset-0 rounded-xl bg-white/0 group-hover:bg-white/10" />
            </button>

            {/* 4. History Undo / Redo */}
            <div className="flex flex-col items-center gap-0.5 p-0.5 rounded-xl bg-white/[0.04] border border-white/5">
              <button
                onClick={onUndo}
                disabled={!canUndo}
                title="Undo (Ctrl+Z)"
                className={`p-1.5 rounded-lg transition-colors ${
                  canUndo ? "text-zinc-300 hover:text-white" : "text-zinc-700 cursor-not-allowed"
                }`}
              >
                <Undo2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={onRedo}
                disabled={!canRedo}
                title="Redo (Ctrl+Y)"
                className={`p-1.5 rounded-lg transition-colors ${
                  canRedo ? "text-zinc-300 hover:text-white" : "text-zinc-700 cursor-not-allowed"
                }`}
              >
                <Redo2 className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 5. Slide Navigation */}
            <div className="flex flex-col items-center gap-1 p-1 rounded-xl bg-white/[0.04] border border-white/5">
              <div className="flex items-center gap-0.5">
                <button
                  onClick={onPrevSlide}
                  disabled={currentSlideIndex <= 0}
                  title="Previous Slide"
                  className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400"
                >
                  <ChevronLeft className="w-3 h-3" />
                </button>
                <span className="text-[10px] font-mono text-zinc-300 font-bold px-0.5">
                  {currentSlideIndex + 1}
                </span>
                <button
                  onClick={onNextSlide}
                  disabled={currentSlideIndex >= totalSlides - 1}
                  title="Next Slide"
                  className="p-1 rounded text-zinc-400 hover:text-white disabled:opacity-30 disabled:hover:text-zinc-400"
                >
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              <button
                onClick={onAddSlide}
                title="Add Slide"
                className="p-1 rounded-lg text-zinc-400 hover:text-sky-300 hover:bg-sky-500/10 transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>

            {/* 6. Zen Mode Toggle Button */}
            {onToggleZenMode && (
              <button
                onClick={onToggleZenMode}
                title={isZenMode ? "Exit Zen Fullscreen (F)" : "Enter Zen Fullscreen (F)"}
                className={`p-1.5 rounded-xl border transition-all ${
                  isZenMode
                    ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                    : "text-zinc-500 hover:text-zinc-300 border-transparent hover:bg-white/5"
                }`}
              >
                <Maximize2 className="w-3 h-3" />
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
};
