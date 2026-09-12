import React, { useState, useMemo } from "react";
import katex from "katex";
import { X, Sparkles, Activity, Orbit, Compass, Wand2 } from "lucide-react";
import type { SimType, SimulationParams } from "../types/whiteboard";
import { SIMULATION_DEFINITIONS } from "../utils/physicsSimulation";

interface BringToLifeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSim: (
    type: SimType,
    customParams?: Partial<SimulationParams>,
    customTitle?: string
  ) => void;
}

const SIM_ICONS: Record<SimType, React.ReactNode> = {
  custom_equation: <Sparkles className="w-5 h-5 text-amber-400" />,
  wave: <Activity className="w-5 h-5 text-cyan-400" />,
  pendulum: <Compass className="w-5 h-5 text-amber-400" />,
  ramp: <span className="text-lg">📐</span>,
  spring: <span className="text-lg">⚡</span>,
  orbit: <Orbit className="w-5 h-5 text-purple-400" />,
};

const EQUATION_PRESETS = [
  {
    label: "🌊 Traveling Wave",
    expr: "A * sin(B * x - C * t)",
    latex: "y(x, t) = A \\sin(B x - C t)",
    title: "Traveling Sine Wave",
    params: { varA: 42, varB: 0.04, varC: 2.5, varD: 0.0 },
  },
  {
    label: "📳 Damped Wave",
    expr: "A * exp(-D * x) * sin(B * x - C * t)",
    latex: "y(x, t) = A e^{-D x} \\sin(B x - C t)",
    title: "Damped Oscillating Wave",
    params: { varA: 55, varB: 0.045, varC: 2.2, varD: 0.008 },
  },
  {
    label: "〰️ Standing Beats",
    expr: "A * sin(B * x) * cos(C * t)",
    latex: "y(x, t) = A \\sin(B x) \\cos(C t)",
    title: "Standing Wave & Resonant Beats",
    params: { varA: 45, varB: 0.035, varC: 2.0, varD: 0.0 },
  },
  {
    label: "📦 Gaussian Soliton",
    expr: "A * exp(-0.0008 * (x - ((C * 18 * t) % 360))^2)",
    latex: "y(x, t) = A \\exp\\left(-\\gamma (x - v t)^2\\right)",
    title: "Gaussian Pulse / Soliton Wavepacket",
    params: { varA: 52, varB: 0.04, varC: 1.5, varD: 0.0 },
  },
  {
    label: "🎻 Fourier Harmonics",
    expr: "A * (sin(B * x - C * t) + 0.35 * sin(3 * (B * x - C * t)))",
    latex: "y(x, t) = A \\left[\\sin(\\phi) + \\frac{1}{3}\\sin(3\\phi)\\right]",
    title: "Fourier Odd Harmonics",
    params: { varA: 40, varB: 0.035, varC: 2.0, varD: 0.0 },
  },
  {
    label: "📈 Dynamic Cubic",
    expr: "0.0008 * (x - 180)^3 - 0.35 * (x - 180) + A * sin(C * t)",
    latex: "y(x, t) = \\alpha x^3 - \\beta x + A\\sin(\\omega t)",
    title: "Cubic Polynomial with Time Oscillation",
    params: { varA: 30, varB: 0.02, varC: 2.0, varD: 0.0 },
  },
];

export const BringToLifeModal: React.FC<BringToLifeModalProps> = ({
  isOpen,
  onClose,
  onSelectSim,
}) => {
  const [activeTab, setActiveTab] = useState<"custom" | "presets">("custom");
  const [equationText, setEquationText] = useState("A * sin(B * x - C * t)");
  const [activePresetTitle, setActivePresetTitle] = useState("Traveling Sine Wave");
  const [activeParams, setActiveParams] = useState<Partial<SimulationParams>>({
    varA: 42,
    varB: 0.04,
    varC: 2.5,
    varD: 0.0,
  });

  // KaTeX formula render for the custom equation
  const previewLatex = useMemo(() => {
    let clean = equationText.trim();
    if (!clean) return "y(x, t) = 0";
    if (clean.includes("y") || clean.includes("=")) {
      return clean;
    }
    return `y(x, t) = ${clean}`;
  }, [equationText]);

  const previewHtml = useMemo(() => {
    try {
      return katex.renderToString(previewLatex, {
        displayMode: true,
        throwOnError: false,
      });
    } catch {
      return previewLatex;
    }
  }, [previewLatex]);

  if (!isOpen) return null;

  const handleLaunchCustom = () => {
    onSelectSim(
      "custom_equation",
      {
        equationStr: equationText.trim() || "A * sin(B * x - C * t)",
        equationLatex: previewLatex,
        ...activeParams,
      },
      activePresetTitle || "Custom Live Equation"
    );
    onClose();
  };

  const handleSelectPreset = (p: typeof EQUATION_PRESETS[0]) => {
    setEquationText(p.expr);
    setActivePresetTitle(p.title);
    setActiveParams(p.params);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="
          relative w-full max-w-xl bg-zinc-950/95 border border-cyan-500/30
          rounded-3xl shadow-2xl shadow-cyan-950/60 p-5 overflow-hidden flex flex-col gap-4
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background ambient glow */}
        <div className="absolute -top-20 -right-20 w-48 h-48 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-amber-500/20 border border-cyan-400/40 text-cyan-300">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-wide flex items-center gap-1.5">
                <span>Math-to-Life</span>
                <span className="px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-mono">
                  Universal Engine
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Turn any math equation or physics law into a live interactive simulation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex p-1 rounded-2xl bg-white/[0.04] border border-white/10">
          <button
            onClick={() => setActiveTab("custom")}
            className={`
              flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5
              ${
                activeTab === "custom"
                  ? "bg-gradient-to-r from-cyan-500 to-sky-400 text-zinc-950 shadow-md font-bold"
                  : "text-zinc-400 hover:text-white"
              }
            `}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>✨ Bring Any Equation to Life</span>
          </button>
          <button
            onClick={() => setActiveTab("presets")}
            className={`
              flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5
              ${
                activeTab === "presets"
                  ? "bg-gradient-to-r from-cyan-500 to-sky-400 text-zinc-950 shadow-md font-bold"
                  : "text-zinc-400 hover:text-white"
              }
            `}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Physical Law Gizmos</span>
          </button>
        </div>

        {/* Tab 1: Universal Any Equation to Life Studio */}
        {activeTab === "custom" && (
          <div className="flex flex-col gap-3 max-h-[60vh] overflow-y-auto pr-1">
            {/* Live KaTeX Preview Screen */}
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                Live Formula Preview
              </span>
              <div className="w-full min-h-[72px] rounded-2xl bg-black/60 border border-white/10 p-3 flex items-center justify-center overflow-x-auto shadow-inner text-base">
                <div
                  className="text-white select-none scale-105"
                  dangerouslySetInnerHTML={{ __html: previewHtml }}
                />
              </div>
            </div>

            {/* Equation Input Box */}
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                  Type Any Math Expression:
                </span>
                <span className="text-[10px] font-mono text-cyan-400/80">
                  Variables: x, t, A, B, C, D
                </span>
              </div>
              <input
                type="text"
                value={equationText}
                onChange={(e) => setEquationText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleLaunchCustom();
                  }
                }}
                className="w-full px-3 py-2.5 rounded-xl bg-zinc-900 border border-white/15 text-xs font-mono text-cyan-300 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/30"
                placeholder="e.g. A * sin(B * x - C * t) * exp(-D * x)"
              />
            </div>

            {/* Quick Inspiration Chips */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-mono text-zinc-400 uppercase tracking-wider">
                Instant Presets & Waveforms
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {EQUATION_PRESETS.map((p) => (
                  <button
                    key={p.label}
                    onClick={() => handleSelectPreset(p)}
                    className={`
                      p-2 rounded-xl text-left border transition-all text-[11px] font-mono
                      ${
                        equationText === p.expr
                          ? "bg-cyan-500/15 border-cyan-400/50 text-cyan-200"
                          : "bg-white/[0.02] hover:bg-white/[0.06] border-white/10 text-zinc-300"
                      }
                    `}
                  >
                    <div className="font-sans font-medium text-xs text-white">
                      {p.label}
                    </div>
                    <div className="text-[10px] text-zinc-400 truncate mt-0.5">
                      {p.expr}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Launch Action Button */}
            <button
              onClick={handleLaunchCustom}
              className="
                mt-1 flex items-center justify-center gap-2 w-full py-2.5 rounded-2xl text-xs font-bold
                bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 text-zinc-950
                hover:opacity-95 shadow-lg shadow-amber-500/25 active:scale-[0.99] transition-all
              "
            >
              <Sparkles className="w-4 h-4 text-zinc-950 fill-zinc-950" />
              <span>✨ Bring Equation to Life on Canvas</span>
            </button>
          </div>
        )}

        {/* Tab 2: Classic Physical Law Simulations */}
        {activeTab === "presets" && (
          <div className="grid grid-cols-1 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
            {(["wave", "pendulum", "ramp", "spring", "orbit"] as SimType[]).map((type) => {
              const def = SIMULATION_DEFINITIONS[type];
              return (
                <button
                  key={type}
                  onClick={() => {
                    onSelectSim(type);
                    onClose();
                  }}
                  className="
                    p-3 rounded-2xl border border-white/10 bg-white/[0.02] hover:bg-white/[0.07]
                    hover:border-cyan-400/50 text-left transition-all active:scale-[0.99] group
                    flex items-start gap-3
                  "
                >
                  <div className="p-2.5 rounded-xl bg-black/40 border border-white/10 shrink-0 group-hover:border-cyan-500/30 transition-colors">
                    {SIM_ICONS[type]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                        {def.title}
                      </div>
                      <span className="text-[10px] text-cyan-400/80 font-mono bg-cyan-950/40 px-1.5 py-0.5 rounded border border-cyan-500/20">
                        {def.category}
                      </span>
                    </div>

                    <p className="text-[11px] text-zinc-400 mt-0.5 leading-snug line-clamp-2">
                      {def.description}
                    </p>

                    <div className="mt-1.5 text-[10px] font-mono text-amber-300/80 bg-black/30 px-2 py-0.5 rounded inline-block">
                      {def.formulaLatex}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}

        {/* Footer info */}
        <div className="text-[11px] text-zinc-500 text-center pt-1 border-t border-white/5">
          Tip: You can drag sliders to change frequency, amplitude, and time speed live in front of students!
        </div>
      </div>
    </div>
  );
};

