import React, { useEffect, useRef, useState } from "react";
import katex from "katex";
import {
  Play,
  Pause,
  RotateCcw,
  Sliders,
  X,
  GripHorizontal,
} from "lucide-react";
import type {
  PhysicsSimulationItem,
  Camera,
  SimulationParams,
} from "../types/whiteboard";
import {
  SIMULATION_DEFINITIONS,
  renderWaveSimulation,
  renderPendulumSimulation,
  updatePendulumPhysics,
  renderRampSimulation,
  updateRampPhysics,
  renderSpringSimulation,
  renderOrbitSimulation,
  type PendulumState,
  type RampState,
} from "../utils/physicsSimulation";

interface PhysicsSimulationCardProps {
  item: PhysicsSimulationItem;
  camera: Camera;
  onUpdate: (updated: PhysicsSimulationItem) => void;
  onDelete: (id: string) => void;
}

export const PhysicsSimulationCard: React.FC<PhysicsSimulationCardProps> = ({
  item,
  camera,
  onUpdate,
  onDelete,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRunning, setIsRunning] = useState(item.isRunning);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [params, setParams] = useState<SimulationParams>(item.params);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const dragStartRef = useRef<{ clientX: number; clientY: number; itemX: number; itemY: number }>({
    clientX: 0,
    clientY: 0,
    itemX: item.x,
    itemY: item.y,
  });

  // Physical simulation internal states
  const timeRef = useRef<number>(0);
  const pendulumStateRef = useRef<PendulumState>({
    angle: params.angle ?? 0.65,
    angularVelocity: 0,
  });
  const rampStateRef = useRef<RampState>({
    progress: 0,
    speed: 0,
  });

  const meta = SIMULATION_DEFINITIONS[item.type];

  // Render KaTeX formula in header
  const formulaHtml = React.useMemo(() => {
    try {
      return katex.renderToString(meta.formulaLatex, {
        throwOnError: false,
        displayMode: false,
      });
    } catch {
      return meta.formulaLatex;
    }
  }, [meta.formulaLatex]);

  // Handle Dragging
  const handlePointerDownDrag = (e: React.PointerEvent) => {
    e.stopPropagation();
    setIsDragging(true);
    dragStartRef.current = {
      clientX: e.clientX,
      clientY: e.clientY,
      itemX: item.x,
      itemY: item.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMoveDrag = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = (e.clientX - dragStartRef.current.clientX) / camera.zoom;
    const dy = (e.clientY - dragStartRef.current.clientY) / camera.zoom;
    onUpdate({
      ...item,
      x: dragStartRef.current.itemX + dx,
      y: dragStartRef.current.itemY + dy,
    });
  };

  const handlePointerUpDrag = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  // Reset simulation state
  const handleReset = () => {
    timeRef.current = 0;
    pendulumStateRef.current = {
      angle: params.angle ?? 0.65,
      angularVelocity: 0,
    };
    rampStateRef.current = {
      progress: 0,
      speed: 0,
    };
  };

  // Parameter update helper
  const updateParam = <K extends keyof SimulationParams>(
    key: K,
    val: SimulationParams[K]
  ) => {
    const next = { ...params, [key]: val };
    setParams(next);
    onUpdate({ ...item, params: next });
  };

  // 60 FPS Canvas Animation Loop
  useEffect(() => {
    let animId: number;
    let lastTimestamp = performance.now();

    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - lastTimestamp) / 1000); // delta in seconds
      lastTimestamp = now;

      if (isRunning) {
        timeRef.current += dt;

        if (item.type === "pendulum") {
          pendulumStateRef.current = updatePendulumPhysics(
            pendulumStateRef.current,
            params,
            dt
          );
        } else if (item.type === "ramp") {
          rampStateRef.current = updateRampPhysics(
            rampStateRef.current,
            params,
            dt
          );
        }
      }

      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const w = canvas.width;
          const h = canvas.height;

          switch (item.type) {
            case "wave":
              renderWaveSimulation(ctx, w, h, params, timeRef.current);
              break;
            case "pendulum":
              renderPendulumSimulation(ctx, w, h, params, pendulumStateRef.current);
              break;
            case "ramp":
              renderRampSimulation(ctx, w, h, params, rampStateRef.current);
              break;
            case "spring":
              renderSpringSimulation(ctx, w, h, params, timeRef.current);
              break;
            case "orbit":
              renderOrbitSimulation(ctx, w, h, params, timeRef.current);
              break;
          }
        }
      }

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isRunning, item.type, params]);

  // Screen coordinates based on camera transform
  const screenX = item.x * camera.zoom + camera.x;
  const screenY = item.y * camera.zoom + camera.y;

  return (
    <div
      className="fixed z-30 select-none shadow-2xl rounded-2xl border border-cyan-500/30 backdrop-blur-2xl bg-zinc-950/90 overflow-hidden flex flex-col transition-shadow hover:shadow-cyan-500/20"
      style={{
        left: `${screenX}px`,
        top: `${screenY}px`,
        width: `${item.width}px`,
        transform: `scale(${camera.zoom})`,
        transformOrigin: "top left",
      }}
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* ── Top Header Bar with Drag Handle & KaTeX Formula ── */}
      <div
        onPointerDown={handlePointerDownDrag}
        onPointerMove={handlePointerMoveDrag}
        onPointerUp={handlePointerUpDrag}
        className="
          flex items-center justify-between px-3 py-2 bg-white/[0.04]
          border-b border-white/10 cursor-grab active:cursor-grabbing group
        "
      >
        <div className="flex items-center gap-2">
          <GripHorizontal className="w-3.5 h-3.5 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
          <span className="text-xs font-bold text-white tracking-wide">{item.title}</span>
        </div>

        {/* KaTeX formula badge */}
        <div
          className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-cyan-950/60 border border-cyan-500/30 text-[11px] text-cyan-300 font-mono"
          dangerouslySetInnerHTML={{ __html: formulaHtml }}
        />

        {/* Action buttons */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsRunning((r) => !r)}
            title={isRunning ? "Pause simulation" : "Play simulation"}
            className="p-1 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
          >
            {isRunning ? (
              <Pause className="w-3.5 h-3.5 text-amber-400" />
            ) : (
              <Play className="w-3.5 h-3.5 text-emerald-400" />
            )}
          </button>

          <button
            onClick={handleReset}
            title="Reset simulation time"
            className="p-1 rounded-lg hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsDrawerOpen((o) => !o)}
            title="Configure parameters"
            className={`p-1 rounded-lg transition-colors ${
              isDrawerOpen ? "bg-cyan-500/20 text-cyan-300" : "hover:bg-white/10 text-zinc-300"
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onDelete(item.id)}
            title="Remove simulation"
            className="p-1 rounded-lg hover:bg-red-500/20 text-zinc-400 hover:text-red-300 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── Real-Time 60 FPS Physics Simulation Canvas Viewport ── */}
      <div className="relative w-full bg-black/40 flex items-center justify-center">
        <canvas
          ref={canvasRef}
          width={item.width}
          height={item.height}
          className="w-full h-auto block"
        />
      </div>

      {/* ── Interactive Parameter Drawer ── */}
      {isDrawerOpen && (
        <div className="p-3 bg-zinc-900/95 border-t border-white/10 text-xs text-zinc-300 flex flex-col gap-2.5 max-h-56 overflow-y-auto">
          {/* Wave Controls */}
          {item.type === "wave" && (
            <>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-zinc-400">Mode</span>
                <div className="flex rounded-lg bg-white/5 p-0.5 border border-white/10">
                  <button
                    onClick={() => updateParam("waveType", "traveling")}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      params.waveType !== "standing"
                        ? "bg-cyan-500 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Traveling
                  </button>
                  <button
                    onClick={() => updateParam("waveType", "standing")}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      params.waveType === "standing"
                        ? "bg-cyan-500 text-white"
                        : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Standing
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">Amplitude (A):</span>
                <input
                  type="range"
                  min="15"
                  max="60"
                  value={params.amplitude ?? 38}
                  onChange={(e) => updateParam("amplitude", Number(e.target.value))}
                  className="w-32 accent-cyan-400"
                />
                <span className="font-mono text-cyan-400 text-[10px] w-8 text-right">
                  {params.amplitude}px
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">Frequency (f):</span>
                <input
                  type="range"
                  min="0.2"
                  max="3.0"
                  step="0.1"
                  value={params.frequency ?? 1.0}
                  onChange={(e) => updateParam("frequency", Number(e.target.value))}
                  className="w-32 accent-cyan-400"
                />
                <span className="font-mono text-cyan-400 text-[10px] w-8 text-right">
                  {params.frequency}Hz
                </span>
              </div>
            </>
          )}

          {/* Pendulum Controls */}
          {item.type === "pendulum" && (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">Gravity Preset:</span>
                <div className="flex gap-1">
                  {[
                    { label: "Moon (1.6)", val: 1.6 },
                    { label: "Earth (9.8)", val: 9.8 },
                    { label: "Jupiter (24.8)", val: 24.8 },
                  ].map((g) => (
                    <button
                      key={g.label}
                      onClick={() => updateParam("gravity", g.val)}
                      className={`px-1.5 py-0.5 rounded text-[9px] font-mono border ${
                        params.gravity === g.val
                          ? "bg-amber-500/30 border-amber-400 text-amber-300"
                          : "border-white/10 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">Length (L):</span>
                <input
                  type="range"
                  min="80"
                  max="200"
                  value={params.length ?? 150}
                  onChange={(e) => updateParam("length", Number(e.target.value))}
                  className="w-32 accent-amber-400"
                />
                <span className="font-mono text-amber-400 text-[10px] w-8 text-right">
                  {params.length}px
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-zinc-300">
                  <input
                    type="checkbox"
                    checked={params.showVectors ?? true}
                    onChange={(e) => updateParam("showVectors", e.target.checked)}
                    className="accent-emerald-400 rounded"
                  />
                  <span>Show Vectors (v, T)</span>
                </label>

                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-zinc-300">
                  <input
                    type="checkbox"
                    checked={params.showEnergy ?? true}
                    onChange={(e) => updateParam("showEnergy", e.target.checked)}
                    className="accent-amber-400 rounded"
                  />
                  <span>Energy Bars (Ek/Ep)</span>
                </label>
              </div>
            </>
          )}

          {/* Ramp Controls */}
          {item.type === "ramp" && (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">Ramp Angle (θ):</span>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={params.rampAngle ?? 30}
                  onChange={(e) => updateParam("rampAngle", Number(e.target.value))}
                  className="w-32 accent-cyan-400"
                />
                <span className="font-mono text-cyan-400 text-[10px] w-8 text-right">
                  {params.rampAngle}°
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">Friction Coeff (μ):</span>
                <input
                  type="range"
                  min="0.0"
                  max="0.6"
                  step="0.05"
                  value={params.friction ?? 0.22}
                  onChange={(e) => updateParam("friction", Number(e.target.value))}
                  className="w-32 accent-amber-400"
                />
                <span className="font-mono text-amber-400 text-[10px] w-8 text-right">
                  {params.friction}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-zinc-300">
                  <input
                    type="checkbox"
                    checked={params.showForces ?? true}
                    onChange={(e) => updateParam("showForces", e.target.checked)}
                    className="accent-rose-400 rounded"
                  />
                  <span>Decompose Forces (N, mg, fk)</span>
                </label>
              </div>
            </>
          )}

          {/* Spring Controls */}
          {item.type === "spring" && (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">Spring Constant (k):</span>
                <input
                  type="range"
                  min="10"
                  max="60"
                  value={params.springK ?? 25}
                  onChange={(e) => updateParam("springK", Number(e.target.value))}
                  className="w-32 accent-purple-400"
                />
                <span className="font-mono text-purple-400 text-[10px] w-8 text-right">
                  {params.springK}N/m
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">Mass (m):</span>
                <input
                  type="range"
                  min="0.5"
                  max="5.0"
                  step="0.5"
                  value={params.mass ?? 2.0}
                  onChange={(e) => updateParam("mass", Number(e.target.value))}
                  className="w-32 accent-cyan-400"
                />
                <span className="font-mono text-cyan-400 text-[10px] w-8 text-right">
                  {params.mass}kg
                </span>
              </div>
            </>
          )}

          {/* Orbit Controls */}
          {item.type === "orbit" && (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">Eccentricity (e):</span>
                <input
                  type="range"
                  min="0.05"
                  max="0.75"
                  step="0.05"
                  value={params.eccentricity ?? 0.45}
                  onChange={(e) => updateParam("eccentricity", Number(e.target.value))}
                  className="w-32 accent-cyan-400"
                />
                <span className="font-mono text-cyan-400 text-[10px] w-8 text-right">
                  {params.eccentricity}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] text-zinc-400">Orbit Speed:</span>
                <input
                  type="range"
                  min="0.2"
                  max="2.5"
                  step="0.1"
                  value={params.orbitSpeed ?? 1.0}
                  onChange={(e) => updateParam("orbitSpeed", Number(e.target.value))}
                  className="w-32 accent-emerald-400"
                />
                <span className="font-mono text-emerald-400 text-[10px] w-8 text-right">
                  {params.orbitSpeed}x
                </span>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
