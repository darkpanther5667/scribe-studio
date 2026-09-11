import React, { useState, useEffect, useRef } from "react";
import katex from "katex";
import { X, Check, Calculator } from "lucide-react";

interface MathFormulaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (latex: string) => void;
  initialLatex?: string;
}

const PRESET_SYMBOLS = [
  { label: "Fraction", latex: "\\frac{a}{b}", display: "a/b" },
  { label: "Square Root", latex: "\\sqrt{x}", display: "√x" },
  { label: "Power", latex: "x^{2}", display: "x²" },
  { label: "Subscript", latex: "x_{i}", display: "xᵢ" },
  { label: "Integral", latex: "\\int_{a}^{b} f(x)dx", display: "∫" },
  { label: "Summation", latex: "\\sum_{i=1}^{n} x_i", display: "∑" },
  { label: "Limit", latex: "\\lim_{x \\to 0}", display: "lim" },
  { label: "Alpha", latex: "\\alpha", display: "α" },
  { label: "Beta", latex: "\\beta", display: "β" },
  { label: "Theta", latex: "\\theta", display: "θ" },
  { label: "Pi", latex: "\\pi", display: "π" },
  { label: "Delta", latex: "\\Delta", display: "Δ" },
  { label: "Vector", latex: "\\vec{F} = m\\vec{a}", display: "F⃗=ma" },
  { label: "Einstein", latex: "E = mc^{2}", display: "E=mc²" },
  { label: "Quadratic", latex: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}", display: "±√" },
  { label: "Pythagoras", latex: "a^2 + b^2 = c^2", display: "a²+b²=c²" },
];

export const MathFormulaModal: React.FC<MathFormulaModalProps> = ({
  isOpen,
  onClose,
  onInsert,
  initialLatex = "E = mc^2",
}) => {
  const [latex, setLatex] = useState(initialLatex);
  const [previewHtml, setPreviewHtml] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isOpen) {
      setLatex(initialLatex || "E = mc^2");
      setTimeout(() => {
        inputRef.current?.focus();
        inputRef.current?.select();
      }, 50);
    }
  }, [isOpen, initialLatex]);

  useEffect(() => {
    try {
      const html = katex.renderToString(latex.trim() || "\\text{Type LaTeX...}", {
        displayMode: true,
        throwOnError: true,
      });
      setPreviewHtml(html);
      setError(null);
    } catch (err: any) {
      setError(err?.message || "Invalid LaTeX syntax");
    }
  }, [latex]);

  if (!isOpen) return null;

  const handleInsert = () => {
    const trimmed = latex.trim();
    if (trimmed) {
      onInsert(trimmed);
      onClose();
    }
  };

  const appendSymbol = (sym: string) => {
    setLatex((prev) => (prev ? `${prev} ${sym}` : sym));
    inputRef.current?.focus();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md animate-in fade-in duration-150 p-4"
      onClick={onClose}
    >
      <div
        className="
          relative w-full max-w-xl rounded-3xl bg-zinc-950/95
          border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)]
          p-5 flex flex-col gap-4 text-white
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-sky-400 flex items-center justify-center shadow-md shadow-cyan-500/25">
              <Calculator className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Math & LaTeX Equation</h3>
              <p className="text-xs text-zinc-400">Render crisp formulas directly onto Tapboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Live KaTeX Preview Box */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Live Preview</span>
          <div className="w-full min-h-[90px] rounded-2xl bg-black/60 border border-white/10 p-4 flex items-center justify-center overflow-x-auto shadow-inner text-lg">
            {error ? (
              <span className="text-xs font-mono text-rose-400/90">{error}</span>
            ) : (
              <div
                className="text-white select-none scale-110"
                dangerouslySetInnerHTML={{ __html: previewHtml }}
              />
            )}
          </div>
        </div>

        {/* Preset Symbols Quick Bar */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">Quick Math Palette</span>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 rounded-xl bg-white/[0.02] border border-white/5">
            {PRESET_SYMBOLS.map((s) => (
              <button
                key={s.label}
                onClick={() => appendSymbol(s.latex)}
                title={s.label}
                className="px-2.5 py-1 rounded-lg text-xs font-mono bg-white/[0.05] hover:bg-sky-500/20 hover:text-sky-200 border border-white/5 hover:border-sky-400/40 transition-all active:scale-95"
              >
                {s.display}
              </button>
            ))}
          </div>
        </div>

        {/* LaTeX Code Input */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider">LaTeX Code</span>
          <textarea
            ref={inputRef}
            value={latex}
            onChange={(e) => setLatex(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleInsert();
              }
              if (e.key === "Escape") {
                e.preventDefault();
                onClose();
              }
            }}
            placeholder="Type equation in LaTeX, e.g. \int x^2 dx..."
            rows={2}
            className="
              w-full p-3 rounded-xl bg-zinc-900/90 border border-white/10
              text-sm font-mono text-cyan-200 outline-none
              focus:border-sky-400 focus:ring-1 focus:ring-sky-400/30
              resize-none transition-all
            "
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-white/10">
          <span className="text-[11px] text-zinc-500 font-mono">
            Press <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-zinc-300">Enter</kbd> to insert
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-300 hover:text-white hover:bg-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleInsert}
              className="
                flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold
                bg-gradient-to-r from-sky-500 to-cyan-400 text-zinc-950
                hover:opacity-90 shadow-lg shadow-cyan-500/25
                transition-all active:scale-95
              "
            >
              <Check className="w-3.5 h-3.5" />
              <span>Insert on Canvas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
