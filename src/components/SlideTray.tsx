import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Copy,
  Layers,
  X,
  Maximize2,
} from "lucide-react";
import type { Slide } from "../types/whiteboard";

interface SlideTrayProps {
  slides: Slide[];
  currentSlideIndex: number;
  onSelectSlide: (index: number) => void;
  onAddBlankSlide: () => void;
  onDuplicateSlide: () => void;
  onDeleteSlide: () => void;
  onFitToScreen?: () => void;
}

export const SlideTray: React.FC<SlideTrayProps> = ({
  slides,
  currentSlideIndex,
  onSelectSlide,
  onAddBlankSlide,
  onDuplicateSlide,
  onDeleteSlide,
  onFitToScreen,
}) => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const totalSlides = slides.length;
  const canGoPrev = currentSlideIndex > 0;
  const canGoNext = currentSlideIndex < totalSlides - 1;

  return (
    <>
      {/* ── Slide Thumbnail Drawer (Expandable Tray) ── */}
      {drawerOpen && (
        <div
          className="
            fixed bottom-20 right-5 z-50
            flex flex-col gap-2 p-3
            rounded-2xl bg-zinc-950/97 backdrop-blur-2xl
            border border-white/[0.08] shadow-[0_20px_60px_rgba(0,0,0,0.95)]
            w-72 max-h-[420px]
            animate-in fade-in slide-in-from-bottom-3 duration-200 select-none
          "
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/[0.07] text-xs">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-sky-400" />
              <span className="font-semibold text-white tracking-tight">
                Slides
                <span className="ml-1.5 text-zinc-500 font-normal">({totalSlides})</span>
              </span>
            </div>
            <div className="flex items-center gap-0.5">
              <button
                onClick={onDuplicateSlide}
                title="Duplicate Current Slide"
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              {totalSlides > 1 && (
                <button
                  onClick={onDeleteSlide}
                  title="Delete Current Slide"
                  className="p-1.5 rounded-lg text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Slides List */}
          <div className="flex flex-col gap-1.5 overflow-y-auto pr-0.5 max-h-[310px]
            [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full
            [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-track]:bg-transparent"
          >
            {slides.map((slide, idx) => {
              const isActive = idx === currentSlideIndex;
              const hasPdf = slide.images.some((i) => i.isPdfPage);
              const itemCount =
                slide.strokes.length +
                slide.shapes.length +
                slide.texts.length +
                slide.notes.length;
              const bgColor = slide.backgroundColor ?? (hasPdf ? "#ffffff" : "#0a0a0a");
              const isLight = bgColor === "#ffffff" || bgColor === "#e8e8e8" || bgColor === "#f5f5f5";

              return (
                <button
                  key={slide.id}
                  onClick={() => { onSelectSlide(idx); setDrawerOpen(false); }}
                  className={`
                    relative flex items-center gap-3 px-3 py-2.5 rounded-xl border text-left
                    transition-all duration-150 group
                    ${isActive
                      ? "bg-sky-500/12 border-sky-400/50 shadow-sm"
                      : "bg-white/[0.02] border-white/[0.06] hover:border-white/15 hover:bg-white/[0.05]"
                    }
                  `}
                >
                  {/* Active indicator bar */}
                  {isActive && (
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r-full bg-sky-400" />
                  )}

                  {/* Mini slide preview */}
                  <div
                    className="w-16 h-9 rounded-lg border shrink-0 flex items-center justify-center overflow-hidden relative"
                    style={{
                      backgroundColor: bgColor,
                      borderColor: isActive ? "rgba(56,189,248,0.4)" : "rgba(255,255,255,0.08)"
                    }}
                  >
                    {hasPdf ? (
                      <span className="text-[8px] font-semibold px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300">PDF</span>
                    ) : (
                      <span className={`text-[8px] font-mono ${isLight ? "text-zinc-400" : "text-zinc-600"}`}>
                        {itemCount > 0 ? `${itemCount}` : "·"}
                      </span>
                    )}
                  </div>

                  {/* Slide info */}
                  <div className="flex flex-col min-w-0">
                    <span className={`text-[12px] font-semibold leading-tight truncate ${isActive ? "text-sky-200" : "text-zinc-200"}`}>
                      {slide.title ?? `Slide ${idx + 1}`}
                    </span>
                    <span className="text-[10px] text-zinc-600 mt-0.5">
                      {hasPdf ? "PDF Page" : itemCount > 0 ? `${itemCount} element${itemCount !== 1 ? "s" : ""}` : "Blank"}
                    </span>
                  </div>

                  {/* Slide number badge */}
                  <span className={`ml-auto text-[10px] font-mono shrink-0 tabular-nums ${isActive ? "text-sky-400" : "text-zinc-600"}`}>
                    {idx + 1}
                  </span>
                </button>
              );
            })}

            {/* Add Slide button */}
            <button
              onClick={() => { onAddBlankSlide(); }}
              className="
                flex items-center gap-2.5 px-3 py-2.5 rounded-xl mt-0.5
                border border-dashed border-white/10 hover:border-sky-400/40
                bg-white/[0.01] hover:bg-sky-500/8
                text-zinc-500 hover:text-sky-300
                transition-all duration-150
              "
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium">Add blank slide</span>
              <span className="ml-auto text-[10px] font-mono text-zinc-700">⌃↵</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Fixed Bottom-Right Slide Controller Bar ── */}
      <div
        className="
          fixed bottom-5 right-5 z-40
          flex items-center gap-1 px-2 py-1.5
          rounded-2xl bg-zinc-950/90 backdrop-blur-2xl
          border border-white/[0.08] shadow-[0_8px_32px_rgba(0,0,0,0.8)]
          select-none transition-all duration-200
        "
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Previous Slide */}
        <button
          onClick={() => onSelectSlide(currentSlideIndex - 1)}
          disabled={!canGoPrev}
          title="Previous Slide (← / PageUp)"
          className={`
            p-1.5 rounded-xl transition-all duration-150 active:scale-90
            ${canGoPrev
              ? "text-zinc-300 hover:text-white hover:bg-white/10"
              : "text-zinc-700 cursor-not-allowed"
            }
          `}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Slide Counter (Opens Drawer) */}
        <button
          onClick={() => setDrawerOpen((prev) => !prev)}
          title="All Slides (click to open)"
          className={`
            flex items-center gap-1.5 px-2.5 py-1 rounded-xl
            text-xs font-semibold tabular-nums
            transition-all active:scale-95
            ${drawerOpen
              ? "bg-sky-500/15 text-sky-200 border border-sky-400/30"
              : "bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 hover:text-white border border-white/[0.06]"
            }
          `}
        >
          <Layers className="w-3.5 h-3.5 text-sky-400" />
          <span>{currentSlideIndex + 1} / {totalSlides}</span>
        </button>

        {/* Next Slide */}
        <button
          onClick={() => onSelectSlide(currentSlideIndex + 1)}
          disabled={!canGoNext}
          title="Next Slide (→ / PageDown)"
          className={`
            p-1.5 rounded-xl transition-all duration-150 active:scale-90
            ${canGoNext
              ? "text-zinc-300 hover:text-white hover:bg-white/10"
              : "text-zinc-700 cursor-not-allowed"
            }
          `}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {onFitToScreen && (
          <>
            <div className="w-px h-4 bg-white/[0.08] mx-0.5" />
            <button
              onClick={onFitToScreen}
              title="Fit to Screen (0)"
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all duration-150 active:scale-90"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          </>
        )}

        <div className="w-px h-4 bg-white/[0.08] mx-0.5" />

        {/* Add Slide */}
        <button
          onClick={onAddBlankSlide}
          title="Add Blank Slide (Ctrl+Enter)"
          className="
            flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold
            text-sky-300 bg-sky-500/12 hover:bg-sky-500/22 border border-sky-500/25
            transition-all duration-150 active:scale-95
          "
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Slide</span>
        </button>
      </div>
    </>
  );
};
