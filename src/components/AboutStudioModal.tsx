import React from "react";
import {
  X,
  Atom,
  PenTool,
  Video,
  Presentation,
  ExternalLink,
  Keyboard,
  Cpu,
} from "lucide-react";
import type { Camera, TabletSettings } from "../types/whiteboard";

interface AboutStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenShortcuts?: () => void;
  camera: Camera;
  slideCount: number;
  strokesCount: number;
  tabletSettings: TabletSettings;
  isPenActive: boolean;
}

export const AboutStudioModal: React.FC<AboutStudioModalProps> = ({
  isOpen,
  onClose,
  onOpenShortcuts,
  camera,
  slideCount,
  strokesCount,
  tabletSettings,
  isPenActive,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl bg-zinc-950/95 border border-white/10 shadow-2xl shadow-cyan-950/40 text-white flex flex-col p-6 sm:p-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>

        {/* ── Brand Hero Header ── */}
        <div className="flex items-start gap-4 mb-6">
          <div className="relative w-14 h-14 shrink-0 rounded-2xl bg-gradient-to-br from-cyan-500 via-sky-500 to-indigo-600 p-0.5 shadow-xl shadow-cyan-500/20">
            <div className="w-full h-full rounded-[14px] bg-zinc-950/60 backdrop-blur-sm flex items-center justify-center">
              <svg viewBox="0 0 32 32" className="w-9 h-9" fill="none">
                <ellipse
                  cx="16"
                  cy="16"
                  rx="11"
                  ry="5.2"
                  transform="rotate(-28 16 16)"
                  stroke="#38bdf8"
                  strokeWidth="1.4"
                  strokeDasharray="3 1.5"
                  opacity="0.85"
                />
                <circle cx="24" cy="11.5" r="1.8" fill="#38bdf8" />
                <path d="M10 22 L13.5 12 L18.5 7 L21 9.5 L16 14.5 L14 18.5 Z" fill="#818cf8" />
                <path d="M9.5 22.5 L12 20 L10 18 Z" fill="#38bdf8" />
                <circle cx="14.5" cy="14.5" r="0.9" fill="#ffffff" />
              </svg>
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-2xl font-bold tracking-tight text-white font-sans">
                Scribe Studio
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-gradient-to-r from-cyan-500/20 to-indigo-500/20 text-cyan-300 border border-cyan-400/30">
                PRO • v2.4
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-white/5 text-zinc-400 border border-white/10">
                STEM Edition
              </span>
            </div>
            <p className="text-zinc-400 text-sm mt-1">
              High-Performance Interactive Whiteboard &amp; Live STEM Simulation Canvas
            </p>
          </div>
        </div>

        {/* ── Feature Pillars Grid ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 mb-6">
          {/* Pillar 1: Math-to-Life */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-cyan-500/30 transition-all flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-cyan-300 font-semibold text-sm">
              <Atom className="w-4 h-4 text-cyan-400" />
              <span>Math-to-Life Engine</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Circle any sketch or equation with Lasso (<kbd className="px-1 py-0.5 rounded bg-white/10 text-[10px] font-mono">L</kbd>) to spawn live 60 FPS interactive physics simulations (wave, pendulum, ramp, spring, orbit).
            </p>
          </div>

          {/* Pillar 2: 8192-Level Precision Inking */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-sky-500/30 transition-all flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-sky-300 font-semibold text-sm">
              <PenTool className="w-4 h-4 text-sky-400" />
              <span>8192 Pressure Inking</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Calibrated for Huion HS64, Wacom, and Apple Pencil. Includes draw-and-hold Smart Snap, nib thickness presets, and scribble-to-erase.
            </p>
          </div>

          {/* Pillar 3: Educator Superpowers */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-indigo-500/30 transition-all flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-indigo-300 font-semibold text-sm">
              <Video className="w-4 h-4 text-indigo-400" />
              <span>Live Educator Studio</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Educator camera PiP, live classroom poll stamper, STEM straightedge ruler, presentation reveal curtain, and focus spotlight beam.
            </p>
          </div>

          {/* Pillar 4: Lecture Decks & Export */}
          <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/[0.08] hover:border-emerald-500/30 transition-all flex flex-col gap-1.5">
            <div className="flex items-center gap-2 text-emerald-300 font-semibold text-sm">
              <Presentation className="w-4 h-4 text-emerald-400" />
              <span>Slide Decks &amp; PDF Notes</span>
            </div>
            <p className="text-xs text-zinc-400 leading-relaxed">
              Multi-slide presentation deck with instant PDF slides import, high-res PDF class notes export, and offline/cloud session backup.
            </p>
          </div>
        </div>

        {/* ── Real-Time Canvas & Hardware Telemetry ── */}
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/[0.06] mb-6 flex flex-wrap items-center justify-between gap-3 text-xs text-zinc-400 font-mono">
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span>Canvas Zoom: {Math.round(camera.zoom * 100)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>Deck: {slideCount} slide{slideCount > 1 ? "s" : ""}</span>
          </div>
          <div className="flex items-center gap-2">
            <span>Strokes: {strokesCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                isPenActive
                  ? "bg-cyan-500/20 text-cyan-300 border border-cyan-400/40"
                  : "bg-white/5 text-zinc-400"
              }`}
            >
              {isPenActive ? `Stylus Active (8192 • ${tabletSettings.pressureCurve})` : `Mouse / Touch (${tabletSettings.stabilizerLevel})`}
            </span>
          </div>
        </div>

        {/* ── Footer Actions ── */}
        <div className="flex items-center justify-between pt-4 border-t border-white/10 flex-wrap gap-3">
          <div className="flex items-center gap-2">
            {onOpenShortcuts && (
              <button
                onClick={() => {
                  onClose();
                  onOpenShortcuts();
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white border border-white/10 transition-all text-xs font-medium"
              >
                <Keyboard className="w-3.5 h-3.5" />
                <span>Keyboard Shortcuts (Alt+?)</span>
              </button>
            )}
            <a
              href="https://github.com/darkpanther5667/scribe-studio"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-1.5 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-colors text-xs font-medium"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>GitHub</span>
            </a>
          </div>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-sky-500/25 transition-all active:scale-95 cursor-pointer"
          >
            Start Teaching ✓
          </button>
        </div>
      </div>
    </div>
  );
};
