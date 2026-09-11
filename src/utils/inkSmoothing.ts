import type { StrokePoint, StabilizerLevel } from "../types/whiteboard";

/**
 * Calculates Euclidean distance between two points.
 */
function distance(p1: StrokePoint, p2: StrokePoint): number {
  return Math.hypot(p2.x - p1.x, p2.y - p1.y);
}

/**
 * Evaluates Catmull-Rom cubic spline interpolation at parameter t in [0, 1].
 * P0, P1, P2, P3 are control points; curve passes cleanly through P1 and P2.
 */
function catmullRomPoint(
  p0: StrokePoint,
  p1: StrokePoint,
  p2: StrokePoint,
  p3: StrokePoint,
  t: number
): StrokePoint {
  const t2 = t * t;
  const t3 = t2 * t;

  // Catmull-Rom matrix coefficients
  const x =
    0.5 *
    (2 * p1.x +
      (-p0.x + p2.x) * t +
      (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 +
      (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);

  const y =
    0.5 *
    (2 * p1.y +
      (-p0.y + p2.y) * t +
      (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
      (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);

  const pressure =
    0.5 *
    (2 * p1.pressure +
      (-p0.pressure + p2.pressure) * t +
      (2 * p0.pressure - 5 * p1.pressure + 4 * p2.pressure - p3.pressure) * t2 +
      (-p0.pressure + 3 * p1.pressure - 3 * p2.pressure + p3.pressure) * t3);

  return {
    x,
    y,
    pressure: Math.max(0.02, Math.min(1.0, pressure)),
  };
}

/**
 * Filters out micro-jitter deadband noise and computes velocity-sensitive dynamic pressure.
 * When the stylus moves quickly (fast flick, crossing t's, dotting i's), pressure subtly tapers.
 * When moving slowly and deliberately, ink deposits rich and solid.
 */
export function applyVelocityPhysics(points: StrokePoint[]): StrokePoint[] {
  if (points.length < 2) return points;

  const result: StrokePoint[] = [{ ...points[0] }];
  const minSpacing = 1.2; // px deadband

  for (let i = 1; i < points.length; i++) {
    const prev = result[result.length - 1];
    const curr = points[i];
    const dist = distance(prev, curr);

    // Filter out redundant micro-jitter while always capturing the very last point
    if (dist < minSpacing && i < points.length - 1) {
      continue;
    }

    // Velocity dynamics: v = deltaDist / deltaTime (pixels per millisecond)
    let velocityFactor = 1.0;
    if (curr.time && prev.time && curr.time > prev.time) {
      const dt = Math.max(1, curr.time - prev.time);
      const v = dist / dt; // px/ms, typically 0.2 to 3.0 in natural writing

      // As velocity increases, gently taper pressure to simulate nib ink flow
      // High speed -> thinner taper; deliberate speed -> rich full ink
      velocityFactor = Math.max(0.45, Math.min(1.2, 1.05 - 0.2 * Math.min(v / 2.0, 1.0)));
    }

    result.push({
      x: curr.x,
      y: curr.y,
      pressure: Math.max(0.02, Math.min(1.0, curr.pressure * velocityFactor)),
      time: curr.time,
    });
  }

  return result;
}

/**
 * Intelligent handwriting curve smoothing & stabilization using Catmull-Rom splines.
 * Eliminates angular corners on fast cursive handwriting, loops, and math symbols.
 */
export function smoothStrokePoints(
  points: StrokePoint[],
  level: StabilizerLevel = "smooth"
): StrokePoint[] {
  if (points.length <= 2 || level === "off") {
    return points;
  }

  // First apply velocity dynamics & jitter filtering
  const filtered = applyVelocityPhysics(points);
  if (filtered.length <= 2) return filtered;

  const smoothed: StrokePoint[] = [filtered[0]];
  const subdivisions = level === "calligraphy" ? 3 : 2;
  const minInterpDist = level === "calligraphy" ? 5 : 7;

  for (let i = 0; i < filtered.length - 1; i++) {
    const p0 = i > 0 ? filtered[i - 1] : filtered[i];
    const p1 = filtered[i];
    const p2 = filtered[i + 1];
    const p3 = i + 2 < filtered.length ? filtered[i + 2] : p2;

    const segDist = distance(p1, p2);

    // Only interpolate intermediate spline points on segments with sufficient distance
    if (segDist >= minInterpDist) {
      for (let s = 1; s <= subdivisions; s++) {
        const t = s / (subdivisions + 1);
        smoothed.push(catmullRomPoint(p0, p1, p2, p3, t));
      }
    }

    smoothed.push(p2);
  }

  return smoothed;
}
