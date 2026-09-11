import React, { useState, useEffect, useRef } from "react";
import { X, Check, Activity } from "lucide-react";

interface FunctionPlotterModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertPlot: (plotData: {
    expr: string;
    points: { x: number; y: number }[];
    label: string;
    xMin: number;
    xMax: number;
    yMin: number;
    yMax: number;
  }) => void;
}

const PRESET_FUNCTIONS = [
  { label: "Sine Wave", expr: "Math.sin(x)", display: "y = sin(x)", xMin: -6.28, xMax: 6.28 },
  { label: "Cosine Wave", expr: "Math.cos(x)", display: "y = cos(x)", xMin: -6.28, xMax: 6.28 },
  { label: "Parabola", expr: "x * x", display: "y = x²", xMin: -4, xMax: 4 },
  { label: "Cubic", expr: "x * x * x - 3 * x", display: "y = x³ - 3x", xMin: -3, xMax: 3 },
  { label: "Exponential", expr: "Math.exp(x)", display: "y = eˣ", xMin: -3, xMax: 2.5 },
  { label: "Bell Curve", expr: "Math.exp(-x * x)", display: "y = e^(-x²)", xMin: -3, xMax: 3 },
  { label: "Damped Sine", expr: "Math.exp(-0.3 * Math.abs(x)) * Math.sin(3 * x)", display: "y = e^(-0.3|x|) sin(3x)", xMin: -6.28, xMax: 6.28 },
];

export const FunctionPlotterModal: React.FC<FunctionPlotterModalProps> = ({
  isOpen,
  onClose,
  onInsertPlot,
}) => {
  const [expr, setExpr] = useState("Math.sin(x)");
  const [displayExpr, setDisplayExpr] = useState("y = sin(x)");
  const [xRange, setXRange] = useState({ min: -6.28, max: 6.28 });
  const [error, setError] = useState<string | null>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Safely evaluate math expression for an array of points
  const evaluatePoints = (mathExpr: string, minX: number, maxX: number) => {
    const pts: { x: number; y: number }[] = [];
    const steps = 160;
    const dx = (maxX - minX) / steps;

    try {
      // Build safe evaluation function
      const fn = new Function("x", `"use strict"; return (${mathExpr});`);
      
      let yMin = Infinity;
      let yMax = -Infinity;

      for (let i = 0; i <= steps; i++) {
        const x = minX + i * dx;
        const y = fn(x);
        if (typeof y === "number" && !isNaN(y) && isFinite(y)) {
          pts.push({ x, y });
          if (y < yMin) yMin = y;
          if (y > yMax) yMax = y;
        }
      }

      return { pts, yMin, yMax, err: null };
    } catch (e: any) {
      return { pts: [], yMin: 0, yMax: 0, err: e.message || "Invalid expression" };
    }
  };

  // Render live preview on canvas
  useEffect(() => {
    if (!isOpen) return;
    const canvas = previewCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;

    // Clear
    ctx.fillStyle = "#0c121e";
    ctx.fillRect(0, 0, w, h);

    const { pts, yMin, yMax, err } = evaluatePoints(expr, xRange.min, xRange.max);
    if (err) {
      setError(err);
      return;
    }
    setError(null);

    // Padding
    const pad = 24;
    const plotW = w - pad * 2;
    const plotH = h - pad * 2;

    const effectiveYMin = Math.min(-1, yMin);
    const effectiveYMax = Math.max(1, yMax);
    const ySpan = Math.max(0.1, effectiveYMax - effectiveYMin);
    const xSpan = Math.max(0.1, xRange.max - xRange.min);

    // Mapping helper
    const mapX = (x: number) => pad + ((x - xRange.min) / xSpan) * plotW;
    const mapY = (y: number) => h - pad - ((y - effectiveYMin) / ySpan) * plotH;

    // Draw Axes
    ctx.strokeStyle = "rgba(255, 255, 255, 0.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    // X axis (y = 0)
    const y0 = mapY(0);
    if (y0 >= pad && y0 <= h - pad) {
      ctx.moveTo(pad, y0);
      ctx.lineTo(w - pad, y0);
    }
    // Y axis (x = 0)
    const x0 = mapX(0);
    if (x0 >= pad && x0 <= w - pad) {
      ctx.moveTo(x0, pad);
      ctx.lineTo(x0, h - pad);
    }
    ctx.stroke();

    // Plot Curve
    if (pts.length > 1) {
      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.moveTo(mapX(pts[0].x), mapY(pts[0].y));
      for (let i = 1; i < pts.length; i++) {
        ctx.lineTo(mapX(pts[i].x), mapY(pts[i].y));
      }
      ctx.stroke();
    }
  }, [expr, xRange, isOpen]);

  if (!isOpen) return null;

  const handleInsert = () => {
    const { pts, yMin, yMax, err } = evaluatePoints(expr, xRange.min, xRange.max);
    if (err || pts.length === 0) return;

    onInsertPlot({
      expr,
      points: pts,
      label: displayExpr,
      xMin: xRange.min,
      xMax: xRange.max,
      yMin,
      yMax,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-zinc-950 border border-white/10 shadow-2xl p-5 flex flex-col gap-4 text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-xl bg-sky-500/20 text-sky-400">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Function Plotter ($y = f(x)$)</h3>
              <p className="text-[11px] text-zinc-400">Plot mathematical equations directly onto the canvas</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preset Chips */}
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 mb-1.5 block">
            Common Functions
          </span>
          <div className="flex flex-wrap gap-1.5">
            {PRESET_FUNCTIONS.map((p) => (
              <button
                key={p.label}
                onClick={() => {
                  setExpr(p.expr);
                  setDisplayExpr(p.display);
                  setXRange({ min: p.xMin, max: p.xMax });
                }}
                className={`
                  px-2.5 py-1 rounded-lg text-xs font-mono transition-colors
                  ${
                    expr === p.expr
                      ? "bg-sky-500/30 text-sky-300 border border-sky-400/50"
                      : "bg-white/[0.04] text-zinc-300 hover:text-white hover:bg-white/[0.08] border border-white/5"
                  }
                `}
              >
                {p.display}
              </button>
            ))}
          </div>
        </div>

        {/* Expression Input */}
        <div>
          <label className="text-xs font-medium text-zinc-300 mb-1 block">Function Expression (JavaScript Math):</label>
          <input
            type="text"
            value={expr}
            onChange={(e) => {
              setExpr(e.target.value);
              setDisplayExpr(`y = ${e.target.value}`);
            }}
            placeholder="e.g. Math.sin(x), x*x - 4"
            className="w-full px-3 py-2 rounded-xl bg-zinc-900 border border-white/10 font-mono text-xs text-sky-300 focus:outline-none focus:border-sky-400"
          />
          {error && <span className="text-[11px] text-rose-400 mt-1 block font-mono">{error}</span>}
        </div>

        {/* Live Preview Canvas */}
        <div className="flex flex-col items-center">
          <canvas
            ref={previewCanvasRef}
            width={400}
            height={160}
            className="w-full h-40 rounded-xl border border-white/10"
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <button onClick={onClose} className="px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white">
            Cancel
          </button>
          <button
            onClick={handleInsert}
            disabled={!!error}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white font-semibold text-xs transition-colors shadow-md shadow-sky-500/25"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Plot on Whiteboard</span>
          </button>
        </div>
      </div>
    </div>
  );
};
