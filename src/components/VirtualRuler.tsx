import React, { useRef } from "react";
import { Move, RotateCw, X, Magnet } from "lucide-react";

export interface RulerState {
  isActive: boolean;
  x: number; // screen center X
  y: number; // screen center Y
  angle: number; // in degrees
  length: number; // px length (e.g. 500px)
  height: number; // px height (e.g. 70px)
  snapEnabled: boolean;
}

interface VirtualRulerProps {
  rulerState: RulerState;
  onChange: (state: RulerState) => void;
  onClose: () => void;
}

export const VirtualRuler: React.FC<VirtualRulerProps> = ({ rulerState, onChange, onClose }) => {
  const isDraggingMove = useRef(false);
  const isDraggingRotate = useRef(false);
  const dragStart = useRef({ x: 0, y: 0, rulerX: 0, rulerY: 0, startAngle: 0 });

  if (!rulerState.isActive) return null;

  // Handle translation
  const handleMoveDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingMove.current = true;
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      rulerX: rulerState.x,
      rulerY: rulerState.y,
      startAngle: rulerState.angle,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleMoveMove = (e: React.PointerEvent) => {
    if (!isDraggingMove.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    onChange({
      ...rulerState,
      x: dragStart.current.rulerX + dx,
      y: dragStart.current.rulerY + dy,
    });
  };

  const handleMoveUp = (e: React.PointerEvent) => {
    if (!isDraggingMove.current) return;
    isDraggingMove.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Handle rotation
  const handleRotateDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    isDraggingRotate.current = true;
    const initialAngleToCenter = Math.atan2(e.clientY - rulerState.y, e.clientX - rulerState.x);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      rulerX: rulerState.x,
      rulerY: rulerState.y,
      startAngle: rulerState.angle - (initialAngleToCenter * 180) / Math.PI,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handleRotateMove = (e: React.PointerEvent) => {
    if (!isDraggingRotate.current) return;
    const angleToCenter = Math.atan2(e.clientY - rulerState.y, e.clientX - rulerState.x);
    let rawDeg = (angleToCenter * 180) / Math.PI + dragStart.current.startAngle;
    
    // Normalize to -180..180
    rawDeg = ((rawDeg + 180) % 360) - 180;

    // Angle snapping to 0, 30, 45, 60, 90, 120, 135, 150, 180
    const snapAngles = [0, 30, 45, 60, 90, 120, 135, 150, 180, -30, -45, -60, -90, -120, -135, -150];
    for (const snap of snapAngles) {
      if (Math.abs(rawDeg - snap) <= 3.5) {
        rawDeg = snap;
        break;
      }
    }

    onChange({
      ...rulerState,
      angle: Math.round(rawDeg),
    });
  };

  const handleRotateUp = (e: React.PointerEvent) => {
    if (!isDraggingRotate.current) return;
    isDraggingRotate.current = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const numTicks = Math.floor(rulerState.length / 20);

  return (
    <div
      style={{
        position: "fixed",
        left: `${rulerState.x}px`,
        top: `${rulerState.y}px`,
        width: `${rulerState.length}px`,
        height: `${rulerState.height}px`,
        transform: `translate(-50%, -50%) rotate(${rulerState.angle}deg)`,
        transformOrigin: "center center",
      }}
      className="z-40 pointer-events-auto select-none rounded-xl bg-sky-950/40 backdrop-blur-xl border-2 border-sky-400/40 shadow-[0_12px_36px_rgba(0,0,0,0.6)] flex flex-col justify-between overflow-hidden"
    >
      {/* Top Edge Tick Marks (Centimeters / Millimeters) */}
      <div className="w-full flex justify-between px-3 pt-1 border-b border-white/10 bg-white/[0.04]">
        {Array.from({ length: numTicks + 1 }).map((_, i) => {
          const isMajor = i % 5 === 0;
          const isSuperMajor = i % 10 === 0;
          return (
            <div key={i} className="flex flex-col items-center">
              <div
                className={`w-[1px] ${
                  isSuperMajor
                    ? "h-4 bg-sky-300"
                    : isMajor
                    ? "h-3 bg-white/60"
                    : "h-2 bg-white/30"
                }`}
              />
              {isMajor && (
                <span className="text-[8px] font-mono text-sky-200 mt-0.5">
                  {i / 5}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Middle Controls: Reposition, Angle readout & Rotator */}
      <div className="flex items-center justify-between px-4 py-1">
        {/* Move Handle */}
        <div
          onPointerDown={handleMoveDown}
          onPointerMove={handleMoveMove}
          onPointerUp={handleMoveUp}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold cursor-grab active:cursor-grabbing transition-colors"
          title="Drag to reposition ruler"
        >
          <Move className="w-3.5 h-3.5 text-sky-400" />
          <span>Ruler</span>
        </div>

        {/* Current Angle Readout */}
        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-sky-500/20 border border-sky-400/30 text-sky-200 font-mono text-[11px] font-bold">
          <span>{rulerState.angle}°</span>
        </div>

        {/* Action Buttons: Snap Magnet, Rotate dial, Close */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onChange({ ...rulerState, snapEnabled: !rulerState.snapEnabled })}
            title={rulerState.snapEnabled ? "Edge Snapping: ON" : "Edge Snapping: OFF"}
            className={`p-1.5 rounded-lg border transition-colors ${
              rulerState.snapEnabled
                ? "bg-sky-500/30 text-sky-300 border-sky-400/40"
                : "bg-white/5 text-zinc-400 border-transparent hover:text-white"
            }`}
          >
            <Magnet className="w-3.5 h-3.5" />
          </button>

          {/* Rotate Handle */}
          <div
            onPointerDown={handleRotateDown}
            onPointerMove={handleRotateMove}
            onPointerUp={handleRotateUp}
            className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white cursor-pointer active:scale-95 transition-all"
            title="Drag to rotate ruler angle"
          >
            <RotateCw className="w-3.5 h-3.5 text-sky-300" />
          </div>

          <button
            onClick={onClose}
            title="Close Ruler"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-300 hover:bg-rose-500/20 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Edge Tick Marks */}
      <div className="w-full flex justify-between px-3 pb-1 border-t border-white/10 bg-white/[0.04]">
        {Array.from({ length: numTicks + 1 }).map((_, i) => (
          <div
            key={i}
            className={`w-[1px] ${i % 5 === 0 ? "h-2.5 bg-sky-300/80" : "h-1.5 bg-white/25"}`}
          />
        ))}
      </div>
    </div>
  );
};
