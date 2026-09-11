import React, { useState, useEffect } from "react";
import { Play, Pause, RotateCcw, X, Clock, Bell, Minus, ChevronUp } from "lucide-react";

interface ClassroomTimerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ClassroomTimer: React.FC<ClassroomTimerProps> = ({ isOpen, onClose }) => {
  const [secondsLeft, setSecondsLeft] = useState(120); // default 2 minutes
  const [initialSeconds, setInitialSeconds] = useState(120);
  const [isRunning, setIsRunning] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Play audio chime using Web Audio API
  const playChime = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.setValueAtTime(880, ctx.currentTime + 0.15); // A5
      osc.frequency.setValueAtTime(1174.66, ctx.currentTime + 0.35); // D6
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 1.2);
    } catch {
      // AudioContext not allowed or disabled
    }
  };

  useEffect(() => {
    let interval: any = null;
    if (isRunning && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            setIsRunning(false);
            playChime();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRunning, secondsLeft]);

  if (!isOpen) return null;

  const setPreset = (sec: number) => {
    setInitialSeconds(sec);
    setSecondsLeft(sec);
    setIsRunning(false);
  };

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const progress = initialSeconds > 0 ? (secondsLeft / initialSeconds) * 100 : 0;
  const isExpired = secondsLeft === 0;

  return (
    <div
      className={`
        fixed z-50 transition-all select-none
        ${
          isMinimized
            ? "bottom-20 right-6"
            : "top-20 right-6 w-72"
        }
      `}
    >
      <div
        className={`
          rounded-2xl border backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.8)]
          transition-all duration-200 overflow-hidden
          ${
            isExpired
              ? "bg-rose-950/90 border-rose-500/50 shadow-rose-500/20 animate-pulse"
              : "bg-zinc-950/90 border-white/10"
          }
        `}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/10 bg-white/[0.03]">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
            <Clock className={`w-3.5 h-3.5 ${isExpired ? "text-rose-400" : "text-sky-400"}`} />
            <span>Classroom Timer</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
              title={isMinimized ? "Expand" : "Minimize"}
            >
              {isMinimized ? <ChevronUp className="w-3.5 h-3.5" /> : <Minus className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors"
              title="Close Timer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Minimized View */}
        {isMinimized ? (
          <div
            onClick={() => setIsMinimized(false)}
            className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-white/5"
          >
            <span className="font-mono font-bold text-sm text-white">{formatTime(secondsLeft)}</span>
            <span className={`w-2 h-2 rounded-full ${isRunning ? "bg-emerald-400 animate-ping" : "bg-zinc-500"}`} />
          </div>
        ) : (
          /* Expanded View */
          <div className="p-4 flex flex-col items-center gap-3.5">
            {/* Time Display */}
            <div className="relative flex flex-col items-center">
              <div
                className={`
                  font-mono font-black text-4xl tracking-tight transition-colors
                  ${isExpired ? "text-rose-300" : secondsLeft <= 10 && isRunning ? "text-amber-400" : "text-white"}
                `}
              >
                {formatTime(secondsLeft)}
              </div>
              {isExpired && (
                <span className="text-[11px] font-bold text-rose-400 tracking-wider uppercase mt-0.5 flex items-center gap-1">
                  <Bell className="w-3 h-3 animate-bounce" /> Time's Up!
                </span>
              )}

              {/* Progress Line */}
              <div className="w-48 h-1 bg-white/10 rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full transition-all duration-300 ${
                    isExpired ? "bg-rose-500" : "bg-gradient-to-r from-sky-400 to-cyan-400"
                  }`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-4 gap-1.5 w-full">
              {[
                { label: "1m", sec: 60 },
                { label: "2m", sec: 120 },
                { label: "5m", sec: 300 },
                { label: "10m", sec: 600 },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => setPreset(p.sec)}
                  className={`
                    py-1 text-xs font-mono font-medium rounded-lg border transition-all
                    ${
                      initialSeconds === p.sec && !isRunning
                        ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
                        : "bg-white/[0.04] text-zinc-400 hover:text-white hover:bg-white/[0.08] border-white/5"
                    }
                  `}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-2 w-full pt-1">
              <button
                onClick={() => {
                  if (secondsLeft === 0) setSecondsLeft(initialSeconds);
                  setIsRunning(!isRunning);
                }}
                className={`
                  flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all shadow-sm
                  ${
                    isRunning
                      ? "bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40"
                      : "bg-sky-500 text-white hover:bg-sky-400 shadow-sky-500/25"
                  }
                `}
              >
                {isRunning ? (
                  <>
                    <Pause className="w-3.5 h-3.5" /> Pause
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5" /> Start
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  setIsRunning(false);
                  setSecondsLeft(initialSeconds);
                }}
                title="Reset"
                className="p-2 rounded-xl bg-white/[0.06] hover:bg-white/10 text-zinc-300 hover:text-white border border-white/5 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
