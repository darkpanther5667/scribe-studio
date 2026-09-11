import React, { useState } from "react";
import {
  Atom,
  Sigma,
  Zap,
  FlaskConical,
  X,
} from "lucide-react";

interface StemSymbolBarProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertSymbol: (symbolLatex: string) => void;
}

type CategoryKey = "calculus" | "physics" | "algebra" | "chemistry";

interface SymbolItem {
  label: string;
  latex: string;
  preview: string;
  tooltip: string;
}

const SYMBOL_CATEGORIES: Record<CategoryKey, { title: string; icon: React.ReactNode; symbols: SymbolItem[] }> = {
  calculus: {
    title: "Calculus & Limits",
    icon: <Sigma className="w-3.5 h-3.5 text-sky-400" />,
    symbols: [
      { label: "∫", latex: "\\int f(x) \\, dx", preview: "∫", tooltip: "Indefinite Integral" },
      { label: "∬", latex: "\\iint", preview: "∬", tooltip: "Double Integral" },
      { label: "∮", latex: "\\oint", preview: "∮", tooltip: "Contour / Surface Integral" },
      { label: "d/dx", latex: "\\frac{d}{dx}", preview: "d/dx", tooltip: "Derivative" },
      { label: "∂/∂x", latex: "\\frac{\\partial}{\\partial x}", preview: "∂/∂x", tooltip: "Partial Derivative" },
      { label: "∑", latex: "\\sum_{i=1}^{n}", preview: "∑", tooltip: "Summation" },
      { label: "lim", latex: "\\lim_{x \\to 0}", preview: "lim", tooltip: "Limit" },
      { label: "∇", latex: "\\nabla", preview: "∇", tooltip: "Gradient / Del Operator" },
      { label: "∞", latex: "\\infty", preview: "∞", tooltip: "Infinity" },
      { label: "Δ", latex: "\\Delta", preview: "Δ", tooltip: "Delta / Change" },
    ],
  },
  physics: {
    title: "Physics & Vectors",
    icon: <Zap className="w-3.5 h-3.5 text-amber-400" />,
    symbols: [
      { label: "F⃗", latex: "\\vec{F} = m\\vec{a}", preview: "F⃗", tooltip: "Force Vector" },
      { label: "v⃗", latex: "\\vec{v}", preview: "v⃗", tooltip: "Velocity Vector" },
      { label: "a⃗", latex: "\\vec{a}", preview: "a⃗", tooltip: "Acceleration Vector" },
      { label: "E⃗", latex: "\\vec{E}", preview: "E⃗", tooltip: "Electric Field Vector" },
      { label: "B⃗", latex: "\\vec{B}", preview: "B⃗", tooltip: "Magnetic Field Vector" },
      { label: "θ", latex: "\\theta", preview: "θ", tooltip: "Theta / Angle" },
      { label: "ω", latex: "\\omega", preview: "ω", tooltip: "Angular Velocity" },
      { label: "λ", latex: "\\lambda", preview: "λ", tooltip: "Wavelength" },
      { label: "μ", latex: "\\mu", preview: "μ", tooltip: "Friction / Micro" },
      { label: "Ω", latex: "\\Omega", preview: "Ω", tooltip: "Ohm / Resistance" },
      { label: "ħ", latex: "\\hbar", preview: "ħ", tooltip: "Reduced Planck Constant" },
      { label: "ρ", latex: "\\rho", preview: "ρ", tooltip: "Density / Resistivity" },
    ],
  },
  algebra: {
    title: "Algebra & Logic",
    icon: <Atom className="w-3.5 h-3.5 text-purple-400" />,
    symbols: [
      { label: "√x", latex: "\\sqrt{x}", preview: "√x", tooltip: "Square Root" },
      { label: "±", latex: "\\pm", preview: "±", tooltip: "Plus-Minus" },
      { label: "≈", latex: "\\approx", preview: "≈", tooltip: "Approximately Equal" },
      { label: "≠", latex: "\\neq", preview: "≠", tooltip: "Not Equal" },
      { label: "≤", latex: "\\le", preview: "≤", tooltip: "Less than or equal" },
      { label: "≥", latex: "\\ge", preview: "≥", tooltip: "Greater than or equal" },
      { label: "∴", latex: "\\therefore", preview: "∴", tooltip: "Therefore" },
      { label: "∵", latex: "\\because", preview: "∵", tooltip: "Because / Since" },
      { label: "⇒", latex: "\\implies", preview: "⇒", tooltip: "Implies" },
      { label: "⇔", latex: "\\iff", preview: "⇔", tooltip: "If and only if" },
      { label: "∈", latex: "\\in", preview: "∈", tooltip: "Element of" },
      { label: "⊂", latex: "\\subset", preview: "⊂", tooltip: "Subset of" },
    ],
  },
  chemistry: {
    title: "Chemistry Reactions",
    icon: <FlaskConical className="w-3.5 h-3.5 text-emerald-400" />,
    symbols: [
      { label: "→", latex: "\\rightarrow", preview: "→", tooltip: "Reaction Yields" },
      { label: "⇌", latex: "\\rightleftharpoons", preview: "⇌", tooltip: "Equilibrium" },
      { label: "↑", latex: "\\uparrow", preview: "↑", tooltip: "Gas Evolution" },
      { label: "↓", latex: "\\downarrow", preview: "↓", tooltip: "Precipitate Formed" },
      { label: "ΔH", latex: "\\Delta H", preview: "ΔH", tooltip: "Enthalpy Change" },
      { label: "pH", latex: "\\text{pH}", preview: "pH", tooltip: "pH Value" },
      { label: "mol", latex: "\\text{mol}", preview: "mol", tooltip: "Mole Unit" },
      { label: "⇌", latex: "\\xrightleftharpoons[\\text{catalyst}]{\\Delta}", preview: "cat⇌", tooltip: "Catalyzed Reaction" },
    ],
  },
};

export const StemSymbolBar: React.FC<StemSymbolBarProps> = ({
  isOpen,
  onClose,
  onInsertSymbol,
}) => {
  const [activeTab, setActiveTab] = useState<CategoryKey>("calculus");

  if (!isOpen) return null;

  return (
    <div
      className="fixed bottom-24 right-6 z-40 select-none animate-in fade-in slide-in-from-bottom-3 duration-150"
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="w-[340px] rounded-2xl bg-zinc-950/95 backdrop-blur-2xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.85)] ring-1 ring-white/10 overflow-hidden flex flex-col">
        {/* ── Header Bar ── */}
        <div className="px-3 py-2 bg-gradient-to-r from-sky-500/15 via-purple-500/10 to-transparent border-b border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-white/10 text-sky-300">
              <Atom className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold font-mono text-zinc-200">
              STEM Science & Math Bar
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
            title="Close STEM Bar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* ── Category Tabs ── */}
        <div className="flex items-center border-b border-white/5 bg-white/[0.02] p-1 gap-1">
          {(Object.keys(SYMBOL_CATEGORIES) as CategoryKey[]).map((key) => {
            const cat = SYMBOL_CATEGORIES[key];
            const isActive = activeTab === key;
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`
                  flex-1 flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl text-[11px] font-semibold transition-all
                  ${
                    isActive
                      ? "bg-white/15 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.05]"
                  }
                `}
              >
                {cat.icon}
                <span className="capitalize">{key}</span>
              </button>
            );
          })}
        </div>

        {/* ── Symbols Grid ── */}
        <div className="p-3 grid grid-cols-4 gap-1.5 max-h-56 overflow-y-auto">
          {SYMBOL_CATEGORIES[activeTab].symbols.map((sym, idx) => (
            <button
              key={idx}
              onClick={() => onInsertSymbol(sym.latex)}
              title={sym.tooltip}
              className="
                flex flex-col items-center justify-center p-2 rounded-xl
                bg-white/[0.03] hover:bg-sky-500/20 hover:border-sky-400/40
                border border-white/5 text-zinc-200 hover:text-white
                transition-all duration-150 active:scale-90 group
              "
            >
              <span className="font-serif italic font-bold text-base group-hover:scale-110 transition-transform">
                {sym.preview}
              </span>
              <span className="text-[9px] font-mono text-zinc-500 group-hover:text-sky-300 mt-0.5 truncate w-full text-center">
                {sym.label}
              </span>
            </button>
          ))}
        </div>

        {/* ── Footer Helper ── */}
        <div className="px-3 py-1.5 bg-white/[0.02] border-t border-white/5 flex items-center justify-between text-[10px] text-zinc-500 font-mono">
          <span>Click to stamp on slide</span>
          <span className="text-sky-400 font-bold">1-Click KaTeX Vector</span>
        </div>
      </div>
    </div>
  );
};
