import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Play,
  Pause,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
  Plus,
} from "lucide-react";

interface ClassroomPollWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  onStampToCanvas?: (pollData: { question: string; options: string[]; correctIndex: number }) => void;
}

export const ClassroomPollWidget: React.FC<ClassroomPollWidgetProps> = ({
  isOpen,
  onClose,
  onStampToCanvas,
}) => {
  const [question, setQuestion] = useState("What is the acceleration of the 5kg block?");
  const [options, setOptions] = useState<string[]>([
    "2.5 m/s²",
    "5.0 m/s²",
    "9.8 m/s²",
    "12.4 m/s²",
  ]);
  const [correctIndex, setCorrectIndex] = useState<number>(1); // Option B by default
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [isRevealed, setIsRevealed] = useState(false);

  // Timer state
  const [timerDuration, setTimerDuration] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // Simulated student vote percentages
  const [percentages, setPercentages] = useState<number[]>([12, 72, 10, 6]);

  // Position state (draggable)
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 40, y: 110 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // ── Web Audio Synthesizer for Victory Chime ────────────────────────────────
  const playChime = (type: "victory" | "tick") => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (type === "tick") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        gain.gain.setValueAtTime(0.04, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.05);
      } else {
        // C-Major Victory Arpeggio (C5 -> E5 -> G5 -> C6)
        const notes = [523.25, 659.25, 783.99, 1046.5];
        notes.forEach((freq, idx) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "triangle";
          osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.09);
          gain.gain.setValueAtTime(0.12, ctx.currentTime + idx * 0.09);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.09 + 0.35);
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start(ctx.currentTime + idx * 0.09);
          osc.stop(ctx.currentTime + idx * 0.09 + 0.35);
        });
      }
    } catch {
      // AudioContext not available or blocked
    }
  };

  // ── Countdown Timer Tick ───────────────────────────────────────────────────
  useEffect(() => {
    if (!isTimerRunning) return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTimerRunning(false);
          setIsRevealed(true);
          playChime("victory");
          return 0;
        }
        if (prev <= 5) playChime("tick");
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const randomizePercentages = () => {
    const correctVal = 58 + Math.floor(Math.random() * 24);
    const remaining = 100 - correctVal;
    const parts = Math.max(1, options.length - 1);
    let allocated = 0;
    const res = options.map((_, i) => {
      if (i === correctIndex) return correctVal;
      const share = Math.floor(remaining / parts);
      allocated += share;
      return share;
    });
    const diff = 100 - (correctVal + allocated);
    const firstOther = options.findIndex((_, i) => i !== correctIndex);
    if (firstOther !== -1) res[firstOther] += diff;
    setPercentages(res);
  };

  const handleStartTimer = (secs?: number) => {
    const s = secs !== undefined ? secs : timerDuration;
    setTimeLeft(s);
    setIsTimerRunning(true);
    setIsRevealed(false);
  };

  const handleResetTimer = () => {
    setIsTimerRunning(false);
    setTimeLeft(timerDuration);
    setIsRevealed(false);
  };

  const handleRevealAnswer = () => {
    setIsRevealed((prev) => {
      const next = !prev;
      if (next) {
        randomizePercentages();
        playChime("victory");
      }
      return next;
    });
  };

  // ── Dragging logic ─────────────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: rect.left,
      startY: rect.top,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    setPos({
      x: Math.max(12, Math.min(window.innerWidth - 380, dragStartRef.current.startX + dx)),
      y: Math.max(60, Math.min(window.innerHeight - 440, dragStartRef.current.startY + dy)),
    });
  };

  const handlePointerUp = () => setIsDragging(false);

  if (!isOpen) return null;

  const timerProgress = timeLeft / timerDuration;
  const letters = ["A", "B", "C", "D"];

  return (
    <div
      className="fixed z-50 select-none animate-in fade-in zoom-in-95 duration-150"
      style={{ left: `${pos.x}px`, top: `${pos.y}px`, width: "380px" }}
    >
      <div className="rounded-2xl bg-zinc-950/95 backdrop-blur-2xl border border-sky-500/30 shadow-[0_25px_60px_rgba(0,0,0,0.9)] ring-1 ring-white/10 overflow-hidden flex flex-col text-white">
        {/* ── Header Grab Bar ── */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          className={`
            px-3.5 py-2.5 bg-gradient-to-r from-sky-500/20 via-indigo-500/10 to-transparent
            border-b border-white/10 flex items-center justify-between
            ${isDragging ? "cursor-grabbing" : "cursor-grab"}
          `}
        >
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-lg bg-sky-500/30 text-sky-300">
              <Trophy className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold font-mono tracking-tight text-zinc-100">
              Live MCQ Poll & Quiz
            </span>
            <span className="text-[9px] font-mono font-bold bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded-full border border-amber-400/30">
              UNACADEMY STYLE
            </span>
          </div>

          <div className="flex items-center gap-1">
            {onStampToCanvas && (
              <button
                type="button"
                onClick={() => {
                  onStampToCanvas({ question, options, correctIndex });
                  onClose();
                }}
                className="p-1 rounded-lg text-zinc-400 hover:text-sky-300 hover:bg-white/10 transition-all text-xs"
                title="Stamp Poll onto Blackboard Slide"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
              title="Close Poll"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── Question Input Area ── */}
        <div className="p-3 border-b border-white/5 bg-white/[0.02]">
          <div className="flex items-center justify-between text-[10px] text-zinc-400 font-mono mb-1">
            <span>QUESTION PROMPT:</span>
            <span className="opacity-60">Click to edit</span>
          </div>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            className="w-full bg-transparent outline-none font-semibold text-sm text-zinc-100 placeholder:text-zinc-600 border-b border-transparent focus:border-sky-400 transition-colors pb-0.5"
            placeholder="Type question statement..."
          />
        </div>

        {/* ── 4 Options (A, B, C, D) ── */}
        <div className="p-3 flex flex-col gap-2">
          {options.map((opt, idx) => {
            const isCorrect = idx === correctIndex;
            const isUserChoice = idx === selectedOption;
            const pct = percentages[idx] ?? 25;

            let borderStyle = "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]";
            if (isRevealed && isCorrect) {
              borderStyle = "border-emerald-500 bg-emerald-500/20 shadow-md shadow-emerald-500/20";
            } else if (isUserChoice) {
              borderStyle = "border-sky-400 bg-sky-500/15";
            }

            return (
              <div
                key={idx}
                onClick={() => setSelectedOption(idx)}
                className={`
                  relative overflow-hidden rounded-xl border p-2
                  transition-all duration-200 cursor-pointer flex items-center justify-between gap-2.5
                  ${borderStyle}
                `}
              >
                {/* Result Percentage Bar (Revealed mode) */}
                {isRevealed && (
                  <div
                    className={`absolute inset-y-0 left-0 transition-all duration-700 ease-out opacity-25 ${
                      isCorrect ? "bg-emerald-400" : "bg-zinc-500"
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                )}

                <div className="flex items-center gap-2.5 relative z-10 flex-1">
                  {/* Option Badge */}
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setCorrectIndex(idx);
                    }}
                    title="Click badge to set as Correct Answer"
                    className={`
                      w-6 h-6 rounded-lg flex items-center justify-center font-mono font-bold text-xs shrink-0 transition-all
                      ${
                        isRevealed && isCorrect
                          ? "bg-emerald-500 text-white ring-2 ring-emerald-300"
                          : isCorrect
                          ? "bg-amber-400 text-zinc-950 font-black"
                          : "bg-white/10 text-zinc-300"
                      }
                    `}
                  >
                    {letters[idx]}
                  </span>

                  {/* Option Text Input */}
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const copy = [...options];
                      copy[idx] = e.target.value;
                      setOptions(copy);
                    }}
                    className="w-full bg-transparent outline-none text-xs font-medium text-zinc-200 placeholder:text-zinc-600"
                  />
                </div>

                {/* Right Status Badge */}
                <div className="flex items-center gap-2 relative z-10 shrink-0">
                  {isRevealed && (
                    <span className="font-mono text-xs font-bold text-zinc-300">
                      {pct}%
                    </span>
                  )}
                  {isRevealed && isCorrect && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Bottom Controls: Countdown Timer & Reveal ── */}
        <div className="p-3 bg-white/[0.03] border-t border-white/10 flex items-center justify-between gap-3">
          {/* Timer Section */}
          <div className="flex items-center gap-2">
            {/* Radial Countdown Indicator */}
            <div className="relative w-8 h-8 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  className="stroke-white/10"
                  strokeWidth="3"
                  fill="none"
                />
                <circle
                  cx="18"
                  cy="18"
                  r="15"
                  className={`transition-all duration-300 ${
                    timeLeft <= 5 ? "stroke-red-400" : "stroke-sky-400"
                  }`}
                  strokeWidth="3"
                  strokeDasharray={94.2}
                  strokeDashoffset={94.2 * (1 - timerProgress)}
                  strokeLinecap="round"
                  fill="none"
                />
              </svg>
              <span className="absolute font-mono text-[11px] font-bold text-zinc-100">
                {timeLeft}s
              </span>
            </div>

            {/* Play/Pause & Reset */}
            <button
              onClick={() => {
                if (isTimerRunning) setIsTimerRunning(false);
                else handleStartTimer();
              }}
              className="p-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 transition-all active:scale-90"
              title={isTimerRunning ? "Pause Timer" : "Start Poll Timer"}
            >
              {isTimerRunning ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>
            <button
              onClick={handleResetTimer}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-all active:scale-90"
              title="Reset Timer"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Quick Presets (15s, 30s, 60s) */}
          <div className="flex items-center gap-1">
            {[15, 30, 60].map((sec) => (
              <button
                key={sec}
                onClick={() => {
                  setTimerDuration(sec);
                  handleStartTimer(sec);
                }}
                className={`px-1.5 py-0.5 rounded-md text-[10px] font-mono transition-all ${
                  timerDuration === sec && isTimerRunning
                    ? "bg-sky-500 text-white font-bold"
                    : "bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white"
                }`}
              >
                {sec}s
              </button>
            ))}
          </div>

          {/* Reveal Correct Answer Button */}
          <button
            onClick={handleRevealAnswer}
            className={`
              px-3 py-1.5 rounded-xl font-bold text-xs transition-all active:scale-95 flex items-center gap-1.5 shadow-md
              ${
                isRevealed
                  ? "bg-emerald-500 text-white hover:bg-emerald-400"
                  : "bg-amber-400 hover:bg-amber-300 text-zinc-950"
              }
            `}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isRevealed ? "Answer Visible" : "Show Answer"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
