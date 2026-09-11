import React, { useState, useEffect } from "react";
import { Pipette, Palette, X, Sparkles } from "lucide-react";
import {
  PALETTE_PACKS,
  getRecentColors,
  saveRecentColor,
} from "../utils/colorPalettes";

interface ColorPickerPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  currentColor: string;
  onSelectColor: (color: string) => void;
  anchorPosition?: { bottom: number; left: number };
}

export const ColorPickerPopover: React.FC<ColorPickerPopoverProps> = ({
  isOpen,
  onClose,
  currentColor,
  onSelectColor,
  anchorPosition,
}) => {
  const [activePackId, setActivePackId] = useState<string>("neon");
  const [recentColors, setRecentColors] = useState<string[]>([]);
  const hasEyeDropper = typeof window !== "undefined" && "EyeDropper" in window;

  useEffect(() => {
    if (isOpen) {
      setRecentColors(getRecentColors());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPack =
    PALETTE_PACKS.find((p) => p.id === activePackId) || PALETTE_PACKS[0];

  const handlePickColor = (color: string) => {
    onSelectColor(color);
    const updated = saveRecentColor(color);
    setRecentColors(updated);
  };

  const handleEyeDropper = async () => {
    if (!hasEyeDropper) return;
    try {
      const eyeDropper = new (window as any).EyeDropper();
      const result = await eyeDropper.open();
      if (result && result.sRGBHex) {
        handlePickColor(result.sRGBHex);
      }
    } catch {
      // User cancelled eye dropper
    }
  };

  return (
    <div
      className="fixed z-50 animate-in fade-in zoom-in-95 duration-150 select-none"
      style={{
        bottom: anchorPosition ? `${anchorPosition.bottom}px` : "72px",
        left: anchorPosition ? `${anchorPosition.left}px` : "50%",
        transform: anchorPosition ? "none" : "translateX(-50%)",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="w-80 rounded-2xl bg-zinc-950/95 backdrop-blur-2xl border border-white/15 p-3.5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
            <Palette className="w-3.5 h-3.5 text-sky-400" />
            <span>Educator Color Studio</span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Palette Tabs */}
        <div className="grid grid-cols-4 gap-1 p-0.5 rounded-xl bg-white/[0.04] border border-white/5">
          {PALETTE_PACKS.map((pack) => (
            <button
              key={pack.id}
              onClick={() => setActivePackId(pack.id)}
              className={`
                py-1 px-1.5 rounded-lg text-[10px] font-medium transition-all text-center truncate
                ${
                  activePackId === pack.id
                    ? "bg-white/15 text-white shadow-sm font-semibold"
                    : "text-zinc-400 hover:text-zinc-200"
                }
              `}
              title={pack.description}
            >
              {pack.name.split(" ")[0]}
            </button>
          ))}
        </div>

        {/* Swatches Grid */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">
            {currentPack.name} Swatches
          </span>
          <div className="grid grid-cols-7 gap-1.5">
            {currentPack.swatches.map((s) => {
              const isSelected = currentColor.toLowerCase() === s.value.toLowerCase();
              return (
                <button
                  key={s.value}
                  onClick={() => handlePickColor(s.value)}
                  title={s.label}
                  className={`
                    w-8 h-8 rounded-xl transition-all duration-150 relative flex items-center justify-center
                    hover:scale-110 active:scale-95 border border-white/20
                    ${isSelected ? "ring-2 ring-white ring-offset-2 ring-offset-zinc-950 scale-105" : ""}
                    ${s.glow || ""}
                  `}
                  style={{ backgroundColor: s.value }}
                >
                  {isSelected && (
                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Hex Picker & Eyedropper row */}
        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/10">
          {/* Eyedropper */}
          {hasEyeDropper && (
            <button
              onClick={handleEyeDropper}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-zinc-300 hover:text-white border border-white/10 transition-colors"
              title="Sample color from screen (Eyedropper)"
            >
              <Pipette className="w-3.5 h-3.5 text-sky-400" />
              <span>Eyedropper</span>
            </button>
          )}

          {/* HTML5 Native Color Picker Input */}
          <label className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-xs font-medium text-zinc-300 hover:text-white border border-white/10 transition-colors cursor-pointer relative overflow-hidden">
            <input
              type="color"
              value={currentColor}
              onChange={(e) => handlePickColor(e.target.value)}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Custom Hex</span>
          </label>
        </div>

        {/* Recent Colors Strip */}
        {recentColors.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-1">
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400">
              Recent Colors
            </span>
            <div className="flex items-center gap-1.5">
              {recentColors.map((rc, idx) => (
                <button
                  key={`${rc}-${idx}`}
                  onClick={() => onSelectColor(rc)}
                  title={rc}
                  className={`
                    w-6 h-6 rounded-lg transition-transform hover:scale-110 active:scale-95 border border-white/20
                    ${currentColor.toLowerCase() === rc.toLowerCase() ? "ring-2 ring-white ring-offset-1 ring-offset-zinc-950" : ""}
                  `}
                  style={{ backgroundColor: rc }}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
