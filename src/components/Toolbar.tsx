import React, { useState } from "react";
import {
  Hand,
  LassoSelect,
  PenLine,
  Highlighter,
  Eraser,
  Shapes,
  Minus,
  ArrowUpRight,
  Square,
  Circle,
  Triangle,
  Type,
  StickyNote,
  Radio,
  Sparkles,
  Undo2,
  Redo2,
  Plus,
  RotateCcw,
  Palette,
  Crosshair,
} from "lucide-react";
import type {
  StrokeColor,
  StrokeWidth,
  ToolMode,
  Camera,
  LineStyle,
  FillStyle,
  ShapeType,
} from "../types/whiteboard";
import { STROKE_WIDTH_MAP } from "../types/whiteboard";

interface ToolbarProps {
  mode: ToolMode;
  color: StrokeColor;
  strokeWidth: StrokeWidth;
  lineStyle: LineStyle;
  fillStyle: FillStyle;
  camera: Camera;
  canUndo: boolean;
  canRedo: boolean;
  onModeChange: (m: ToolMode) => void;
  onColorChange: (c: StrokeColor) => void;
  onWidthChange: (w: StrokeWidth) => void;
  onLineStyleChange: (ls: LineStyle) => void;
  onFillStyleChange: (fs: FillStyle) => void;
  onResetCamera: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onUndo: () => void;
  onRedo: () => void;
  smartSnapEnabled?: boolean;
  onToggleSmartSnap?: () => void;
}

/** Curated Chalk & Slate pigment swatches */
const CURATED_PALETTE: { value: string; label: string; glow: string }[] = [
  { value: "#F8FAFC", label: "Pure Chalk", glow: "shadow-[0_0_12px_rgba(248,250,252,0.6)]" },
  { value: "#FDE047", label: "Cadmium Sun", glow: "shadow-[0_0_12px_rgba(253,224,71,0.6)]" },
  { value: "#38BDF8", label: "Electric Cyan", glow: "shadow-[0_0_12px_rgba(56,189,248,0.6)]" },
  { value: "#FB7185", label: "Coral Rose", glow: "shadow-[0_0_12px_rgba(251,113,133,0.6)]" },
  { value: "#4ADE80", label: "Mint Sage", glow: "shadow-[0_0_12px_rgba(74,222,128,0.6)]" },
  { value: "#FB923C", label: "Warm Amber", glow: "shadow-[0_0_12px_rgba(251,146,60,0.6)]" },
  { value: "#C084FC", label: "Iris Violet", glow: "shadow-[0_0_12px_rgba(192,132,252,0.6)]" },
];

const WIDTHS: { value: StrokeWidth; label: string; size: number }[] = [
  { value: "thin", label: "Fine Tip (3px)", size: STROKE_WIDTH_MAP.thin },
  { value: "medium", label: "Medium Tip (6px)", size: STROKE_WIDTH_MAP.medium },
  { value: "thick", label: "Marker Tip (12px)", size: STROKE_WIDTH_MAP.thick },
];

const SHAPES_LIST: { mode: ShapeType; label: string; icon: React.ReactNode; shortcut: string }[] = [
  { mode: "line", label: "Straight Line", icon: <Minus className="w-3.5 h-3.5" />, shortcut: "L" },
  { mode: "arrow", label: "Vector Arrow", icon: <ArrowUpRight className="w-3.5 h-3.5" />, shortcut: "A" },
  { mode: "rectangle", label: "Rectangle", icon: <Square className="w-3.5 h-3.5" />, shortcut: "R" },
  { mode: "circle", label: "Circle / Ellipse", icon: <Circle className="w-3.5 h-3.5" />, shortcut: "C" },
  { mode: "triangle", label: "Triangle", icon: <Triangle className="w-3.5 h-3.5" />, shortcut: "Y" },
  { mode: "coordinate_plane", label: "Coordinate Plane (X-Y)", icon: <Crosshair className="w-3.5 h-3.5" />, shortcut: "X" },
];

export const Toolbar: React.FC<ToolbarProps> = ({
  mode,
  color,
  strokeWidth,
  lineStyle,
  fillStyle,
  camera,
  canUndo,
  canRedo,
  onModeChange,
  onColorChange,
  onWidthChange,
  onLineStyleChange,
  onFillStyleChange,
  onResetCamera,
  onZoomIn,
  onZoomOut,
  onUndo,
  onRedo,
  smartSnapEnabled,
  onToggleSmartSnap,
}) => {
  const [shapesOpen, setShapesOpen] = useState(false);

  const zoomPercent = Math.round(camera.zoom * 100);

  const isShapeActive =
    mode === "line" ||
    mode === "arrow" ||
    mode === "rectangle" ||
    mode === "circle" ||
    mode === "triangle" ||
    mode === "coordinate_plane";

  const getActiveShapeIcon = () => {
    switch (mode) {
      case "line":
        return <Minus className="w-3.5 h-3.5" />;
      case "arrow":
        return <ArrowUpRight className="w-3.5 h-3.5" />;
      case "rectangle":
        return <Square className="w-3.5 h-3.5" />;
      case "circle":
        return <Circle className="w-3.5 h-3.5" />;
      case "triangle":
        return <Triangle className="w-3.5 h-3.5" />;
      case "coordinate_plane":
        return <Crosshair className="w-3.5 h-3.5" />;
      default:
        return <Shapes className="w-3.5 h-3.5" />;
    }
  };

  const cycleLineStyle = () => {
    if (lineStyle === "solid") onLineStyleChange("dashed");
    else if (lineStyle === "dashed") onLineStyleChange("dotted");
    else onLineStyleChange("solid");
  };

  return (
    <>
      {/* ═══════════════════════════════════════════════════════════════════
          1. BOTTOM-LEFT DOCK: History & Viewport Navigation
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="
          fixed bottom-5 left-5 z-40
          flex items-center gap-1.5 px-2.5 py-1.5
          rounded-2xl bg-zinc-950/85 backdrop-blur-2xl
          border border-white/10 shadow-[0_16px_36px_rgba(0,0,0,0.8)]
          select-none transition-all duration-200
        "
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Undo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo last action"
          className={`
            p-1.5 rounded-xl transition-all duration-150 active:scale-90
            ${
              canUndo
                ? "text-zinc-300 hover:text-white hover:bg-white/10"
                : "text-zinc-600 cursor-not-allowed"
            }
          `}
        >
          <Undo2 className="w-4 h-4" />
        </button>

        {/* Redo */}
        <button
          onClick={onRedo}
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
          aria-label="Redo action"
          className={`
            p-1.5 rounded-xl transition-all duration-150 active:scale-90
            ${
              canRedo
                ? "text-zinc-300 hover:text-white hover:bg-white/10"
                : "text-zinc-600 cursor-not-allowed"
            }
          `}
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-white/10 shrink-0 mx-0.5" />

        {/* Zoom Out */}
        <button
          onClick={onZoomOut}
          title="Zoom Out"
          aria-label="Zoom out"
          className="p-1.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all duration-150 active:scale-90"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Clickable Zoom Percentage (Reset to 100%) */}
        <button
          onClick={onResetCamera}
          title="Reset Zoom to 100% & Center (Click)"
          className="
            px-2 py-0.5 rounded-lg font-mono text-[11px] font-semibold text-zinc-300
            hover:text-white hover:bg-white/10 transition-all duration-150 active:scale-95
          "
        >
          {zoomPercent}%
        </button>

        {/* Zoom In */}
        <button
          onClick={onZoomIn}
          title="Zoom In"
          aria-label="Zoom in"
          className="p-1.5 rounded-xl text-zinc-300 hover:text-white hover:bg-white/10 transition-all duration-150 active:scale-90"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {/* Reset Viewport */}
        <button
          onClick={onResetCamera}
          title="Center Canvas (100%)"
          className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-all duration-150 active:scale-90"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          2. BOTTOM-CENTER PRIMARY DOCK: Inking, Tools & Active Styles
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="
          fixed bottom-5 left-1/2 -translate-x-1/2
          flex items-center gap-2 px-3 py-2
          rounded-2xl bg-zinc-950/85 backdrop-blur-2xl
          border border-white/10
          shadow-[0_20px_50px_rgba(0,0,0,0.9)]
          z-40 select-none
          transition-all duration-200
        "
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* ── Cluster 1: Navigation & Lasso ── */}
        <div className="flex items-center gap-0.5 bg-white/[0.03] p-1 rounded-xl border border-white/5">
          {/* Pan */}
          <button
            onClick={() => {
              onModeChange("pan");
              setShapesOpen(false);
            }}
            title="Pan Blackboard (H) — or hold Spacebar anytime"
            className={`
              flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
              ${
                mode === "pan"
                  ? "bg-white text-zinc-950 font-semibold shadow-md shadow-white/20"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }
            `}
          >
            <Hand className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Pan</span>
            <span className="text-[9px] font-mono opacity-50">H</span>
          </button>

          {/* Lasso Selection */}
          <button
            onClick={() => {
              onModeChange("lasso");
              setShapesOpen(false);
            }}
            title="Lasso Selection (S) — Circle strokes to move, duplicate, or delete"
            className={`
              flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
              ${
                mode === "lasso"
                  ? "bg-cyan-400 text-zinc-950 font-bold shadow-md shadow-cyan-400/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }
            `}
          >
            <LassoSelect className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Lasso</span>
            <span className="text-[9px] font-mono opacity-50">S</span>
          </button>
        </div>

        {/* ── Cluster 2: Drawing & Inking ── */}
        <div className="flex items-center gap-0.5 bg-white/[0.03] p-1 rounded-xl border border-white/5">
          {/* Pen */}
          <button
            onClick={() => {
              onModeChange("draw");
              setShapesOpen(false);
            }}
            title="Pen (P) — Zero-latency digital chalk & ink"
            className={`
              flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
              ${
                mode === "draw"
                  ? "bg-white text-zinc-950 font-semibold shadow-md shadow-white/20"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }
            `}
          >
            <PenLine className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Pen</span>
            <span className="text-[9px] font-mono opacity-50">P</span>
          </button>

          {/* Highlighter */}
          <button
            onClick={() => {
              onModeChange("highlighter");
              setShapesOpen(false);
            }}
            title="Highlighter (B) — Fluorescent marker for lecture slides"
            className={`
              flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
              ${
                mode === "highlighter"
                  ? "bg-yellow-400 text-zinc-950 font-bold shadow-md shadow-yellow-400/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }
            `}
          >
            <Highlighter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Highlight</span>
            <span className="text-[9px] font-mono opacity-50">B</span>
          </button>

          {/* Eraser */}
          <button
            onClick={() => {
              onModeChange("erase");
              setShapesOpen(false);
            }}
            title="Precision Eraser (E) — Swept-capsule vector slicing"
            className={`
              flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
              ${
                mode === "erase"
                  ? "bg-white text-zinc-950 font-semibold shadow-md shadow-white/20"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }
            `}
          >
            <Eraser className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Eraser</span>
            <span className="text-[9px] font-mono opacity-50">E</span>
          </button>
        </div>

        {/* ── Cluster 3: Geometric Shapes & Objects ── */}
        <div className="flex items-center gap-0.5 bg-white/[0.03] p-1 rounded-xl border border-white/5">
          {/* Shapes Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShapesOpen((prev) => !prev)}
              title="Geometric Shapes (L, A, R, C, Y)"
              className={`
                flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
                ${
                  isShapeActive
                    ? "bg-sky-500 text-white font-semibold shadow-md shadow-sky-500/30"
                    : "text-zinc-400 hover:text-white hover:bg-white/10"
                }
              `}
            >
              {getActiveShapeIcon()}
              <span className="hidden sm:inline">Shapes</span>
              <span className="text-[10px] opacity-60">▾</span>
            </button>

            {/* Shapes Floating Menu */}
            {shapesOpen && (
              <div
                className="
                  absolute bottom-full mb-2.5 left-0
                  flex flex-col gap-1 p-1.5 min-w-[170px]
                  rounded-2xl bg-zinc-950/95 backdrop-blur-2xl
                  border border-white/15 shadow-2xl shadow-black/80
                  z-50 animate-in fade-in slide-in-from-bottom-2 duration-150
                "
              >
                {SHAPES_LIST.map(({ mode: m, label, icon, shortcut }) => (
                  <button
                    key={m}
                    onClick={() => {
                      onModeChange(m);
                      setShapesOpen(false);
                    }}
                    className={`
                      flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all
                      ${
                        mode === m
                          ? "bg-sky-500 text-white font-bold"
                          : "text-zinc-300 hover:bg-white/10 hover:text-white"
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      {icon}
                      <span>{label}</span>
                    </div>
                    <kbd className="px-1.5 py-0.2 rounded bg-white/10 text-[9px] font-mono opacity-60">
                      {shortcut}
                    </kbd>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Typed Text */}
          <button
            onClick={() => {
              onModeChange("text");
              setShapesOpen(false);
            }}
            title="Typed Text Tool (T) — Click canvas to type"
            className={`
              flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
              ${
                mode === "text"
                  ? "bg-purple-500 text-white font-bold shadow-md shadow-purple-500/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }
            `}
          >
            <Type className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Text</span>
            <span className="text-[9px] font-mono opacity-50">T</span>
          </button>

          {/* Sticky Note */}
          <button
            onClick={() => {
              onModeChange("note");
              setShapesOpen(false);
            }}
            title="Lecture Sticky Note (N)"
            className={`
              flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
              ${
                mode === "note"
                  ? "bg-amber-400 text-zinc-950 font-bold shadow-md shadow-amber-400/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }
            `}
          >
            <StickyNote className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Note</span>
            <span className="text-[9px] font-mono opacity-50">N</span>
          </button>

          {/* Laser Pointer */}
          <button
            onClick={() => {
              onModeChange("laser");
              setShapesOpen(false);
            }}
            title="Laser Pointer (K) — Comet trail for lectures"
            className={`
              flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150
              ${
                mode === "laser"
                  ? "bg-rose-500 text-white font-bold shadow-md shadow-rose-500/40"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }
            `}
          >
            <Radio className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Laser</span>
            <span className="text-[9px] font-mono opacity-50">K</span>
          </button>
        </div>

        {/* ── Section Divider ── */}
        <div className="w-px h-6 bg-white/10 shrink-0 mx-0.5" />

        {/* ── Cluster 4: Contextual Active Tool Styling ── */}
        {mode === "erase" ? (
          /* Eraser Size Selector */
          <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5">
            <span className="text-[10px] font-mono text-zinc-400 px-1">Size:</span>
            {WIDTHS.map(({ value, label, size }) => (
              <button
                key={value}
                title={`Eraser ${label}`}
                onClick={() => onWidthChange(value)}
                className={`
                  flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-150
                  ${
                    strokeWidth === value
                      ? "bg-white/20 text-white ring-1 ring-white/30"
                      : "text-zinc-400 hover:text-white hover:bg-white/10"
                  }
                `}
              >
                <span
                  className="rounded-full bg-zinc-300 border border-white/40"
                  style={{ width: size * 1.5, height: size * 1.5 }}
                />
              </button>
            ))}
          </div>
        ) : (
          /* Inking / Shapes Colors, Tips, and Stroke Styles */
          <div className="flex items-center gap-2">
            {/* Curated Chalk Swatches */}
            <div className="flex items-center gap-1 bg-white/[0.03] p-1 rounded-xl border border-white/5">
              {CURATED_PALETTE.map(({ value, label, glow }) => (
                <button
                  key={value}
                  title={label}
                  onClick={() => onColorChange(value)}
                  className={`
                    w-6 h-6 rounded-full transition-transform duration-150 relative
                    ${color === value ? `scale-110 ring-2 ring-white ${glow}` : "opacity-80 hover:opacity-100 hover:scale-105"}
                  `}
                  style={{ backgroundColor: value }}
                />
              ))}

              {/* Custom Color Picker Input */}
              <div className="relative flex items-center">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => onColorChange(e.target.value)}
                  className="w-6 h-6 opacity-0 absolute inset-0 cursor-pointer"
                  title="Custom Pigment Color"
                />
                <div
                  className="w-6 h-6 rounded-full border border-white/20 flex items-center justify-center text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Custom Color Picker"
                >
                  <Palette className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* Tip Thickness */}
            <div className="flex items-center gap-0.5 bg-white/[0.03] p-1 rounded-xl border border-white/5">
              {WIDTHS.map(({ value, label, size }) => (
                <button
                  key={value}
                  title={label}
                  onClick={() => onWidthChange(value)}
                  className={`
                    flex items-center justify-center w-6 h-6 rounded-lg transition-all duration-150
                    ${
                      strokeWidth === value
                        ? "bg-white/25 text-white ring-1 ring-white/40"
                        : "text-zinc-400 hover:text-white hover:bg-white/10"
                    }
                  `}
                >
                  <span
                    className="block rounded-full bg-white transition-transform"
                    style={{ width: size, height: size }}
                  />
                </button>
              ))}
            </div>

            {/* Line Style Toggle (when in pen or shape mode) */}
            {(isShapeActive || mode === "draw") && (
              <button
                onClick={cycleLineStyle}
                title="Cycle Line Style: Solid, Dashed, Dotted"
                className="
                  flex items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-mono text-zinc-300
                  bg-white/[0.05] hover:bg-white/[0.12] hover:text-white border border-white/5
                  transition-all duration-150 active:scale-95
                "
              >
                {lineStyle === "solid" && (
                  <svg className="w-6 h-3" viewBox="0 0 24 12">
                    <line x1="2" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                )}
                {lineStyle === "dashed" && (
                  <svg className="w-6 h-3" viewBox="0 0 24 12">
                    <line x1="2" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="2.5" strokeDasharray="5, 3" strokeLinecap="round" />
                  </svg>
                )}
                {lineStyle === "dotted" && (
                  <svg className="w-6 h-3" viewBox="0 0 24 12">
                    <line x1="2" y1="6" x2="22" y2="6" stroke="currentColor" strokeWidth="2.5" strokeDasharray="1, 4" strokeLinecap="round" />
                  </svg>
                )}
                <span className="hidden sm:inline capitalize">{lineStyle}</span>
              </button>
            )}

            {/* Smart Snap Auto-Shape Toggle (in Pen Mode) */}
            {mode === "draw" && onToggleSmartSnap && (
              <button
                onClick={onToggleSmartSnap}
                title="Draw-and-Hold Smart Ink (Alt+S) — Hold pen still 400ms to snap into geometric lines, arrows, circles, or boxes"
                className={`
                  flex items-center gap-1.5 px-2 py-1.5 rounded-xl text-[11px] font-mono border transition-all duration-150 active:scale-95
                  ${
                    smartSnapEnabled
                      ? "bg-amber-400/20 text-amber-300 border-amber-400/40 shadow-sm shadow-amber-400/20 font-bold"
                      : "bg-white/[0.05] text-zinc-400 border-white/5 hover:text-white"
                  }
                `}
              >
                <Sparkles className={`w-3.5 h-3.5 ${smartSnapEnabled ? "text-amber-300 animate-pulse" : "text-zinc-500"}`} />
                <span className="hidden sm:inline">Smart Snap</span>
                <span className={`text-[9px] font-mono px-1 rounded ${smartSnapEnabled ? "bg-amber-400/30 text-amber-200" : "opacity-50"}`}>
                  {smartSnapEnabled ? "ON" : "OFF"}
                </span>
              </button>
            )}

            {/* Shape Fill Toggle (only when shape active) */}
            {isShapeActive && (
              <button
                onClick={() => onFillStyleChange(fillStyle === "none" ? "semi" : "none")}
                title="Toggle Shape Fill: Outline vs Tinted Shade"
                className={`
                  flex items-center gap-1 px-2 py-1.5 rounded-xl text-[11px] font-mono border transition-all duration-150 active:scale-95
                  ${
                    fillStyle === "semi"
                      ? "bg-sky-500/25 text-sky-200 border-sky-400/40"
                      : "bg-white/[0.05] text-zinc-400 border-white/5 hover:text-white"
                  }
                `}
              >
                <Square className={`w-3.5 h-3.5 ${fillStyle === "semi" ? "fill-sky-400/40" : ""}`} />
                <span>{fillStyle === "semi" ? "Tinted Fill" : "Outline"}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
};
