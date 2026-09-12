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
  BoardTheme,
  FavoritePen,
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
    label: "Standard Pen",
    preview: (
      <svg viewBox="0 0 32 12" className="w-8 h-3">
        <path d="M2 10 C6 8 10 4 16 6 C22 8 26 4 30 2" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    value: "gel",
    label: "Gel Pen (Pilot G2)",
    preview: (
      <svg viewBox="0 0 32 12" className="w-8 h-3">
        <path d="M2 10 C6 8 10 4 16 6 C22 8 26 4 30 2" stroke="currentColor" strokeWidth="2.8" fill="none" strokeLinecap="round"/>
        <path d="M2 10 C6 8 10 4 16 6" stroke="currentColor" strokeWidth="3.5" fill="none" strokeLinecap="round" opacity="0.4"/>
      </svg>
    ),
  },
  {
    value: "ballpoint",
    label: "Ballpoint (BIC)",
    preview: (
      <svg viewBox="0 0 32 12" className="w-8 h-3">
        <path d="M2 10 C6 8 10 4 16 6 C22 8 26 4 30 2" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round"/>
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
  theme?: BoardTheme;
  favoritePens?: FavoritePen[];
  activeFavoriteIndex?: number | null;
  onSelectFavoritePen?: (index: number) => void;
  onOpenColorPicker?: () => void;
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

/** Palette swatches for blueprint engineering mode */
const BLUEPRINT_PALETTE: { value: string; label: string; glow: string }[] = [
  { value: "#FFFFFF", label: "Drafting White", glow: "shadow-[0_0_12px_rgba(255,255,255,0.6)]" },
  { value: "#38BDF8", label: "Cyan Vector", glow: "shadow-[0_0_12px_rgba(56,189,248,0.6)]" },
  { value: "#FDE047", label: "Cadmium Gold", glow: "shadow-[0_0_12px_rgba(253,224,71,0.6)]" },
  { value: "#4ADE80", label: "Mint Rule", glow: "shadow-[0_0_12px_rgba(74,222,128,0.6)]" },
  { value: "#FB7185", label: "Coral Marker", glow: "shadow-[0_0_12px_rgba(251,113,133,0.6)]" },
  { value: "#FB923C", label: "Amber Spec", glow: "shadow-[0_0_12px_rgba(251,146,60,0.6)]" },
  { value: "#C084FC", label: "Orchid Dimension", glow: "shadow-[0_0_12px_rgba(192,132,252,0.6)]" },
];

/** 5 Precision Educator Nib Widths */
const WIDTHS: { value: StrokeWidth; label: string; size: number }[] = [
  { value: "ultrathin", label: "Ultra-Fine (1.5px)", size: STROKE_WIDTH_MAP.ultrathin },
  { value: "thin", label: "Fine Tip (3px)", size: STROKE_WIDTH_MAP.thin },
  { value: "medium", label: "Medium Tip (6px)", size: STROKE_WIDTH_MAP.medium },
  { value: "thick", label: "Broad Tip (10px)", size: STROKE_WIDTH_MAP.thick },
  { value: "broad", label: "Marker Tip (16px)", size: STROKE_WIDTH_MAP.broad },
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
  theme = "dark",
  favoritePens = [],
  activeFavoriteIndex = null,
  onSelectFavoritePen,
  onOpenColorPicker,
}) => {
  const [shapesOpen, setShapesOpen] = useState(false);
  const [penStyleOpen, setPenStyleOpen] = useState(false);

  // Pick the right color palette for active theme and canvas mode
  const ACTIVE_PALETTE =
    theme === "light"
      ? LIGHT_PALETTE
      : theme === "blueprint"
      ? BLUEPRINT_PALETTE
      : isFiniteMode
      ? LIGHT_PALETTE
      : DARK_PALETTE;

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
          1. BOTTOM-LEFT DOCK: Viewport Zoom (Infinite Canvas Mode only)
          ═══════════════════════════════════════════════════════════════════ */}
      {!isFiniteMode && (
        <div
          className="
            fixed bottom-5 left-5 z-30
            flex items-center gap-1 px-2 py-1
            rounded-2xl bg-zinc-950/85 backdrop-blur-2xl
            border border-white/10 shadow-[0_8px_24px_rgba(0,0,0,0.6)]
            select-none transition-all duration-200
          "
          onPointerDown={(e) => e.stopPropagation()}
        >
        {/* Zoom Out */}
        <button
          onClick={onZoomOut}
          title="Zoom Out (-)"
          aria-label="Zoom out"
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-90"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>

        {/* Clickable Zoom Percentage (Reset to 100%) */}
        <button
          onClick={onResetCamera}
          title="Reset Zoom to 100% & Center (Click)"
          className="
            px-1.5 py-0.5 rounded-lg font-mono text-[11px] font-semibold text-zinc-300
            hover:text-white hover:bg-white/10 transition-all duration-150 active:scale-95
          "
        >
          {zoomPercent}%
        </button>

        {/* Zoom In */}
        <button
          onClick={onZoomIn}
          title="Zoom In (+)"
          aria-label="Zoom in"
          className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-90"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>

        {/* Reset Viewport */}
        <button
          onClick={onResetCamera}
          title="Center Canvas (100%)"
          className="p-1 rounded-lg text-zinc-500 hover:text-white hover:bg-white/10 transition-all active:scale-90 ml-0.5"
        >
          <RotateCcw className="w-3 h-3" />
        </button>
      </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          2. PRIMARY DOCK: Inking, Tools & Active Styles
          – Always bottom-center horizontal island dock
          ═══════════════════════════════════════════════════════════════════ */}
      <div
        className="fixed bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-2.5 py-1.5 rounded-2xl bg-zinc-950/90 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-40 select-none transition-all duration-300 ease-out"
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* ── Cluster 1: History, Navigation & Selection ── */}
        <div className="flex flex-row items-center gap-0.5 bg-white/[0.03] p-0.5 rounded-xl border border-white/5">
          {/* Undo */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="Undo (Ctrl+Z)"
            aria-label="Undo last action"
            className={`p-1.5 rounded-lg transition-all duration-150 active:scale-90 ${
              canUndo
                ? "text-zinc-300 hover:text-white hover:bg-white/10"
                : "text-zinc-600 cursor-not-allowed"
            }`}
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          {/* Redo */}
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="Redo (Ctrl+Y)"
            aria-label="Redo action"
            className={`p-1.5 rounded-lg transition-all duration-150 active:scale-90 ${
              canRedo
                ? "text-zinc-300 hover:text-white hover:bg-white/10"
                : "text-zinc-600 cursor-not-allowed"
            }`}
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-3.5 bg-white/10 mx-0.5" />

          {/* Pan — hidden in finite mode */}
          {!isFiniteMode && (
            <button
              onClick={() => { onModeChange("pan"); setShapesOpen(false); }}
              title="Pan Blackboard (H) — or hold Spacebar"
              className={`p-1.5 rounded-lg transition-all duration-150 ${
                mode === "pan" ? "bg-white text-zinc-950 font-semibold shadow-md shadow-white/20" : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              <Hand className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Lasso Selection */}
          <button
            onClick={() => { onModeChange("lasso"); setShapesOpen(false); }}
            title="Lasso Selection (S)"
            className={`p-1.5 rounded-lg transition-all duration-150 ${
              mode === "lasso"
                ? "bg-cyan-400 text-zinc-950 font-bold shadow-md shadow-cyan-400/30"
                : "text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <LassoSelect className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Cluster 2: Drawing & Inking ── */}
        <div className="flex flex-row items-center gap-0.5 bg-white/[0.03] p-0.5 rounded-xl border border-white/5">
          {/* Pen */}
          <button
            onClick={() => { onModeChange("draw"); setShapesOpen(false); }}
            title="Pen (P)"
            className={`p-1.5 rounded-lg transition-all duration-150 ${
              mode === "draw"
                ? "bg-white text-zinc-950 font-semibold shadow-md shadow-white/20"
                : "text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <PenLine className="w-3.5 h-3.5" />
          </button>

          {/* ── Pen Style Picker (only when Pen is active) ── */}
          {mode === "draw" && onPenStyleChange && (
            <div className="relative">
              <button
                onClick={() => setPenStyleOpen((p) => !p)}
                title={`Brush style: ${PEN_STYLES.find(s => s.value === penStyle)?.label ?? penStyle}`}
                className={`flex items-center gap-0.5 px-1.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 text-zinc-300 hover:text-white hover:bg-white/10 border border-white/10 ${penStyleOpen ? "bg-white/10" : ""}`}
              >
                <span className="w-6 h-3 flex items-center opacity-80">
                  {PEN_STYLES.find(s => s.value === penStyle)?.preview}
                </span>
                <span className="text-[8px] opacity-50">▾</span>
              </button>

              {/* Style dropdown */}
              {penStyleOpen && (
                <div className="
                  absolute z-50 bottom-full mb-2 left-0
                  flex flex-col gap-0.5 p-1.5 min-w-[175px]
                  rounded-2xl bg-zinc-950/96 backdrop-blur-2xl
                  border border-white/15 shadow-2xl shadow-black/80
                  animate-in fade-in slide-in-from-bottom-2 duration-150
                ">
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
            className={`p-1.5 rounded-lg transition-all duration-150 ${
              mode === "highlighter"
                ? "bg-yellow-400 text-zinc-950 font-bold shadow-md shadow-yellow-400/30"
                : "text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>

          {/* Eraser */}
          <button
            onClick={() => { onModeChange("erase"); setShapesOpen(false); }}
            title="Eraser (E)"
            className={`p-1.5 rounded-lg transition-all duration-150 ${
              mode === "erase"
                ? "bg-white text-zinc-950 font-semibold shadow-md shadow-white/20"
                : "text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          {/* Favorite Pens Quick Slots (1, 2, 3) */}
          {favoritePens.length > 0 && onSelectFavoritePen && (
            <>
              <div className="w-px h-3.5 bg-white/10 mx-0.5" />
              {favoritePens.slice(0, 3).map((pen, idx) => {
                const isFavActive = activeFavoriteIndex === idx;
                return (
                  <button
                    key={pen.id || idx}
                    onClick={() => onSelectFavoritePen(idx)}
                    title={`Favorite ${idx + 1}: ${pen.name} (Press ${idx + 1})`}
                    className={`
                      w-5 h-5 rounded-lg transition-all relative flex items-center justify-center shrink-0
                      ${
                        isFavActive
                          ? "ring-2 ring-white scale-110 shadow-md"
                          : "opacity-75 hover:opacity-100 hover:scale-105"
                      }
                    `}
                    style={{ backgroundColor: pen.color }}
                  >
                    <span className="text-[8px] font-mono font-bold text-zinc-950 bg-white/80 px-0.5 rounded leading-none shadow-sm">
                      {idx + 1}
                    </span>
                  </button>
                );
              })}
            </>
          )}
        </div>

        {/* ── Cluster 3: Geometric Shapes & Objects ── */}
        <div className="flex flex-row items-center gap-0.5 bg-white/[0.03] p-0.5 rounded-xl border border-white/5">
          {/* Shapes Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShapesOpen((prev) => !prev)}
              title="Geometric Shapes (L, A, R, C, Y)"
              className={`flex items-center gap-0.5 p-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                isShapeActive
                  ? "bg-sky-500 text-white font-semibold shadow-md shadow-sky-500/30"
                  : "text-zinc-400 hover:text-white hover:bg-white/10"
              }`}
            >
              {getActiveShapeIcon()}
              <span className="text-[8px] opacity-50">▾</span>
            </button>

            {/* Shapes Floating Menu */}
            {shapesOpen && (
              <div className="
                absolute bottom-full mb-2.5 left-0
                flex flex-col gap-1 p-1.5 min-w-[170px]
                rounded-2xl bg-zinc-950/95 backdrop-blur-2xl
                border border-white/15 shadow-2xl shadow-black/80
                z-50 animate-in fade-in slide-in-from-bottom-2 duration-150
              ">
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
            className={`p-1.5 rounded-lg transition-all duration-150 ${
              mode === "text"
                ? "bg-purple-500 text-white font-bold shadow-md shadow-purple-500/30"
                : "text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Type className="w-3.5 h-3.5" />
          </button>

          {/* Math & LaTeX Formula */}
          <button
            onClick={() => { onModeChange("math"); setShapesOpen(false); }}
            title="Math & LaTeX Formula (M)"
            className={`p-1.5 rounded-lg transition-all duration-150 ${
              mode === "math"
                ? "bg-cyan-400 text-zinc-950 font-bold shadow-md shadow-cyan-400/30"
                : "text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <span className="font-serif italic font-bold text-xs leading-none">√x</span>
          </button>

          {/* Sticky Note */}
          <button
            onClick={() => { onModeChange("note"); setShapesOpen(false); }}
            title="Sticky Note (N)"
            className={`p-1.5 rounded-lg transition-all duration-150 ${
              mode === "note"
                ? "bg-amber-400 text-zinc-950 font-bold shadow-md shadow-amber-400/30"
                : "text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <StickyNote className="w-3.5 h-3.5" />
          </button>

          {/* Laser Pointer */}
          <button
            onClick={() => { onModeChange("laser"); setShapesOpen(false); }}
            title="Laser Pointer (K)"
            className={`p-1.5 rounded-lg transition-all duration-150 ${
              mode === "laser"
                ? "bg-rose-500 text-white font-bold shadow-md shadow-rose-500/40"
                : "text-zinc-400 hover:text-white hover:bg-white/10"
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Section Divider ── */}
        <div className="w-px h-5 bg-white/10 shrink-0 mx-0.5" />

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
                  flex items-center justify-center w-6 h-6 rounded-lg transition-all duration-150
                  ${
                    strokeWidth === value
                      ? "bg-white/20 text-white ring-1 ring-white/30"
                      : "text-zinc-400 hover:text-white hover:bg-white/10"
                  }
                `}
              >
                <span
                  className="rounded-full bg-zinc-300 border border-white/40"
                  style={{ width: size * 1.4, height: size * 1.4 }}
                />
              </button>
            ))}
          </div>
        ) : mode === "text" ? (
          /* Text Styling (Font & Colors) */
          <div className="flex flex-row items-center gap-1.5">
            {/* Font Style Toggle */}
            {onFontStyleChange && (
              <button
                onClick={() => onFontStyleChange(fontStyle === "handwriting" ? "normal" : "handwriting")}
                title="Toggle Font: Handwriting (Caveat) vs Sans (Inter)"
                className={`
                  flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs border transition-all duration-150 active:scale-95
                  ${
                    fontStyle === "handwriting"
                      ? "bg-purple-500/25 text-purple-200 border-purple-400/40 font-bold"
                      : "bg-white/[0.05] text-zinc-300 border-white/5 hover:text-white"
                  }
                `}
              >
                <span style={{ fontFamily: fontStyle === "handwriting" ? "'Caveat', cursive" : "'Inter', sans-serif", fontSize: fontStyle === "handwriting" ? "13px" : "11px" }}>
                  {fontStyle === "handwriting" ? "✍️ Caveat" : "🔤 Inter"}
                </span>
              </button>
            )}

            {/* Quick Colors */}
            <div className="flex flex-row items-center gap-1 bg-white/[0.03] p-0.5 rounded-xl border border-white/5">
              {ACTIVE_PALETTE.slice(0, 5).map(({ value, label, glow }) => (
                <button
                  key={value}
                  title={label}
                  onClick={() => onColorChange(value)}
                  className={`
                    w-5 h-5 rounded-full transition-transform duration-150 relative
                    ${color === value ? `scale-110 ring-2 ring-white ${glow}` : "opacity-80 hover:opacity-100 hover:scale-105"}
                  `}
                  style={{ backgroundColor: value }}
                />
              ))}
              {onOpenColorPicker && (
                <button
                  type="button"
                  onClick={onOpenColorPicker}
                  className="w-5 h-5 rounded-full border flex items-center justify-center transition-all hover:scale-110 active:scale-95 border-white/20 text-zinc-300 hover:text-white bg-white/[0.05]"
                  title="Open Color Studio"
                >
                  <Palette className="w-2.5 h-2.5 text-sky-400" />
                </button>
              )}
            </div>
          </div>
        ) : (
          /* Inking / Shapes Colors, Tips, and Stroke Styles */
          <div className="flex flex-row items-center gap-1.5">
            {/* Color Swatches */}
            <div className="flex flex-row items-center gap-1 bg-white/[0.03] p-0.5 rounded-xl border border-white/5">
              {ACTIVE_PALETTE.map(({ value, label, glow }) => (
                <button
                  key={value}
                  title={label}
                  onClick={() => onColorChange(value)}
                  className={`
                    w-5 h-5 rounded-full transition-transform duration-150 relative
                    ${color === value ? `scale-110 ring-2 ring-white ${glow}` : "opacity-80 hover:opacity-100 hover:scale-105"}
                  `}
                  style={{ backgroundColor: value }}
                />
              ))}

              {/* Custom Educator Color Studio Trigger */}
              <button
                type="button"
                onClick={() => {
                  if (onOpenColorPicker) onOpenColorPicker();
                }}
                className="w-5 h-5 rounded-full border flex items-center justify-center transition-all cursor-pointer hover:scale-110 active:scale-95 border-white/20 text-zinc-300 hover:text-white bg-white/[0.05]"
                title="Open Educator Color Studio (Palettes, Eyedropper & Recents)"
              >
                <Palette className="w-2.5 h-2.5 text-sky-400" />
              </button>
            </div>

            {/* Tip Thickness */}
            <div className="flex flex-row items-center gap-0.5 bg-white/[0.03] p-1 rounded-xl border border-white/5">
              {WIDTHS.map(({ value, label, size }) => (
                <button
                  key={value}
                  title={label}
                  onClick={() => onWidthChange(value)}
                  className={`
                    flex items-center justify-center w-5 h-5 rounded-lg transition-all duration-150
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

            {/* Stroke Modifiers (Line Style, Smart Snap, Shape Fill) */}
            <div className="flex items-center gap-0.5 bg-white/[0.03] p-0.5 rounded-xl border border-white/5">
              {/* Line Style Toggle */}
              {(isShapeActive || mode === "draw") && (
                <button
                  onClick={cycleLineStyle}
                  title={`Line Style: ${lineStyle} (Click to cycle Solid, Dashed, Dotted)`}
                  className={`
                    p-1.5 rounded-lg text-zinc-300 hover:text-white hover:bg-white/10 transition-all duration-150 active:scale-90
                    ${lineStyle !== "solid" ? "bg-white/15 text-white shadow-sm" : ""}
                  `}
                >
                  {lineStyle === "solid" && (
                    <svg className="w-5 h-2.5" viewBox="0 0 20 10">
                      <line x1="2" y1="5" x2="18" y2="5" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                  )}
                  {lineStyle === "dashed" && (
                    <svg className="w-5 h-2.5" viewBox="0 0 20 10">
                      <line x1="2" y1="5" x2="18" y2="5" stroke="currentColor" strokeWidth="2.5" strokeDasharray="4, 2.5" strokeLinecap="round" />
                    </svg>
                  )}
                  {lineStyle === "dotted" && (
                    <svg className="w-5 h-2.5" viewBox="0 0 20 10">
                      <line x1="2" y1="5" x2="18" y2="5" stroke="currentColor" strokeWidth="2.5" strokeDasharray="1, 3" strokeLinecap="round" />
                    </svg>
                  )}
                </button>
              )}

              {/* Smart Snap Auto-Shape Toggle */}
              {mode === "draw" && onToggleSmartSnap && (
                <button
                  onClick={onToggleSmartSnap}
                  title={`Click to turn Smart Shape Snap ${smartSnapEnabled ? "OFF" : "ON"} (Alt+S)`}
                  className={`
                    flex items-center gap-1.5 px-2 py-1 rounded-xl text-xs font-semibold transition-all duration-150 active:scale-90 cursor-pointer
                    ${
                      smartSnapEnabled
                        ? "bg-amber-400/20 text-amber-300 border border-amber-400/40 shadow-sm shadow-amber-400/20"
                        : "bg-white/5 text-zinc-400 hover:text-white hover:bg-white/10 border border-white/10"
                    }
                  `}
                >
                  <Sparkles className={`w-3.5 h-3.5 ${smartSnapEnabled ? "text-amber-300 animate-pulse" : "text-zinc-500"}`} />
                  <span className="text-[11px] font-medium tracking-tight">
                    {smartSnapEnabled ? "Snap ON" : "Snap OFF"}
                  </span>
                </button>
              )}

              {/* Shape Fill Toggle (when shape active) */}
              {isShapeActive && (
                <button
                  onClick={() => onFillStyleChange(fillStyle === "none" ? "semi" : "none")}
                  title={`Shape Fill: ${fillStyle === "semi" ? "Tinted Fill" : "Outline"}`}
                  className={`
                    p-1.5 rounded-lg transition-all duration-150 active:scale-90
                    ${
                      fillStyle === "semi"
                        ? "bg-sky-500/25 text-sky-200 border border-sky-400/40"
                        : "text-zinc-400 hover:text-white hover:bg-white/10"
                    }
                  `}
                >
                  <Square className={`w-3.5 h-3.5 ${fillStyle === "semi" ? "fill-sky-400/50" : ""}`} />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
};
