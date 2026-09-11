import React, { useState, useRef, useEffect } from "react";
import {
  X,
  PenTool,
  RotateCcw,
  Shield,
  Check,
  Zap,
} from "lucide-react";
import type { TabletSettings, PressureCurve, PalmRejectionMode, BarrelButtonAction } from "../types/whiteboard";
import {
  DEFAULT_TABLET_SETTINGS,
  TABLET_PROFILES,
  calibratePressure,
} from "../utils/tabletPressure";

interface PenTabletModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: TabletSettings;
  onSettingsChange: (settings: TabletSettings) => void;
}

export const PenTabletModal: React.FC<PenTabletModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSettingsChange,
}) => {
  const [localSettings, setLocalSettings] = useState<TabletSettings>(settings);
  const [liveRawPressure, setLiveRawPressure] = useState<number>(0);
  const [liveCalibratedPressure, setLiveCalibratedPressure] = useState<number>(0);
  const [detectedPointerType, setDetectedPointerType] = useState<string>("none");
  const testCanvasRef = useRef<HTMLCanvasElement>(null);
  const isTestDrawingRef = useRef(false);
  const lastTestPointRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  // Clear test canvas
  const handleClearTestPad = () => {
    const canvas = testCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  useEffect(() => {
    if (isOpen) {
      setTimeout(handleClearTestPad, 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Test pad drawing events
  const onTestPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = testCanvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    isTestDrawingRef.current = true;
    setDetectedPointerType(e.pointerType);

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lastTestPointRef.current = { x, y };

    const rawP = e.pressure || 0.5;
    const calP = calibratePressure(
      rawP,
      e.pointerType,
      localSettings.pressureCurve,
      localSettings.minPressureThreshold
    );
    setLiveRawPressure(rawP);
    setLiveCalibratedPressure(calP);
  };

  const onTestPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    setDetectedPointerType(e.pointerType);
    const rawP = e.pressure || (e.pointerType === "pen" ? 0 : 0.5);
    const calP = calibratePressure(
      rawP,
      e.pointerType,
      localSettings.pressureCurve,
      localSettings.minPressureThreshold
    );
    setLiveRawPressure(rawP);
    setLiveCalibratedPressure(calP);

    if (!isTestDrawingRef.current) return;
    const canvas = testCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (lastTestPointRef.current) {
      ctx.beginPath();
      ctx.moveTo(lastTestPointRef.current.x, lastTestPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = Math.max(1.5, calP * 14);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
    }
    lastTestPointRef.current = { x, y };
  };

  const onTestPointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isTestDrawingRef.current = false;
    lastTestPointRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {}
  };

  const updateSetting = <K extends keyof TabletSettings>(
    key: K,
    value: TabletSettings[K]
  ) => {
    const next = { ...localSettings, [key]: value };
    setLocalSettings(next);
    onSettingsChange(next);
  };

  const applyProfile = (profileId: string) => {
    const prof = TABLET_PROFILES.find((p) => p.id === profileId);
    if (!prof) return;
    const next = { ...localSettings, ...prof.settings };
    setLocalSettings(next);
    onSettingsChange(next);
  };

  const pressurePercent = Math.round(liveCalibratedPressure * 100);
  const discreteLevels = Math.round(liveCalibratedPressure * 8192);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
      onPointerDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="
          w-full max-w-2xl bg-zinc-950 border border-white/15 rounded-3xl shadow-2xl
          flex flex-col max-h-[92vh] overflow-hidden select-none text-zinc-200
          animate-in zoom-in-95 duration-150
        "
        onPointerDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-white/[0.02]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <PenTool className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Stylus & Pen Tablet Calibration
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  8192 Levels
                </span>
              </h2>
              <p className="text-xs text-zinc-400">
                Calibrate pressure curves, palm rejection, and hardware barrel buttons
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* 1. Live Interactive Scratchpad & Real-Time Pressure Gauge */}
          <div className="rounded-2xl bg-zinc-900/90 border border-white/10 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                  Live Pressure & Handwriting Test Pad
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-zinc-400">
                  Input:{" "}
                  <span className="text-cyan-300 font-semibold uppercase">
                    {detectedPointerType}
                  </span>
                </span>
                <button
                  onClick={handleClearTestPad}
                  className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 text-xs flex items-center gap-1 transition-colors"
                  title="Clear test pad"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span className="text-[11px]">Clear</span>
                </button>
              </div>
            </div>

            {/* Test Canvas */}
            <div className="relative rounded-xl border border-white/10 bg-black/60 overflow-hidden h-28 touch-none">
              <canvas
                ref={testCanvasRef}
                width={600}
                height={112}
                onPointerDown={onTestPointerDown}
                onPointerMove={onTestPointerMove}
                onPointerUp={onTestPointerUp}
                className="w-full h-full cursor-crosshair"
              />
              {liveRawPressure === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-zinc-600 text-xs">
                  Press your stylus here to test pressure & stroke flow...
                </div>
              )}
            </div>

            {/* Real-time Meter Bar */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-zinc-400">
                  Live Pressure:{" "}
                  <span className="text-white font-bold">{discreteLevels}</span> / 8192
                </span>
                <span className="text-cyan-400 font-semibold">{pressurePercent}%</span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-zinc-800 overflow-hidden border border-white/5">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-emerald-400 transition-all duration-75"
                  style={{ width: `${pressurePercent}%` }}
                />
              </div>
            </div>
          </div>

          {/* 2. Tablet Brand 1-Click Profiles */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
              1-Click Tablet Brand Presets
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TABLET_PROFILES.map((prof) => (
                <button
                  key={prof.id}
                  onClick={() => applyProfile(prof.id)}
                  className="
                    p-2.5 rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.08]
                    hover:border-cyan-400/40 text-left transition-all active:scale-95 group
                  "
                >
                  <div className="font-semibold text-xs text-white group-hover:text-cyan-300 transition-colors">
                    {prof.name}
                  </div>
                  <div className="text-[10px] text-zinc-400 leading-tight mt-1 line-clamp-2">
                    {prof.description}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Huion HS64 & Express Keys Guide Banner */}
          <div className="p-3.5 rounded-xl bg-cyan-950/40 border border-cyan-500/25 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-cyan-300">
                <Zap className="w-3.5 h-3.5 text-cyan-400" />
                <span>Huion HS64 & PW100 Optimal Setup</span>
              </div>
              <span className="text-[10px] text-cyan-400/70 font-mono">6.3&quot; × 4&quot; • 8192 Levels</span>
            </div>
            <p className="text-[11px] text-zinc-300 leading-relaxed">
              In your <span className="text-white font-semibold">Huion Tablet App</span>, make sure <span className="text-emerald-400 font-semibold underline underline-offset-2">&quot;Enable Windows Ink&quot;</span> is checked so browser pressure sensitivity is unlocked.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
              <div className="bg-black/30 border border-cyan-500/20 rounded-lg p-1.5 text-center">
                <div className="text-[9px] text-cyan-300/70 uppercase tracking-wide">Key 1 (Top)</div>
                <div className="text-[11px] font-mono font-bold text-white">Ctrl + Z (Undo)</div>
              </div>
              <div className="bg-black/30 border border-cyan-500/20 rounded-lg p-1.5 text-center">
                <div className="text-[9px] text-cyan-300/70 uppercase tracking-wide">Key 2</div>
                <div className="text-[11px] font-mono font-bold text-white">P (Pen Nib)</div>
              </div>
              <div className="bg-black/30 border border-cyan-500/20 rounded-lg p-1.5 text-center">
                <div className="text-[9px] text-cyan-300/70 uppercase tracking-wide">Key 3</div>
                <div className="text-[11px] font-mono font-bold text-white">E (Eraser)</div>
              </div>
              <div className="bg-black/30 border border-cyan-500/20 rounded-lg p-1.5 text-center">
                <div className="text-[9px] text-cyan-300/70 uppercase tracking-wide">Key 4 (Bottom)</div>
                <div className="text-[11px] font-mono font-bold text-white">Alt + S (Snap)</div>
              </div>
            </div>
            <div className="text-[10px] text-zinc-400 flex items-center gap-1">
              <span className="text-cyan-400 font-semibold">PW100 Pen Rocker:</span> Lower button set to Right-Click in Huion App triggers instant Hold-to-Erase in Scribe Studio!
            </div>
          </div>

          {/* 3. Pressure Curve Selection */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Pressure Sensitivity Curve
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">Hand Effort Mapping</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  value: "soft",
                  label: "🪶 Soft",
                  desc: "Effortless ink with light touch (zero hand fatigue)",
                },
                {
                  value: "medium",
                  label: "⚖️ Medium",
                  desc: "Balanced natural fountain pen flow (recommended)",
                },
                {
                  value: "firm",
                  label: "🦾 Firm",
                  desc: "Requires deliberate pressure for thick lines",
                },
                {
                  value: "off",
                  label: "📏 Constant",
                  desc: "Uniform dry-erase line (ignores pressure)",
                },
              ].map((c) => (
                <button
                  key={c.value}
                  onClick={() => updateSetting("pressureCurve", c.value as PressureCurve)}
                  className={`
                    p-2.5 rounded-xl border text-left transition-all
                    ${
                      localSettings.pressureCurve === c.value
                        ? "bg-cyan-500/20 border-cyan-400/60 text-white shadow-sm"
                        : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                    }
                  `}
                >
                  <div className="font-semibold text-xs">{c.label}</div>
                  <div className="text-[10px] text-zinc-400 mt-1 leading-snug">{c.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 4. Palm Rejection Guard */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                  Palm Rejection Guard
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-mono">Screen Tablet Protection</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  value: "strict",
                  label: "🛡️ Strict (Pen-Only)",
                  desc: "Palms & resting fingers are 100% ignored. 2-finger pinch/zoom still works.",
                },
                {
                  value: "standard",
                  label: "✌️ Standard",
                  desc: "Rejects touch inputs while stylus is actively touching screen.",
                },
                {
                  value: "off",
                  label: "🖐️ Off (Capacitive)",
                  desc: "Allows drawing with both stylus and fingers simultaneously.",
                },
              ].map((m) => (
                <button
                  key={m.value}
                  onClick={() => updateSetting("palmRejection", m.value as PalmRejectionMode)}
                  className={`
                    p-2.5 rounded-xl border text-left transition-all
                    ${
                      localSettings.palmRejection === m.value
                        ? "bg-emerald-500/20 border-emerald-400/60 text-white shadow-sm"
                        : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                    }
                  `}
                >
                  <div className="font-semibold text-xs">{m.label}</div>
                  <div className="text-[10px] text-zinc-400 mt-1 leading-snug">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 5. Stylus Hardware Barrel Button Action */}
          <div className="space-y-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
              Stylus Side Rocker / Barrel Button
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  value: "erase",
                  label: "🧹 Quick Eraser",
                  desc: "Holding the side barrel button erases strokes instantly.",
                },
                {
                  value: "lasso",
                  label: "⭕ Lasso Selection",
                  desc: "Holding barrel button lassos diagram equations.",
                },
                {
                  value: "pan",
                  label: "✋ Pan Blackboard",
                  desc: "Holding barrel button drags the canvas smoothly.",
                },
              ].map((b) => (
                <button
                  key={b.value}
                  onClick={() => updateSetting("barrelButtonAction", b.value as BarrelButtonAction)}
                  className={`
                    p-2.5 rounded-xl border text-left transition-all
                    ${
                      localSettings.barrelButtonAction === b.value
                        ? "bg-purple-500/20 border-purple-400/60 text-white shadow-sm"
                        : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                    }
                  `}
                >
                  <div className="font-semibold text-xs">{b.label}</div>
                  <div className="text-[10px] text-zinc-400 mt-1 leading-snug">{b.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* 6. Precision Hover Cursor */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10">
            <div>
              <div className="font-semibold text-xs text-white">Show Stylus Hover Ring Indicator</div>
              <div className="text-[10px] text-zinc-400">
                Displays exact nib thickness and color circle while stylus hovers above tablet
              </div>
            </div>
            <button
              onClick={() => updateSetting("showHoverCursor", !localSettings.showHoverCursor)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors
                ${
                  localSettings.showHoverCursor
                    ? "bg-cyan-500/25 text-cyan-300 border border-cyan-400/40"
                    : "bg-white/10 text-zinc-400"
                }
              `}
            >
              {localSettings.showHoverCursor ? "Enabled" : "Disabled"}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-white/10 bg-white/[0.02]">
          <button
            onClick={() => {
              setLocalSettings({ ...DEFAULT_TABLET_SETTINGS });
              onSettingsChange({ ...DEFAULT_TABLET_SETTINGS });
            }}
            className="text-xs text-zinc-400 hover:text-white transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={onClose}
            className="
              flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold
              bg-gradient-to-r from-cyan-500 to-sky-500 text-white hover:opacity-90
              shadow-lg shadow-cyan-500/25 transition-all active:scale-95
            "
          >
            <Check className="w-4 h-4" />
            <span>Apply & Close</span>
          </button>
        </div>
      </div>
    </div>
  );
};
