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
            fixed bottom-20 right-6 z-50
            flex flex-col gap-2 p-3
            rounded-3xl bg-zinc-950/95 backdrop-blur-2xl
            border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.95)]
            max-w-md w-80 max-h-96
            animate-in fade-in slide-in-from-bottom-2 duration-150 select-none
          "
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Drawer Header */}
          <div className="flex items-center justify-between pb-2 border-b border-white/10 text-xs">
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-cyan-400" />
              <span className="font-semibold text-white">Lecture Slides ({totalSlides})</span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={onDuplicateSlide}
                title="Duplicate Current Slide"
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>

              {totalSlides > 1 && (
                <button
                  onClick={onDeleteSlide}
                  title="Delete Current Slide"
                  className="p-1 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={() => setDrawerOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Slides Grid / List */}
          <div className="grid grid-cols-2 gap-2 overflow-y-auto p-1 max-h-72">
            {slides.map((slide, idx) => {
              const isActive = idx === currentSlideIndex;
              const hasPdf = slide.images.some((i) => i.isPdfPage);
              const itemCount =
                slide.strokes.length +
                slide.shapes.length +
                slide.texts.length +
                slide.notes.length;

              return (
                <button
                  key={slide.id}
                  onClick={() => {
                    onSelectSlide(idx);
                    setDrawerOpen(false);
                  }}
                  className={`
                    relative flex flex-col items-start p-2.5 rounded-2xl border text-left transition-all duration-150
                    ${
                      isActive
                        ? "bg-cyan-500/20 border-cyan-400/80 shadow-md shadow-cyan-500/20 ring-1 ring-cyan-400/40"
                        : "bg-white/[0.03] border-white/5 hover:border-white/20 hover:bg-white/[0.06]"
                    }
                  `}
                >
                  <div className="flex items-center justify-between w-full mb-1.5">
                    <span className="text-[11px] font-mono font-bold text-white">
                      Slide {idx + 1}
                    </span>
                    {hasPdf && (
                      <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-cyan-400/20 text-cyan-300">
                        DOC
                      </span>
                    )}
                  </div>

                  {/* Mock Mini Canvas Preview */}
                  <div className="w-full h-14 rounded-lg bg-black border border-white/10 flex items-center justify-center relative overflow-hidden">
                    <span className="text-[10px] font-mono text-zinc-500">
                      {itemCount > 0 ? `${itemCount} elements` : "Blank Slate"}
                    </span>
                  </div>
                </button>
              );
            })}

            {/* Add Slide Tile */}
            <button
              onClick={() => {
                onAddBlankSlide();
              }}
              className="
                flex flex-col items-center justify-center p-3 rounded-2xl
                border border-dashed border-white/20 hover:border-cyan-400/60
                bg-white/[0.02] hover:bg-cyan-500/10 text-zinc-400 hover:text-cyan-300
                transition-all duration-150 h-24
              "
            >
              <Plus className="w-5 h-5 mb-1" />
              <span className="text-xs font-semibold">+ Blank Slide</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Fixed Bottom-Right Slide Controller Bar ── */}
      <div
        className="
          fixed bottom-5 right-5 z-40
          flex items-center gap-1.5 px-2.5 py-1.5
          rounded-2xl bg-zinc-950/85 backdrop-blur-2xl
          border border-white/10 shadow-[0_16px_36px_rgba(0,0,0,0.8)]
          select-none transition-all duration-200
        "
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Previous Slide */}
        <button
          onClick={() => onSelectSlide(currentSlideIndex - 1)}
          disabled={!canGoPrev}
          title="Previous Slide (PageUp / Left Arrow)"
          className={`
            p-1.5 rounded-xl transition-all duration-150 active:scale-90
            ${
              canGoPrev
                ? "text-zinc-300 hover:text-white hover:bg-white/10"
                : "text-zinc-600 cursor-not-allowed"
            }
          `}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Slide Counter Button (Opens Drawer) */}
        <button
          onClick={() => setDrawerOpen((prev) => !prev)}
          title="View All Slides / Jump to Slide"
          className="
            flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-mono font-semibold
            bg-white/[0.04] hover:bg-white/[0.1] text-zinc-200 hover:text-white
            border border-white/5 transition-all active:scale-95
          "
        >
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span>
            {currentSlideIndex + 1} / {totalSlides}
          </span>
        </button>

        {/* Next Slide */}
        <button
          onClick={() => onSelectSlide(currentSlideIndex + 1)}
          disabled={!canGoNext}
          title="Next Slide (PageDown / Right Arrow)"
          className={`
            p-1.5 rounded-xl transition-all duration-150 active:scale-90
            ${
              canGoNext
                ? "text-zinc-300 hover:text-white hover:bg-white/10"
                : "text-zinc-600 cursor-not-allowed"
            }
          `}
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {onFitToScreen && (
          <button
            onClick={onFitToScreen}
            title="Fit Slide to Full Screen (0 / Ctrl+0)"
            className="p-1.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all duration-150 active:scale-90"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        )}

        <div className="w-px h-4 bg-white/10 shrink-0 mx-0.5" />

        {/* Add Blank Slide (Insert right after current slide) */}
        <button
          onClick={onAddBlankSlide}
          title="Insert Blank Slide after current (Ctrl + Enter)"
          className="
            flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-semibold
            text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30
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
