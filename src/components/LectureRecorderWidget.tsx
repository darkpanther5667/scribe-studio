import React from "react";
import { Play, Pause, Square } from "lucide-react";
import type { RecorderState } from "../utils/lectureRecorder";

interface LectureRecorderWidgetProps {
  state: RecorderState;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

export const LectureRecorderWidget: React.FC<LectureRecorderWidgetProps> = ({
  state,
  onPause,
  onResume,
  onStop,
}) => {
  if (!state.isRecording) return null;

  return (
    <div
      className="
        fixed top-16 right-5 z-50
        flex items-center gap-2.5 px-3 py-1.5
        rounded-2xl bg-zinc-950/95 backdrop-blur-2xl
        border border-rose-500/40 shadow-[0_10px_35px_rgba(244,63,94,0.3)]
        text-white select-none animate-in fade-in slide-in-from-top-2 duration-150
      "
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* Live recording indicator */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2.5 w-2.5">
          {!state.isPaused && (
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          )}
          <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${state.isPaused ? "bg-amber-400" : "bg-rose-500"}`}></span>
        </span>
        <span className="text-[11px] font-mono font-bold tracking-wider text-rose-300">
          {state.isPaused ? "PAUSED" : "REC"}
        </span>
      </div>

      <span className="font-mono text-xs font-semibold tabular-nums text-zinc-200">
        {formatTime(state.seconds)}
      </span>

      <div className="w-px h-4 bg-white/10 mx-0.5" />

      {/* Pause / Resume */}
      {state.isPaused ? (
        <button
          onClick={onResume}
          title="Resume Recording"
          className="p-1 rounded-lg text-emerald-300 hover:bg-emerald-500/20 transition-all active:scale-95"
        >
          <Play className="w-3.5 h-3.5" />
        </button>
      ) : (
        <button
          onClick={onPause}
          title="Pause Recording"
          className="p-1 rounded-lg text-amber-300 hover:bg-amber-500/20 transition-all active:scale-95"
        >
          <Pause className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Stop & Save */}
      <button
        onClick={onStop}
        title="Stop & Save Lecture Video"
        className="
          flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-bold
          bg-rose-500/25 hover:bg-rose-500/40 text-rose-200 border border-rose-400/30
          transition-all active:scale-95
        "
      >
        <Square className="w-3 h-3 fill-rose-300" />
        <span>Save</span>
      </button>
    </div>
  );
};
