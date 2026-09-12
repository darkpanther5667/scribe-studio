import type { SimType, PhysicsSimulationItem, SimulationParams } from "../types/whiteboard";

export interface SimulationMetadata {
  type: SimType;
  title: string;
  category: string;
  formulaLatex: string;
  description: string;
  defaultWidth: number;
  defaultHeight: number;
  defaultParams: SimulationParams;
}

export const SIMULATION_DEFINITIONS: Record<SimType, SimulationMetadata> = {
  wave: {
    type: "wave",
    title: "Wave Oscillator",
    category: "Oscillations & Optics",
    formulaLatex: "y(x, t) = A \\sin(kx - \\omega t)",
    description: "Transverse traveling wave & standing wave with interactive nodes & antinodes.",
    defaultWidth: 460,
    defaultHeight: 300,
    defaultParams: {
      amplitude: 38,
      frequency: 1.0,
      wavelength: 180,
      waveType: "traveling",
    },
  },
  pendulum: {
    type: "pendulum",
    title: "Harmonic Pendulum",
    category: "Classical Mechanics",
    formulaLatex: "\\theta''(t) + \\frac{g}{L}\\sin\\theta = 0",
    description: "Real-time gravity swing with velocity vector, tension force, and energy conservation.",
    defaultWidth: 440,
    defaultHeight: 340,
    defaultParams: {
      length: 150,
      gravity: 9.8,
      damping: 0.006,
      angle: 0.65,
      showVectors: true,
      showEnergy: true,
    },
  },
  ramp: {
    type: "ramp",
    title: "Inclined Plane & Forces",
    category: "Newtonian Dynamics",
    formulaLatex: "F_{\\parallel} = mg(\\sin\\theta - \\mu\\cos\\theta)",
    description: "Sliding block with real-time vector decomposition: normal force, gravity, and friction.",
    defaultWidth: 460,
    defaultHeight: 320,
    defaultParams: {
      rampAngle: 30,
      friction: 0.22,
      blockMass: 2.5,
      showForces: true,
    },
  },
  spring: {
    type: "spring",
    title: "Spring-Mass Oscillator",
    category: "Simple Harmonic Motion",
    formulaLatex: "m x''(t) + c x'(t) + k x(t) = 0",
    description: "Coiled spring with Hooke's restoring force and kinetic/potential energy oscillation.",
    defaultWidth: 440,
    defaultHeight: 280,
    defaultParams: {
      springK: 25,
      mass: 2.0,
    },
  },
  orbit: {
    type: "orbit",
    title: "Keplerian Planetary Orbit",
    category: "Astrophysics & Gravity",
    formulaLatex: "F_g = \\frac{G M m}{r^2}",
    description: "Elliptical planetary orbit with Kepler's 2nd law speedup at perihelion.",
    defaultWidth: 440,
    defaultHeight: 320,
    defaultParams: {
      eccentricity: 0.45,
      orbitSpeed: 1.0,
    },
  },
  custom_equation: {
    type: "custom_equation",
    title: "Math-to-Life Live Equation",
    category: "Universal Calculus & Physics",
    formulaLatex: "y(x, t) = A \\sin(B x - C t)",
    description: "Universal mathematical expression brought to life with animated wave dynamics, particle tracing, and derivative tangent vectors.",
    defaultWidth: 480,
    defaultHeight: 330,
    defaultParams: {
      equationStr: "A * sin(B * x - C * t)",
      equationLatex: "y(x, t) = A \\sin(B x - C t)",
      varA: 42,
      varB: 0.04,
      varC: 2.5,
      varD: 0.0,
      varAName: "Amplitude (A)",
      varBName: "Wavenumber (k / B)",
      varCName: "Angular Speed (ω / C)",
      varDName: "Decay / Damping (D)",
      xRange: 400,
      yScale: 1.0,
      speed: 1.0,
      showDerivative: true,
      showParticle: true,
    },
  },
};

export function createPhysicsSimulation(
  type: SimType,
  x: number,
  y: number,
  customParams?: Partial<SimulationParams>,
  customTitle?: string
): PhysicsSimulationItem {
  const meta = SIMULATION_DEFINITIONS[type];
  return {
    id: crypto.randomUUID(),
    type,
    x: x - meta.defaultWidth / 2,
    y: y - meta.defaultHeight / 2,
    width: meta.defaultWidth,
    height: meta.defaultHeight,
    title: customTitle || meta.title,
    isRunning: true,
    params: {
      ...meta.defaultParams,
      ...(customParams || {}),
    },
  };
}

// ── Vector Arrow Canvas Drawing Helper ─────────────────────────────────────────
export function drawVectorArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  label?: string
): void {
  const headLen = 9;
  const dx = toX - fromX;
  const dy = toY - fromY;
  const angle = Math.atan2(dy, dx);
  const length = Math.hypot(dx, dy);
  if (length < 4) return;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";

  // Shaft
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Arrowhead
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLen * Math.cos(angle - Math.PI / 6),
    toY - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headLen * Math.cos(angle + Math.PI / 6),
    toY - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();

  // Label
  if (label) {
    ctx.font = "bold 11px ui-monospace, SFMono-Regular, monospace";
    ctx.fillStyle = color;
    const labelX = toX + 8 * Math.cos(angle - Math.PI / 4);
    const labelY = toY + 8 * Math.sin(angle - Math.PI / 4);
    ctx.fillText(label, labelX, labelY);
  }
  ctx.restore();
}

// ── 1. Wave Simulation Renderer ───────────────────────────────────────────────
export function renderWaveSimulation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  params: SimulationParams,
  time: number
): void {
  ctx.clearRect(0, 0, w, h);

  const amp = params.amplitude ?? 38;
  const freq = params.frequency ?? 1.0;
  const lambda = params.wavelength ?? 180;
  const isStanding = params.waveType === "standing";

  const midY = h / 2;
  const k = (2 * Math.PI) / lambda;
  const omega = 2 * Math.PI * freq;

  // Background grid lines
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(w, midY);
  ctx.stroke();

  // Draw Amplitude boundary envelopes
  ctx.strokeStyle = "rgba(56, 189, 248, 0.15)";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(0, midY - amp);
  ctx.lineTo(w, midY - amp);
  ctx.moveTo(0, midY + amp);
  ctx.lineTo(w, midY + amp);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Draw Animated Wave Line with Neon Cyan Glow
  ctx.save();
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 10;
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.8;
  ctx.beginPath();

  for (let x = 0; x <= w; x += 3) {
    let y = 0;
    if (isStanding) {
      // Standing wave: y = 2A * sin(kx) * cos(omega * t)
      y = 2 * amp * Math.sin(k * x) * Math.cos(omega * time);
    } else {
      // Traveling wave: y = A * sin(kx - omega * t)
      y = amp * Math.sin(k * x - omega * time);
    }
    const plotY = midY - y;
    if (x === 0) ctx.moveTo(x, plotY);
    else ctx.lineTo(x, plotY);
  }
  ctx.stroke();
  ctx.restore();

  // Draw oscillating particle tracers along the wave
  const tracerPositions = [w * 0.2, w * 0.4, w * 0.6, w * 0.8];
  for (const tx of tracerPositions) {
    let ty = 0;
    if (isStanding) {
      ty = 2 * amp * Math.sin(k * tx) * Math.cos(omega * time);
    } else {
      ty = amp * Math.sin(k * tx - omega * time);
    }
    const py = midY - ty;

    // Tracer ball
    ctx.save();
    ctx.beginPath();
    ctx.arc(tx, py, 4.5, 0, Math.PI * 2);
    ctx.fillStyle = "#f59e0b";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 8;
    ctx.fill();

    // Particle displacement line
    ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
    ctx.lineWidth = 1.2;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(tx, midY);
    ctx.lineTo(tx, py);
    ctx.stroke();
    ctx.restore();
  }

  // If standing wave, draw Node & Antinode markers
  if (isStanding) {
    ctx.save();
    ctx.font = "bold 10px monospace";
    ctx.fillStyle = "#34d399";
    for (let n = 0; n * (lambda / 2) <= w; n++) {
      const nodeX = n * (lambda / 2);
      ctx.beginPath();
      ctx.arc(nodeX, midY, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillText(`N${n}`, nodeX - 6, midY + 16);
    }
    ctx.restore();
  }
}

// ── 2. Pendulum Simulation Renderer ───────────────────────────────────────────
export interface PendulumState {
  angle: number;
  angularVelocity: number;
}

export function updatePendulumPhysics(
  state: PendulumState,
  params: SimulationParams,
  dt: number
): PendulumState {
  const g = params.gravity ?? 9.8;
  const L = (params.length ?? 150) / 100; // convert to scale meters
  const damping = params.damping ?? 0.006;

  // Runge-Kutta 4th order numerical integration of theta'' = -(g/L)sin(theta) - damping*theta'
  const accel = (th: number, w: number) => -(g / L) * Math.sin(th) - damping * w * 4;

  const k1_w = accel(state.angle, state.angularVelocity);
  const k1_th = state.angularVelocity;

  const k2_w = accel(state.angle + 0.5 * dt * k1_th, state.angularVelocity + 0.5 * dt * k1_w);
  const k2_th = state.angularVelocity + 0.5 * dt * k1_w;

  const k3_w = accel(state.angle + 0.5 * dt * k2_th, state.angularVelocity + 0.5 * dt * k2_w);
  const k3_th = state.angularVelocity + 0.5 * dt * k2_w;

  const k4_w = accel(state.angle + dt * k3_th, state.angularVelocity + dt * k3_w);
  const k4_th = state.angularVelocity + dt * k3_w;

  const nextAngle = state.angle + (dt / 6) * (k1_th + 2 * k2_th + 2 * k3_th + k4_th);
  const nextVelocity = state.angularVelocity + (dt / 6) * (k1_w + 2 * k2_w + 2 * k3_w + k4_w);

  return { angle: nextAngle, angularVelocity: nextVelocity };
}

export function renderPendulumSimulation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  params: SimulationParams,
  state: PendulumState
): void {
  ctx.clearRect(0, 0, w, h);

  const L = params.length ?? 150;
  const pivotX = w / 2;
  const pivotY = 32;

  const bobX = pivotX + L * Math.sin(state.angle);
  const bobY = pivotY + L * Math.cos(state.angle);

  // Ceiling Pivot Mount
  ctx.save();
  ctx.fillStyle = "#52525b";
  ctx.fillRect(pivotX - 35, pivotY - 6, 70, 6);
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 4.5, 0, Math.PI * 2);
  ctx.fillStyle = "#38bdf8";
  ctx.fill();

  // Equilibrium reference dashed line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.setLineDash([3, 3]);
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(pivotX, pivotY + L + 20);
  ctx.stroke();

  // Angle arc
  ctx.beginPath();
  ctx.arc(pivotX, pivotY, 30, Math.PI / 2, Math.PI / 2 + state.angle, state.angle < 0);
  ctx.strokeStyle = "#38bdf8";
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Pendulum Rod / String
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.moveTo(pivotX, pivotY);
  ctx.lineTo(bobX, bobY);
  ctx.stroke();

  // Bob Shadow & Glow
  ctx.shadowColor = "#f59e0b";
  ctx.shadowBlur = 14;
  ctx.beginPath();
  ctx.arc(bobX, bobY, 15, 0, Math.PI * 2);
  ctx.fillStyle = "#f59e0b";
  ctx.fill();
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();

  // Vector overlays: Velocity Vector (tangential) and Tension Vector
  if (params.showVectors) {
    const vScale = 16;
    const vx = state.angularVelocity * L * Math.cos(state.angle) * (vScale / 100);
    const vy = -state.angularVelocity * L * Math.sin(state.angle) * (vScale / 100);
    drawVectorArrow(ctx, bobX, bobY, bobX + vx, bobY + vy, "#10b981", "v");

    // Tension vector along the string toward pivot
    const tLen = 38;
    const tx = -Math.sin(state.angle) * tLen;
    const ty = -Math.cos(state.angle) * tLen;
    drawVectorArrow(ctx, bobX, bobY, bobX + tx, bobY + ty, "#38bdf8", "T");
  }

  // Energy conservation bars (Kinetic Ek vs Potential Ep)
  if (params.showEnergy) {
    const maxH = 1 - Math.cos(params.angle ?? 0.65);
    const curH = Math.max(0, 1 - Math.cos(state.angle));
    const EpRatio = maxH > 0 ? curH / Math.max(0.01, maxH) : 0;
    const EkRatio = Math.max(0, 1 - EpRatio);

    const barW = 8;
    const barMaxH = 50;
    const barX = w - 34;
    const barY = h - 25;

    ctx.save();
    ctx.font = "bold 9px monospace";
    // Ep (amber)
    ctx.fillStyle = "#f59e0b";
    ctx.fillRect(barX, barY - EpRatio * barMaxH, barW, EpRatio * barMaxH);
    ctx.fillText("Ep", barX - 2, barY + 12);

    // Ek (emerald)
    ctx.fillStyle = "#10b981";
    ctx.fillRect(barX + 14, barY - EkRatio * barMaxH, barW, EkRatio * barMaxH);
    ctx.fillText("Ek", barX + 12, barY + 12);
    ctx.restore();
  }
}

// ── 3. Inclined Plane / Ramp Simulation Renderer ──────────────────────────────
export interface RampState {
  progress: number; // 0 (top) to 1 (bottom)
  speed: number;
}

export function updateRampPhysics(
  state: RampState,
  params: SimulationParams,
  dt: number
): RampState {
  const thetaRad = ((params.rampAngle ?? 30) * Math.PI) / 180;
  const mu = params.friction ?? 0.22;
  const g = 9.8;

  // a = g * (sin(theta) - mu * cos(theta))
  const netAccel = g * (Math.sin(thetaRad) - mu * Math.cos(thetaRad));

  if (netAccel <= 0) {
    // Static friction holds the block stationary
    return { progress: state.progress, speed: 0 };
  }

  // Scale acceleration to visual progress units
  const visualAccel = netAccel * 0.12;
  let nextSpeed = state.speed + visualAccel * dt;
  let nextProgress = state.progress + nextSpeed * dt;

  // Loop/reset when reaching the bottom of the ramp
  if (nextProgress >= 1.0) {
    nextProgress = 0;
    nextSpeed = 0;
  }

  return { progress: nextProgress, speed: nextSpeed };
}

export function renderRampSimulation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  params: SimulationParams,
  state: RampState
): void {
  ctx.clearRect(0, 0, w, h);

  const thetaDeg = params.rampAngle ?? 30;
  const thetaRad = (thetaDeg * Math.PI) / 180;

  const rampBaseX = 40;
  const rampBottomY = h - 45;
  const rampLen = w - 100;

  const rampEndX = rampBaseX + rampLen * Math.cos(thetaRad);
  const rampTopX = rampBaseX;
  const rampTopY = rampBottomY - rampLen * Math.sin(thetaRad);

  // Draw Wedge (Ramp)
  ctx.save();
  ctx.fillStyle = "rgba(56, 189, 248, 0.08)";
  ctx.strokeStyle = "#38bdf8";
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(rampTopX, rampTopY);
  ctx.lineTo(rampEndX, rampBottomY);
  ctx.lineTo(rampTopX, rampBottomY);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // Angle arc at bottom
  ctx.beginPath();
  ctx.arc(rampEndX, rampBottomY, 35, Math.PI, Math.PI - thetaRad, true);
  ctx.strokeStyle = "#f59e0b";
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.font = "bold 11px monospace";
  ctx.fillStyle = "#f59e0b";
  ctx.fillText(`${Math.round(thetaDeg)}°`, rampEndX - 52, rampBottomY - 8);
  ctx.restore();

  // Block Position along incline
  const blockDist = state.progress * (rampLen - 40);
  const curX = rampTopX + blockDist * Math.cos(thetaRad);
  const curY = rampTopY + blockDist * Math.sin(thetaRad);

  const blockW = 34;
  const blockH = 22;

  // Draw Block (rotated to match slope)
  ctx.save();
  ctx.translate(curX, curY);
  ctx.rotate(thetaRad);

  ctx.fillStyle = "#f59e0b";
  ctx.strokeStyle = "#fbbf24";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#f59e0b";
  ctx.shadowBlur = 10;
  ctx.fillRect(0, -blockH, blockW, blockH);
  ctx.strokeRect(0, -blockH, blockW, blockH);

  // Mass label on block
  ctx.font = "bold 10px monospace";
  ctx.fillStyle = "#18181b";
  ctx.fillText(`${params.blockMass ?? 2.5}kg`, 6, -6);
  ctx.restore();

  // Draw Force Vectors from block center of mass
  if (params.showForces) {
    const cmX = curX + (blockW / 2) * Math.cos(thetaRad) + (blockH / 2) * Math.sin(thetaRad);
    const cmY = curY + (blockW / 2) * Math.sin(thetaRad) - (blockH / 2) * Math.cos(thetaRad);

    // Gravity: mg straight down
    drawVectorArrow(ctx, cmX, cmY, cmX, cmY + 44, "#ef4444", "mg");

    // Normal Force: N perpendicular to incline
    const normLen = 38 * Math.cos(thetaRad);
    const nx = -Math.sin(thetaRad) * normLen;
    const ny = -Math.cos(thetaRad) * normLen;
    drawVectorArrow(ctx, cmX, cmY, cmX + nx, cmY + ny, "#38bdf8", "N");

    // Friction: fk uphill along incline
    const fLen = 28 * (params.friction ?? 0.22);
    const fx = -Math.cos(thetaRad) * fLen;
    const fy = -Math.sin(thetaRad) * fLen;
    drawVectorArrow(ctx, cmX, cmY, cmX + fx, cmY + fy, "#eab308", "fk");
  }
}

// ── 4. Spring-Mass Harmonic Oscillator Renderer ───────────────────────────────
export function renderSpringSimulation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  params: SimulationParams,
  time: number
): void {
  ctx.clearRect(0, 0, w, h);

  const k = params.springK ?? 25;
  const m = params.mass ?? 2.0;
  const omega = Math.sqrt(k / m);
  const amplitude = 55;

  const midY = h / 2;
  const wallX = 35;
  const eqX = w / 2 + 10;

  // Displacement x(t) = A * cos(omega * t)
  const displacement = amplitude * Math.cos(omega * time);
  const blockX = eqX + displacement;
  const blockW = 40;
  const blockH = 34;

  // Fixed Wall Mount
  ctx.save();
  ctx.fillStyle = "#52525b";
  ctx.fillRect(wallX - 8, midY - 35, 8, 70);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
  for (let y = midY - 30; y <= midY + 30; y += 8) {
    ctx.beginPath();
    ctx.moveTo(wallX - 8, y);
    ctx.lineTo(wallX - 16, y + 8);
    ctx.stroke();
  }

  // Equilibrium reference dashed line
  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(eqX + blockW / 2, midY - 45);
  ctx.lineTo(eqX + blockW / 2, midY + 45);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.font = "9px monospace";
  ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
  ctx.fillText("x = 0", eqX + blockW / 2 - 12, midY + 58);
  ctx.restore();

  // Coiled Spring Graphic (N zig-zags)
  ctx.save();
  ctx.strokeStyle = "#a855f7";
  ctx.shadowColor = "#a855f7";
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(wallX, midY);

  const coils = 12;
  const springLen = blockX - wallX;
  const step = springLen / coils;
  for (let i = 1; i < coils; i++) {
    const sx = wallX + i * step;
    const sy = midY + (i % 2 === 0 ? 14 : -14);
    ctx.lineTo(sx, sy);
  }
  ctx.lineTo(blockX, midY);
  ctx.stroke();
  ctx.restore();

  // Mass Block
  ctx.save();
  ctx.fillStyle = "#06b6d4";
  ctx.strokeStyle = "#22d3ee";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#06b6d4";
  ctx.shadowBlur = 10;
  ctx.fillRect(blockX, midY - blockH / 2, blockW, blockH);
  ctx.strokeRect(blockX, midY - blockH / 2, blockW, blockH);

  // Label
  ctx.font = "bold 11px monospace";
  ctx.fillStyle = "#18181b";
  ctx.fillText(`${m}kg`, blockX + 8, midY + 4);
  ctx.restore();

  // Restoring Force Vector Fs = -k*x
  if (Math.abs(displacement) > 3) {
    const forceLen = -(displacement / amplitude) * 36;
    drawVectorArrow(
      ctx,
      blockX + blockW / 2,
      midY - blockH / 2 - 8,
      blockX + blockW / 2 + forceLen,
      midY - blockH / 2 - 8,
      "#f43f5e",
      "Fs"
    );
  }
}

// ── 5. Kepler Planetary Orbit Simulation Renderer ─────────────────────────────
export function renderOrbitSimulation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  params: SimulationParams,
  time: number
): void {
  ctx.clearRect(0, 0, w, h);

  const e = Math.min(0.75, Math.max(0.05, params.eccentricity ?? 0.45));
  const a = 140; // semi-major axis
  const b = a * Math.sqrt(1 - e * e); // semi-minor axis
  const c = a * e; // focal distance

  const centerX = w / 2;
  const centerY = h / 2;
  const starX = centerX - c; // star at one focus
  const starY = centerY;

  // Draw Elliptical Orbit Track
  ctx.save();
  ctx.strokeStyle = "rgba(56, 189, 248, 0.25)";
  ctx.lineWidth = 1.5;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, a, b, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();

  // Planet True Anomaly (Kepler's speedup at perihelion)
  const speed = params.orbitSpeed ?? 1.0;
  // Approximate eccentric anomaly integration
  const meanAnomaly = (time * speed * 1.2) % (Math.PI * 2);
  // 1st order approximation: theta ~ M + 2e*sin(M)
  const theta = meanAnomaly + 2 * e * Math.sin(meanAnomaly);

  // Position from focus: r = a(1 - e^2) / (1 + e*cos(theta))
  const r = (a * (1 - e * e)) / (1 + e * Math.cos(theta));
  const planetX = starX + r * Math.cos(theta);
  const planetY = starY + r * Math.sin(theta);

  // Central Star (Glowing Sun)
  ctx.save();
  ctx.beginPath();
  ctx.arc(starX, starY, 14, 0, Math.PI * 2);
  ctx.fillStyle = "#f59e0b";
  ctx.shadowColor = "#fbbf24";
  ctx.shadowBlur = 18;
  ctx.fill();
  ctx.restore();

  // Orbiting Planet (Sapphire)
  ctx.save();
  ctx.beginPath();
  ctx.arc(planetX, planetY, 7, 0, Math.PI * 2);
  ctx.fillStyle = "#38bdf8";
  ctx.shadowColor = "#38bdf8";
  ctx.shadowBlur = 10;
  ctx.fill();

  // Velocity vector tangent to orbit
  const vLen = 22 * (1 + e * Math.cos(theta)); // faster near perihelion
  const vx = -Math.sin(theta) * vLen;
  const vy = Math.cos(theta) * vLen;
  drawVectorArrow(ctx, planetX, planetY, planetX + vx, planetY + vy, "#10b981", "v");
  ctx.restore();
}

// ── Universal Safe Equation Compiler & Evaluator ──────────────────────────────
export type EquationFn = (
  x: number,
  t: number,
  A: number,
  B: number,
  C: number,
  D: number
) => number;

const equationCache = new Map<string, EquationFn>();

export function compileEquation(expr: string): EquationFn {
  if (!expr || typeof expr !== "string" || !expr.trim()) {
    return () => 0;
  }

  const cached = equationCache.get(expr);
  if (cached) return cached;

  try {
    let clean = expr.trim();

    // Strip common prefixes: "y =", "y(x,t) =", "f(x) =", "f(x, t) ="
    clean = clean.replace(/^[yfz](\([a-zA-Z0-9,\s]*\))?\s*=\s*/i, "");

    // LaTeX command replacements
    clean = clean
      .replace(/\\sin\b/g, "Math.sin")
      .replace(/\\cos\b/g, "Math.cos")
      .replace(/\\tan\b/g, "Math.tan")
      .replace(/\\asin\b|\\arcsin\b/g, "Math.asin")
      .replace(/\\acos\b|\\arccos\b/g, "Math.acos")
      .replace(/\\atan\b|\\arctan\b/g, "Math.atan")
      .replace(/\\sinh\b/g, "Math.sinh")
      .replace(/\\cosh\b/g, "Math.cosh")
      .replace(/\\tanh\b/g, "Math.tanh")
      .replace(/\\sqrt\{([^}]+)\}/g, "Math.sqrt($1)")
      .replace(/\\sqrt\b/g, "Math.sqrt")
      .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "(($1)/($2))")
      .replace(/\\exp\{([^}]+)\}/g, "Math.exp($1)")
      .replace(/\\exp\b/g, "Math.exp")
      .replace(/\\ln\{([^}]+)\}/g, "Math.log($1)")
      .replace(/\\ln\b/g, "Math.log")
      .replace(/\\log\{([^}]+)\}/g, "Math.log10($1)")
      .replace(/\\log\b/g, "Math.log10")
      .replace(/\\abs\{([^}]+)\}/g, "Math.abs($1)")
      .replace(/\\pi\b/g, "Math.PI")
      .replace(/\\omega\b/g, "C")
      .replace(/\\theta\b/g, "x")
      .replace(/\\cdot/g, "*")
      .replace(/\\times/g, "*");

    // Replace standard math function names if not prefixed with Math.
    const mathFuncs = [
      "sin", "cos", "tan", "asin", "acos", "atan",
      "sinh", "cosh", "tanh", "exp", "log", "sqrt", "abs",
      "floor", "ceil", "round"
    ];
    for (const fn of mathFuncs) {
      const regex = new RegExp(`(?<!Math\\.)\\b${fn}\\b`, "g");
      clean = clean.replace(regex, `Math.${fn}`);
    }

    clean = clean.replace(/(?<!Math\.)\bPI\b/g, "Math.PI");
    clean = clean.replace(/(?<!Math\.)\bpi\b/g, "Math.PI");

    // Power operator ^ to **
    clean = clean.replace(/\^/g, "**");

    // Replace curly brackets
    clean = clean.replace(/\{/g, "(").replace(/\}/g, ")");

    // Handle implicit multiplication (e.g. 2x -> 2*x, A sin -> A*sin)
    clean = clean.replace(/(\d+)\s*([a-zA-Z(])/g, "$1*$2");
    clean = clean.replace(/([a-zA-Z])\s+(Math\.[a-zA-Z]+|\()/g, "$1*$2");
    clean = clean.replace(/\)\s*([a-zA-Z0-9(])/g, ")*$1");

    // Construct evaluator function
    const fn = new Function(
      "x",
      "t",
      "A",
      "B",
      "C",
      "D",
      `try {
        const val = ${clean};
        return (typeof val === 'number' && Number.isFinite(val)) ? val : 0;
      } catch (e) {
        return 0;
      }`
    ) as EquationFn;

    // Test with sample inputs
    fn(1, 0, 1, 1, 1, 0);

    equationCache.set(expr, fn);
    return fn;
  } catch {
    const fallback: EquationFn = (x, t, A, B, C) => A * Math.sin(B * x - C * t);
    equationCache.set(expr, fallback);
    return fallback;
  }
}

// ── Universal Equation Simulation Renderer ────────────────────────────────────
export function renderCustomEquationSimulation(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  params: SimulationParams,
  time: number
): void {
  ctx.clearRect(0, 0, w, h);

  const rawExpr = params.equationStr || "A * sin(B * x - C * t)";
  const fn = compileEquation(rawExpr);

  const speed = params.speed ?? 1.0;
  const t = time * speed;
  const A = params.varA ?? 42;
  const B = params.varB ?? 0.04;
  const C = params.varC ?? 2.5;
  const D = params.varD ?? 0.0;
  const yScale = params.yScale ?? 1.0;

  const originX = 36;
  const originY = h / 2;

  // 1. Grid & Axes
  ctx.save();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.06)";
  ctx.lineWidth = 1;
  const gridSize = 40;

  // Vertical grid lines
  for (let gx = originX % gridSize; gx < w; gx += gridSize) {
    ctx.beginPath();
    ctx.moveTo(gx, 0);
    ctx.lineTo(gx, h);
    ctx.stroke();
  }
  // Horizontal grid lines
  for (let gy = originY % gridSize; gy < h; gy += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
  }

  // X Axis
  ctx.strokeStyle = "rgba(148, 163, 184, 0.4)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(0, originY);
  ctx.lineTo(w, originY);
  ctx.stroke();

  // Y Axis
  ctx.beginPath();
  ctx.moveTo(originX, 0);
  ctx.lineTo(originX, h);
  ctx.stroke();

  // Axis labels
  ctx.fillStyle = "rgba(148, 163, 184, 0.7)";
  ctx.font = "10px monospace";
  ctx.fillText("x", w - 14, originY - 6);
  ctx.fillText("y", originX + 6, 14);
  ctx.restore();

  // 2. Sample Points & Draw Area Fill
  const step = 2;
  const points: { px: number; py: number; x: number; y: number }[] = [];

  for (let px = originX; px <= w; px += step) {
    const xVal = px - originX;
    let yVal = 0;
    try {
      yVal = fn(xVal, t, A, B, C, D) * yScale;
    } catch {
      yVal = 0;
    }

    if (!Number.isFinite(yVal)) yVal = 0;
    // Clamp to canvas height limits to prevent canvas context distortion
    const clampedY = Math.max(-h, Math.min(h * 2, yVal));
    const py = originY - clampedY;
    points.push({ px, py, x: xVal, y: yVal });
  }

  if (points.length > 1) {
    // Shaded Area Under Curve
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(originX, originY);
    for (const pt of points) {
      ctx.lineTo(pt.px, pt.py);
    }
    ctx.lineTo(w, originY);
    ctx.closePath();
    const areaGrad = ctx.createLinearGradient(0, originY - 60, 0, originY + 60);
    areaGrad.addColorStop(0, "rgba(56, 189, 248, 0.15)");
    areaGrad.addColorStop(0.5, "rgba(56, 189, 248, 0.05)");
    areaGrad.addColorStop(1, "rgba(56, 189, 248, 0.15)");
    ctx.fillStyle = areaGrad;
    ctx.fill();
    ctx.restore();

    // Curve Path
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(points[0].px, points[0].py);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].px, points[i].py);
    }
    ctx.strokeStyle = "#38bdf8";
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.shadowColor = "rgba(56, 189, 248, 0.8)";
    ctx.shadowBlur = 10;
    ctx.stroke();
    ctx.restore();
  }

  // 3. Particle Tracker & Tangent Vector
  const tracerX = originX + Math.min(180, (w - originX) * 0.45);
  const tracerPt = points.find((p) => Math.abs(p.px - tracerX) < step) || points[Math.floor(points.length / 2)];

  if (tracerPt && (params.showParticle ?? true)) {
    // Tracer point glow
    ctx.save();
    ctx.beginPath();
    ctx.arc(tracerPt.px, tracerPt.py, 6, 0, Math.PI * 2);
    ctx.fillStyle = "#f59e0b";
    ctx.shadowColor = "#f59e0b";
    ctx.shadowBlur = 14;
    ctx.fill();

    // Inner highlight
    ctx.beginPath();
    ctx.arc(tracerPt.px, tracerPt.py, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#ffffff";
    ctx.fill();
    ctx.restore();

    // Dotted projection to x axis
    ctx.save();
    ctx.setLineDash([2, 3]);
    ctx.strokeStyle = "rgba(245, 158, 11, 0.4)";
    ctx.beginPath();
    ctx.moveTo(tracerPt.px, originY);
    ctx.lineTo(tracerPt.px, tracerPt.py);
    ctx.stroke();
    ctx.restore();
  }

  // Tangent Vector (Numerical Derivative dy/dx)
  if (tracerPt && (params.showDerivative ?? true)) {
    const delta = 1.0;
    let yPlus = 0;
    let yMinus = 0;
    try {
      yPlus = fn(tracerPt.x + delta, t, A, B, C, D) * yScale;
      yMinus = fn(tracerPt.x - delta, t, A, B, C, D) * yScale;
    } catch {}

    const dydx = (yPlus - yMinus) / (2 * delta);
    const vecLen = 38;
    const angle = Math.atan(-dydx); // canvas y is inverted
    const vx = Math.cos(angle) * vecLen;
    const vy = Math.sin(angle) * vecLen;

    drawVectorArrow(
      ctx,
      tracerPt.px,
      tracerPt.py,
      tracerPt.px + vx,
      tracerPt.py + vy,
      "#10b981",
      `dy/dx=${dydx.toFixed(2)}`
    );
  }

  // 4. Live HUD Overlay
  ctx.save();
  ctx.fillStyle = "rgba(15, 23, 42, 0.75)";
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  const hudW = 120;
  const hudH = 38;
  const hudX = w - hudW - 8;
  const hudY = h - hudH - 8;

  ctx.beginPath();
  ctx.roundRect(hudX, hudY, hudW, hudH, 8);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = "#94a3b8";
  ctx.font = "9px monospace";
  ctx.fillText(`t: ${t.toFixed(2)}s`, hudX + 8, hudY + 14);
  if (tracerPt) {
    ctx.fillText(`y(x₀): ${tracerPt.y.toFixed(1)}px`, hudX + 8, hudY + 28);
  }
  ctx.restore();
}

