import React from "react";
import { X, Sparkles, Activity, Orbit, Compass } from "lucide-react";
import type { SimType } from "../types/whiteboard";
import { SIMULATION_DEFINITIONS } from "../utils/physicsSimulation";

interface BringToLifeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectSim: (type: SimType) => void;
}

const SIM_ICONS: Record<SimType, React.ReactNode> = {
  wave: <Activity className="w-5 h-5 text-cyan-400" />,
  pendulum: <Compass className="w-5 h-5 text-amber-400" />,
  ramp: <span className="text-lg">📐</span>,
  spring: <span className="text-lg">⚡</span>,
  orbit: <Orbit className="w-5 h-5 text-purple-400" />,
};

export const BringToLifeModal: React.FC<BringToLifeModalProps> = ({
  isOpen,
  onClose,
  onSelectSim,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="
          relative w-full max-w-lg bg-zinc-950/95 border border-cyan-500/30
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
                  Interactive Gizmos
                </span>
              </h2>
              <p className="text-[11px] text-zinc-400">
                Transform equations & sketches into live animated physics simulations
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

        {/* Simulation Cards Grid */}
        <div className="grid grid-cols-1 gap-2.5 max-h-[60vh] overflow-y-auto pr-1">
          {(Object.keys(SIMULATION_DEFINITIONS) as SimType[]).map((type) => {
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

        {/* Footer info */}
        <div className="text-[11px] text-zinc-500 text-center pt-1 border-t border-white/5">
          Tip: You can drag, resize, pause, and adjust parameters live during class!
        </div>
      </div>
    </div>
  );
};
