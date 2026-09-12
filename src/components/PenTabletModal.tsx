import React, { useState, useRef, useEffect } from "react";
import {
  X,
  PenTool,
  RotateCcw,
  Shield,
  Check,
  Zap,
} from "lucide-react";
import type { TabletSettings, PressureCurve, PalmRejectionMode, BarrelButtonAction, StabilizerLevel } from "../types/whiteboard";
import {
  DEFAULT_TABLET_SETTINGS,
  TABLET_PROFILES,
  calibratePressure,
  getStylusTilt,
  getStylusPressedButton,
  type StylusTiltData,
  type StylusButtonIdentifier,
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
  const [liveTiltData, setLiveTiltData] = useState<StylusTiltData>({
    tiltX: 0,
    tiltY: 0,
    tiltAngle: 0,
    azimuthDeg: 0,
  });
  const [livePressedBtn, setLivePressedBtn] = useState<StylusButtonIdentifier>(null);

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
    setLiveTiltData(getStylusTilt(e));
    setLivePressedBtn(getStylusPressedButton(e));

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
    setLiveTiltData(getStylusTilt(e));
    setLivePressedBtn(getStylusPressedButton(e));

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
    setLivePressedBtn(null);
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

            {/* Real-time Hardware Telemetry */}
            <div className="space-y-2 pt-1">
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

              {/* Live Tilt & Button Hardware Telemetry Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 font-mono text-[11px]">
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 flex flex-col gap-0.5">
                  <span className="text-zinc-500 text-[10px] uppercase">Pen Tilt (±60°)</span>
                  <span className="text-white font-bold">
                    {liveTiltData.tiltAngle > 0 ? `${liveTiltData.tiltAngle}°` : "0° (Upright)"}
                  </span>
                  <span className="text-zinc-500 text-[9px]">X: {liveTiltData.tiltX}° | Y: {liveTiltData.tiltY}°</span>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 flex flex-col gap-0.5">
                  <span className="text-zinc-500 text-[10px] uppercase">Lower Rocker (Btn 1)</span>
                  <span className={livePressedBtn === "button1" ? "text-emerald-400 font-bold" : "text-zinc-400"}>
                    {livePressedBtn === "button1" ? "● Pressed (Active)" : "Idle"}
                  </span>
                  <span className="text-zinc-500 text-[9px]">Action: {localSettings.barrelButtonAction}</span>
                </div>
                <div className="p-2 rounded-lg bg-white/[0.03] border border-white/5 flex flex-col gap-0.5">
                  <span className="text-zinc-500 text-[10px] uppercase">Upper Rocker (Btn 2)</span>
                  <span className={livePressedBtn === "button2" ? "text-cyan-400 font-bold" : "text-zinc-400"}>
                    {livePressedBtn === "button2" ? "● Pressed (Active)" : "Idle"}
                  </span>
                  <span className="text-zinc-500 text-[9px]">Action: {localSettings.barrelButton2Action ?? "lasso"}</span>
                </div>
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
          <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/60 to-blue-950/40 border border-cyan-500/30 flex flex-col gap-3 shadow-lg shadow-cyan-950/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
                <Zap className="w-4 h-4 text-cyan-400" />
                <span>Huion HS64 & PW100 Master Command Center</span>
              </div>
              <span className="text-[10px] text-cyan-400/80 font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20">
                6.3&quot; × 4&quot; • 8192 Levels • ±60° Tilt
              </span>
            </div>

            <p className="text-[11px] text-zinc-300 leading-relaxed">
              Tuned for the <strong className="text-white">Huion HS64</strong> and battery-free <strong className="text-white">PW100 stylus</strong>. Follow these quick driver tips to unlock hardware-grade performance:
            </p>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="bg-black/40 border border-cyan-500/20 rounded-xl p-2 text-center">
                <div className="text-[9px] text-cyan-300/70 uppercase tracking-wide">Key 1 (Top)</div>
                <div className="text-xs font-mono font-bold text-white mt-0.5">Ctrl + Z</div>
                <div className="text-[9px] text-zinc-400 mt-0.5">Undo Stroke</div>
              </div>
              <div className="bg-black/40 border border-cyan-500/20 rounded-xl p-2 text-center">
                <div className="text-[9px] text-cyan-300/70 uppercase tracking-wide">Key 2</div>
                <div className="text-xs font-mono font-bold text-white mt-0.5">P</div>
                <div className="text-[9px] text-zinc-400 mt-0.5">Pen Nib Tool</div>
              </div>
              <div className="bg-black/40 border border-cyan-500/20 rounded-xl p-2 text-center">
                <div className="text-[9px] text-cyan-300/70 uppercase tracking-wide">Key 3</div>
                <div className="text-xs font-mono font-bold text-white mt-0.5">E</div>
                <div className="text-[9px] text-zinc-400 mt-0.5">Eraser Tool</div>
              </div>
              <div className="bg-black/40 border border-cyan-500/20 rounded-xl p-2 text-center">
                <div className="text-[9px] text-cyan-300/70 uppercase tracking-wide">Key 4 (Bottom)</div>
                <div className="text-xs font-mono font-bold text-white mt-0.5">Alt + S</div>
                <div className="text-[9px] text-zinc-400 mt-0.5">Smart Snap</div>
              </div>
            </div>

            <div className="p-2.5 rounded-lg bg-black/30 border border-white/5 space-y-1 text-[11px] text-zinc-300">
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">1.</span>
                <span>In <strong className="text-white">Huion Tablet App</strong>: Ensure <strong className="text-emerald-400">&quot;Enable Windows Ink&quot;</strong> is checked so Chrome/Edge receives pressure and tilt events.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">2.</span>
                <span>In <strong className="text-white">Working Area</strong>: Set to <strong className="text-cyan-400">&quot;Screen Ratio&quot;</strong> to match your 16:9 monitor and prevent stretched aspect ratios.</span>
              </div>
              <div className="flex items-start gap-1.5">
                <span className="text-emerald-400 font-bold">3.</span>
                <span>In <strong className="text-white">Digital Pen</strong>: Set Lower Button to <strong className="text-purple-300">Right Click</strong> (Erase) and Upper Button to <strong className="text-cyan-300">Middle Click</strong> (Lasso).</span>
              </div>
            </div>

            <button
              onClick={() => applyProfile("huion-hs64")}
              className="
                w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500
                hover:from-cyan-400 hover:to-blue-400 text-zinc-950 font-bold text-xs
                flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 active:scale-98 transition-all cursor-pointer
              "
            >
              <Zap className="w-4 h-4 fill-zinc-950" />
              <span>⚡ 1-Click Optimize Scribe for Huion HS64 & PW100</span>
            </button>
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

          {/* 3.5. Intelligent Curve Stabilizer & Micro-Jitter Filter */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Handwriting Stabilizer & Anti-Wobble
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">Catmull-Rom Splines</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                {
                  value: "smooth",
                  label: "✨ Studio Smooth",
                  desc: "Goodnotes-style natural handwriting flow with tremor elimination (Recommended).",
                },
                {
                  value: "calligraphy",
                  label: "🖋️ Calligraphy Flow",
                  desc: "Silky chordal spline curves for confident, museum-grade blackboard formulas.",
                },
                {
                  value: "off",
                  label: "🎯 Raw (1:1 Sketch)",
                  desc: "Direct tablet digitizer points without spline interpolation.",
                },
              ].map((s) => (
                <button
                  key={s.value}
                  onClick={() => updateSetting("stabilizerLevel", s.value as StabilizerLevel)}
                  className={`
                    p-2.5 rounded-xl border text-left transition-all
                    ${
                      (localSettings.stabilizerLevel ?? "smooth") === s.value
                        ? "bg-cyan-500/20 border-cyan-400/60 text-white shadow-sm"
                        : "bg-white/[0.03] border-white/10 text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                    }
                  `}
                >
                  <div className="font-semibold text-xs">{s.label}</div>
                  <div className="text-[10px] text-zinc-400 mt-1 leading-snug">{s.desc}</div>
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

          {/* 5A. Stylus Hardware Button 1 (Lower Rocker) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Stylus Rocker Button 1 (Lower Button / Right-Click)
              </span>
              <span className="text-[10px] text-purple-400 font-mono">Huion PW100 Default</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  value: "erase",
                  label: "🧹 Quick Eraser",
                  desc: "Holding lower button erases strokes instantly (Recommended).",
                },
                {
                  value: "lasso",
                  label: "⭕ Lasso Selection",
                  desc: "Holding button lassos diagram equations.",
                },
                {
                  value: "pan",
                  label: "✋ Pan Blackboard",
                  desc: "Holding button drags canvas smoothly.",
                },
                {
                  value: "none",
                  label: "🚫 Disabled",
                  desc: "Ignore lower rocker clicks.",
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

          {/* 5B. Stylus Hardware Button 2 (Upper Rocker) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                Stylus Rocker Button 2 (Upper Button / Barrel 2)
              </span>
              <span className="text-[10px] text-cyan-400 font-mono">PW100 Upper Switch</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                {
                  value: "lasso",
                  label: "⭕ Lasso Selection",
                  desc: "Holding upper button lassos diagrams & equations (Recommended).",
                },
                {
                  value: "pan",
                  label: "✋ Pan Blackboard",
                  desc: "Holding upper button drags canvas smoothly.",
                },
                {
                  value: "erase",
                  label: "🧹 Quick Eraser",
                  desc: "Holding upper button erases strokes.",
                },
                {
                  value: "none",
                  label: "🚫 Disabled",
                  desc: "Ignore upper rocker clicks.",
                },
              ].map((b) => (
                <button
                  key={b.value}
                  onClick={() => updateSetting("barrelButton2Action", b.value as BarrelButtonAction)}
                  className={`
                    p-2.5 rounded-xl border text-left transition-all
                    ${
                      (localSettings.barrelButton2Action ?? "lasso") === b.value
                        ? "bg-cyan-500/20 border-cyan-400/60 text-white shadow-sm"
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

          {/* 5C. Hardware Tilt Dynamics */}
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div>
              <div className="font-semibold text-xs text-white flex items-center gap-2">
                <span>Hardware Stylus Tilt Dynamics (±60°)</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${localSettings.enableTiltDynamics !== false ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "bg-white/5 text-zinc-500"}`}>
                  {localSettings.enableTiltDynamics !== false ? "Active" : "Disabled"}
                </span>
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5 max-w-md">
                Tilting the Huion PW100 pen dynamically widens highlighter strokes like an authentic chisel tip, and enables soft pencil shading.
              </div>
            </div>
            <button
              onClick={() => updateSetting("enableTiltDynamics", localSettings.enableTiltDynamics === false ? true : false)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ml-4
                ${
                  localSettings.enableTiltDynamics !== false
                    ? "bg-cyan-400 text-zinc-950 shadow-sm shadow-cyan-400/30"
                    : "bg-white/10 text-zinc-400 hover:text-white"
                }
              `}
            >
              {localSettings.enableTiltDynamics !== false ? "ON" : "OFF"}
            </button>
          </div>

          {/* 5.5. Scribble-to-Erase Gesture */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03] border border-white/10">
            <div>
              <div className="font-semibold text-xs text-white flex items-center gap-2">
                <span>Natural Scribble-to-Erase Gesture</span>
                <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded ${localSettings.enableScribbleErase ? "bg-amber-500/20 text-amber-300 border border-amber-500/30" : "bg-white/5 text-zinc-500"}`}>
                  {localSettings.enableScribbleErase ? "Active" : "Protected"}
                </span>
              </div>
              <div className="text-[10px] text-zinc-400 mt-0.5 max-w-md">
                Scratch back-and-forth repeatedly (6+ zigzags) across an element to delete it. Keep <strong className="text-zinc-300">OFF</strong> (default) for pure cursive handwriting without accidental deletions.
              </div>
            </div>
            <button
              onClick={() => updateSetting("enableScribbleErase", !localSettings.enableScribbleErase)}
              className={`
                px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer shrink-0 ml-4
                ${
                  localSettings.enableScribbleErase
                    ? "bg-amber-400 text-zinc-950 shadow-sm shadow-amber-400/30"
                    : "bg-white/10 text-zinc-400 hover:text-white"
                }
              `}
            >
              {localSettings.enableScribbleErase ? "ON" : "OFF"}
            </button>
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
