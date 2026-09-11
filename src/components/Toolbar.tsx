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
  PenStyle,
} from "../types/whiteboard";
import { STROKE_WIDTH_MAP } from "../types/whiteboard";

/** Pen style definitions with visual preview SVG paths */
const PEN_STYLES: {
  value: PenStyle;
  label: string;
  preview: React.ReactNode;
}[] = [
  {
    value: "pen",
    label: "Pen",
    preview: (
      <svg viewBox="0 0 32 12" className="w-8 h-3">
        <path d="M2 10 C6 8 10 4 16 6 C22 8 26 4 30 2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    value: "brush",
    label: "Brush (毛笔)",
    preview: (
      <svg viewBox="0 0 32 14" className="w-8 h-3.5">
        <path d="M2 12 C5 9 8 3 16 5 C24 7 28 2 30 1" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round" strokeLinejoin="round" opacity="0.9"/>
        <path d="M2 12 C5 9 8 3 16 5 C24 7 28 2 30 1" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    value: "fountain",
    label: "Fountain Pen",
    preview: (
      <svg viewBox="0 0 32 12" className="w-8 h-3">
        <path d="M2 10 C6 9 10 5 16 6 C22 7 26 3 30 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        <path d="M2 10 C6 8 10 4 16 6" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.6"/>
      </svg>
    ),
  },
  {
    value: "marker",
    label: "Marker",
    preview: (
      <svg viewBox="0 0 32 12" className="w-8 h-3">
        <path d="M2 9 C8 8 16 7 30 3" stroke="currentColor" strokeWidth="5" fill="none" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    value: "pencil",
    label: "Pencil",
    preview: (
      <svg viewBox="0 0 32 12" className="w-8 h-3">
        <path d="M2 10 C6 9 10 5 16 6 C22 7 26 3 30 2" stroke="currentColor" strokeWidth="1" fill="none" strokeLinecap="round" opacity="0.5" strokeDasharray="2 1"/>
        <path d="M2 10 C6 9 10 5 16 6 C22 7 26 3 30 2" stroke="currentColor" strokeWidth="0.8" fill="none" strokeLinecap="round" opacity="0.9"/>
      </svg>
    ),
  },
  {
    value: "chisel",
    label: "Chisel (Calligraphy)",
    preview: (
      <svg viewBox="0 0 32 14" className="w-8 h-3.5">
        <path d="M2 12 L8 4 L14 8 L20 2 L28 6 L30 2" stroke="currentColor" strokeWidth="4" fill="none" strokeLinecap="square" strokeLinejoin="miter"/>
      </svg>
    ),
  },
];

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
  isFiniteMode?: boolean;
  penStyle?: PenStyle;
  onPenStyleChange?: (s: PenStyle) => void;
  fontStyle?: "normal" | "handwriting";
  onFontStyleChange?: (fs: "normal" | "handwriting") => void;
}

/** Palette swatches for dark (infinite) canvas mode */
const DARK_PALETTE: { value: string; label: string; glow: string }[] = [
  { value: "#F8FAFC", label: "Pure Chalk", glow: "shadow-[0_0_12px_rgba(248,250,252,0.6)]" },
  { value: "#FDE047", label: "Cadmium Sun", glow: "shadow-[0_0_12px_rgba(253,224,71,0.6)]" },
  { value: "#38BDF8", label: "Electric Cyan", glow: "shadow-[0_0_12px_rgba(56,189,248,0.6)]" },
  { value: "#FB7185", label: "Coral Rose", glow: "shadow-[0_0_12px_rgba(251,113,133,0.6)]" },
  { value: "#4ADE80", label: "Mint Sage", glow: "shadow-[0_0_12px_rgba(74,222,128,0.6)]" },
  { value: "#FB923C", label: "Warm Amber", glow: "shadow-[0_0_12px_rgba(251,146,60,0.6)]" },
  { value: "#C084FC", label: "Iris Violet", glow: "shadow-[0_0_12px_rgba(192,132,252,0.6)]" },
];

/** Palette swatches for light (finite sheet) mode */
const LIGHT_PALETTE: { value: string; label: string; glow: string }[] = [
  { value: "#1a1a2e", label: "Ink Black", glow: "shadow-[0_0_12px_rgba(26,26,46,0.6)]" },
  { value: "#1d4ed8", label: "Royal Blue", glow: "shadow-[0_0_12px_rgba(29,78,216,0.6)]" },
  { value: "#dc2626", label: "Crimson", glow: "shadow-[0_0_12px_rgba(220,38,38,0.6)]" },
  { value: "#16a34a", label: "Forest Green", glow: "shadow-[0_0_12px_rgba(22,163,74,0.6)]" },
  { value: "#9333ea", label: "Purple", glow: "shadow-[0_0_12px_rgba(147,51,234,0.6)]" },
  { value: "#ea580c", label: "Burnt Orange", glow: "shadow-[0_0_12px_rgba(234,88,12,0.6)]" },
  { value: "#0f766e", label: "Teal", glow: "shadow-[0_0_12px_rgba(15,118,110,0.6)]" },
];

/** Curated Chalk & Slate pigment swatches */


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
  isFiniteMode = false,
  penStyle = "pen",
  onPenStyleChange,
  fontStyle = "handwriting",
  onFontStyleChange,
}) => {
  const [shapesOpen, setShapesOpen] = useState(false);
  const [penStyleOpen, setPenStyleOpen] = useState(false);

  // Pick the right color palette for current mode
  const ACTIVE_PALETTE = isFiniteMode ? LIGHT_PALETTE : DARK_PALETTE;

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
          2. PRIMARY DOCK: Inking, Tools & Active Styles
          – Bottom-center in infinite mode, left-side vertical in finite mode
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        className={
          isFiniteMode
            ? // ── Finite / Sheet mode: vertical left sidebar ──────────────────
              `fixed left-2 top-1/2 -translate-y-1/2
               flex flex-col items-center gap-1.5 px-1.5 py-2.5
               rounded-2xl bg-white/90 backdrop-blur-2xl
               border border-black/10
               shadow-[4px_0_30px_rgba(0,0,0,0.25)]
               z-40 select-none
               transition-all duration-300 ease-out
               animate-[slideInLeft_0.3s_ease-out]`
            : // ── Infinite canvas mode: bottom-center horizontal pill ─────────
              `fixed bottom-5 left-1/2 -translate-x-1/2
               flex items-center gap-2 px-3 py-2
               rounded-2xl bg-zinc-950/85 backdrop-blur-2xl
               border border-white/10
               shadow-[0_20px_50px_rgba(0,0,0,0.9)]
               z-40 select-none
               transition-all duration-300 ease-out`
        }
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* ── Cluster 1: Navigation & Lasso ── */}
        <div className={`flex ${isFiniteMode ? "flex-col" : "flex-row"} items-center gap-0.5 ${isFiniteMode ? "bg-black/[0.04] rounded-xl p-1 border border-black/8" : "bg-white/[0.03] p-1 rounded-xl border border-white/5"}`}>
          {/* Pan — hidden in finite mode since pan is disabled */}
          {!isFiniteMode && (
            <button
              onClick={() => { onModeChange("pan"); setShapesOpen(false); }}
              title="Pan Blackboard (H) — or hold Spacebar anytime"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                mode === "pan" ? "bg-white text-zinc-950 font-semibold shadow-md shadow-white/20" : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <Hand className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Pan</span>
              <span className="text-[9px] font-mono opacity-50">H</span>
            </button>
          )}

          {/* Lasso Selection */}
          <button
            onClick={() => { onModeChange("lasso"); setShapesOpen(false); }}
            title="Lasso Selection (S)"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              mode === "lasso"
                ? "bg-cyan-400 text-zinc-950 font-bold shadow-md shadow-cyan-400/30"
                : isFiniteMode ? "text-zinc-600 hover:text-zinc-900 hover:bg-black/10" : "text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <LassoSelect className="w-3.5 h-3.5" />
            {!isFiniteMode && <><span className="hidden md:inline">Lasso</span><span className="text-[9px] font-mono opacity-50">S</span></>}
          </button>
        </div>

        {/* ── Cluster 2: Drawing & Inking ── */}
        <div className={`flex ${isFiniteMode ? "flex-col" : "flex-row"} items-center gap-0.5 ${isFiniteMode ? "bg-black/[0.04] rounded-xl p-1 border border-black/8" : "bg-white/[0.03] p-1 rounded-xl border border-white/5"}`}>
          {/* Pen */}
          <button
            onClick={() => { onModeChange("draw"); setShapesOpen(false); }}
            title="Pen (P)"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              mode === "draw"
                ? isFiniteMode ? "bg-zinc-900 text-white font-semibold shadow-md" : "bg-white text-zinc-950 font-semibold shadow-md shadow-white/20"
                : isFiniteMode ? "text-zinc-600 hover:text-zinc-900 hover:bg-black/10" : "text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <PenLine className="w-3.5 h-3.5" />
            {!isFiniteMode && <><span className="hidden sm:inline">Pen</span><span className="text-[9px] font-mono opacity-50">P</span></>}
          </button>

          {/* ── Pen Style Picker (only when Pen is active) ── */}
          {mode === "draw" && onPenStyleChange && (
            <div className="relative">
              <button
                onClick={() => setPenStyleOpen((p) => !p)}
                title={`Brush style: ${PEN_STYLES.find(s => s.value === penStyle)?.label ?? penStyle}`}
                className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                  isFiniteMode
                    ? "text-zinc-700 hover:text-zinc-900 hover:bg-black/10 border border-black/10"
                    : "text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10"
                } ${penStyleOpen ? (isFiniteMode ? "bg-black/10" : "bg-white/10") : ""}`}
              >
                {/* Live preview of current style */}
                <span className="w-8 h-3 flex items-center opacity-80">
                  {PEN_STYLES.find(s => s.value === penStyle)?.preview}
                </span>
                <span className="text-[9px] opacity-50">▾</span>
              </button>

              {/* Style dropdown */}
              {penStyleOpen && (
                <div className={`
                  absolute z-50
                  ${isFiniteMode ? "left-full ml-2 top-0" : "bottom-full mb-2 left-0"}
                  flex flex-col gap-0.5 p-1.5 min-w-[175px]
                  rounded-2xl bg-zinc-950/96 backdrop-blur-2xl
                  border border-white/15 shadow-2xl shadow-black/80
                  animate-in fade-in slide-in-from-bottom-2 duration-150
                `}>
                  <div className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider px-2 py-1">
                    Brush Style
                  </div>
                  {PEN_STYLES.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => { onPenStyleChange(s.value); setPenStyleOpen(false); }}
                      className={`flex items-center gap-3 px-2.5 py-2 rounded-xl text-xs font-medium transition-all ${
                        penStyle === s.value
                          ? "bg-sky-500 text-white font-bold"
                          : "text-zinc-300 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span className="w-10 flex-shrink-0 opacity-90">{s.preview}</span>
                      <span>{s.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {/* Highlighter */}
          <button
            onClick={() => { onModeChange("highlighter"); setShapesOpen(false); }}
            title="Highlighter (B)"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              mode === "highlighter"
                ? "bg-yellow-400 text-zinc-950 font-bold shadow-md shadow-yellow-400/30"
                : isFiniteMode ? "text-zinc-600 hover:text-zinc-900 hover:bg-black/10" : "text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
            {!isFiniteMode && <><span className="hidden sm:inline">Highlight</span><span className="text-[9px] font-mono opacity-50">B</span></>}
          </button>

          {/* Eraser */}
          <button
            onClick={() => { onModeChange("erase"); setShapesOpen(false); }}
            title="Eraser (E)"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              mode === "erase"
                ? isFiniteMode ? "bg-zinc-900 text-white font-semibold shadow-md" : "bg-white text-zinc-950 font-semibold shadow-md shadow-white/20"
                : isFiniteMode ? "text-zinc-600 hover:text-zinc-900 hover:bg-black/10" : "text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
            {!isFiniteMode && <><span className="hidden sm:inline">Eraser</span><span className="text-[9px] font-mono opacity-50">E</span></>}
          </button>
        </div>

        {/* ── Cluster 3: Geometric Shapes & Objects ── */}
        <div className={`flex ${isFiniteMode ? "flex-col" : "flex-row"} items-center gap-0.5 ${isFiniteMode ? "bg-black/[0.04] rounded-xl p-1 border border-black/8" : "bg-white/[0.03] p-1 rounded-xl border border-white/5"}`}>
          {/* Shapes Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShapesOpen((prev) => !prev)}
              title="Geometric Shapes (L, A, R, C, Y)"
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                isShapeActive
                  ? "bg-sky-500 text-white font-semibold shadow-md shadow-sky-500/30"
                  : isFiniteMode ? "text-zinc-600 hover:text-zinc-900 hover:bg-black/10" : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {getActiveShapeIcon()}
              {!isFiniteMode && <><span className="hidden sm:inline">Shapes</span><span className="text-[10px] opacity-60">▾</span></>}
            </button>

            {/* Shapes Floating Menu */}
            {shapesOpen && (
              <div className={`
                absolute ${isFiniteMode ? "left-full ml-2 top-0" : "bottom-full mb-2.5 left-0"}
                flex flex-col gap-1 p-1.5 min-w-[170px]
                rounded-2xl bg-zinc-950/95 backdrop-blur-2xl
                border border-white/15 shadow-2xl shadow-black/80
                z-50 animate-in fade-in slide-in-from-bottom-2 duration-150
              `}>
                {SHAPES_LIST.map(({ mode: m, label, icon, shortcut }) => (
                  <button
                    key={m}
                    onClick={() => { onModeChange(m); setShapesOpen(false); }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all ${
                      mode === m ? "bg-sky-500 text-white font-bold" : "text-zinc-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center gap-2">{icon}<span>{label}</span></div>
                    <kbd className="px-1.5 py-0.2 rounded bg-white/10 text-[9px] font-mono opacity-60">{shortcut}</kbd>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Typed Text */}
          <button
            onClick={() => { onModeChange("text"); setShapesOpen(false); }}
            title="Typed Text (T)"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              mode === "text"
                ? "bg-purple-500 text-white font-bold shadow-md shadow-purple-500/30"
                : isFiniteMode ? "text-zinc-600 hover:text-zinc-900 hover:bg-black/10" : "text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Type className="w-3.5 h-3.5" />
            {!isFiniteMode && <><span className="hidden sm:inline">Text</span><span className="text-[9px] font-mono opacity-50">T</span></>}
          </button>

          {/* Sticky Note */}
          <button
            onClick={() => { onModeChange("note"); setShapesOpen(false); }}
            title="Sticky Note (N)"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              mode === "note"
                ? "bg-amber-400 text-zinc-950 font-bold shadow-md shadow-amber-400/30"
                : isFiniteMode ? "text-zinc-600 hover:text-zinc-900 hover:bg-black/10" : "text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
            {!isFiniteMode && <><span className="hidden sm:inline">Note</span><span className="text-[9px] font-mono opacity-50">N</span></>}
          </button>

          {/* Laser Pointer */}
          <button
            onClick={() => { onModeChange("laser"); setShapesOpen(false); }}
            title="Laser Pointer (K)"
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
              mode === "laser"
                ? "bg-rose-500 text-white font-bold shadow-md shadow-rose-500/40"
                : isFiniteMode ? "text-zinc-600 hover:text-zinc-900 hover:bg-black/10" : "text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            {!isFiniteMode && <><span className="hidden sm:inline">Laser</span><span className="text-[9px] font-mono opacity-50">K</span></>}
          </button>
        </div>

        {/* ── Section Divider ── */}
        <div className={isFiniteMode ? "h-px w-6 bg-black/15 shrink-0 my-0.5" : "w-px h-6 bg-white/10 shrink-0 mx-0.5"} />

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
          <div className={`flex ${isFiniteMode ? "flex-col" : "flex-row"} items-center gap-2`}>
            {/* Color Swatches — dark inks in sheet mode, bright chalks in canvas mode */}
            <div className={`flex ${isFiniteMode ? "flex-col" : "flex-row"} items-center gap-1 ${isFiniteMode ? "bg-black/[0.04] p-1 rounded-xl border border-black/8" : "bg-white/[0.03] p-1 rounded-xl border border-white/5"}`}>
              {ACTIVE_PALETTE.map(({ value, label, glow }) => (
                <button
                  key={value}
                  title={label}
                  onClick={() => onColorChange(value)}
                  className={`
                    w-6 h-6 rounded-full transition-transform duration-150 relative
                    ${color === value ? `scale-110 ring-2 ${isFiniteMode ? "ring-zinc-800" : "ring-white"} ${glow}` : "opacity-80 hover:opacity-100 hover:scale-105"}
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
                  className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors cursor-pointer ${isFiniteMode ? "border-black/20 text-zinc-500 hover:text-zinc-900" : "border-white/20 text-zinc-400 hover:text-white"}`}
                  title="Custom Color Picker"
                >
                  <Palette className="w-3 h-3" />
                </div>
              </div>
            </div>

            {/* Tip Thickness */}
            <div className={`flex ${isFiniteMode ? "flex-col" : "flex-row"} items-center gap-0.5 ${isFiniteMode ? "bg-black/[0.04] p-1 rounded-xl border border-black/8" : "bg-white/[0.03] p-1 rounded-xl border border-white/5"}`}>
              {WIDTHS.map(({ value, label, size }) => (
                <button
                  key={value}
                  title={label}
                  onClick={() => onWidthChange(value)}
                  className={`
                    flex items-center justify-center w-6 h-6 rounded-lg transition-all duration-150
                    ${
                      strokeWidth === value
                        ? isFiniteMode ? "bg-black/20 text-zinc-900 ring-1 ring-black/30" : "bg-white/25 text-white ring-1 ring-white/40"
                        : isFiniteMode ? "text-zinc-500 hover:text-zinc-900 hover:bg-black/10" : "text-zinc-400 hover:text-white hover:bg-white/10"
                    }
                  `}
                >
                  <span
                    className={`block rounded-full transition-transform ${isFiniteMode ? "bg-zinc-800" : "bg-white"}`}
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

            {/* Font Style Toggle (when in Text Mode) */}
            {mode === "text" && onFontStyleChange && (
              <button
                onClick={() => onFontStyleChange(fontStyle === "handwriting" ? "normal" : "handwriting")}
                title="Toggle Font: Handwriting (Caveat) vs Sans (Inter)"
                className={`
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs border transition-all duration-150 active:scale-95
                  ${
                    fontStyle === "handwriting"
                      ? isFiniteMode
                        ? "bg-purple-500/15 text-purple-900 border-purple-400/40 font-bold"
                        : "bg-purple-500/25 text-purple-200 border-purple-400/40 font-bold"
                      : isFiniteMode
                        ? "bg-black/[0.04] text-zinc-700 border-black/10 hover:text-black"
                        : "bg-white/[0.05] text-zinc-300 border-white/5 hover:text-white"
                  }
                `}
              >
                <span style={{ fontFamily: fontStyle === "handwriting" ? "'Caveat', cursive" : "'Inter', sans-serif", fontSize: fontStyle === "handwriting" ? "14px" : "11px" }}>
                  {fontStyle === "handwriting" ? "✍️ Handwriting" : "🔤 Clean Sans"}
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
