import type { ShapeType, StrokePoint } from "../types/whiteboard";

export interface SnappedShapeResult {
  type: ShapeType;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  confidence: number;
}

/**
 * Euclidean distance between two 2D points.
 */
function dist(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Total cumulative path length of points.
 */
function pathLength(points: StrokePoint[]): number {
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += dist(points[i], points[i - 1]);
  }
  return len;
}

/**
 * Perpendicular distance from point p to line passing through (p1, p2).
 */
function perpendicularDistance(
  p: StrokePoint,
  p1: StrokePoint,
  p2: StrokePoint
): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  const lineLen = Math.sqrt(dx * dx + dy * dy);
  if (lineLen === 0) return dist(p, p1);
  return Math.abs(dy * p.x - dx * p.y + p2.x * p1.y - p2.y * p1.x) / lineLen;
}

/**
 * Ramer-Douglas-Peucker (RDP) polyline simplification algorithm.
 */
function simplifyRDP(points: StrokePoint[], epsilon: number): StrokePoint[] {
  if (points.length < 3) return points;

  let maxDist = 0;
  let index = 0;
  const p1 = points[0];
  const p2 = points[points.length - 1];

  for (let i = 1; i < points.length - 1; i++) {
    const d = perpendicularDistance(points[i], p1, p2);
    if (d > maxDist) {
      maxDist = d;
      index = i;
    }
  }

  if (maxDist > epsilon) {
    const left = simplifyRDP(points.slice(0, index + 1), epsilon);
    const right = simplifyRDP(points.slice(index), epsilon);
    return [...left.slice(0, -1), ...right];
  } else {
    return [p1, p2];
  }
}

/**
 * Snaps an angle to 0, 45, 90, 135, 180, -45, -90, -135 degrees if within tolerance.
 */
function snapAngle(dx: number, dy: number, toleranceRad = 0.12): { dx: number; dy: number } {
  const length = Math.sqrt(dx * dx + dy * dy);
  if (length === 0) return { dx, dy };

  const angle = Math.atan2(dy, dx);
  const snapStep = Math.PI / 4; // 45 degrees
  const nearestMultiple = Math.round(angle / snapStep) * snapStep;

  if (Math.abs(angle - nearestMultiple) <= toleranceRad) {
    return {
      dx: length * Math.cos(nearestMultiple),
      dy: length * Math.sin(nearestMultiple),
    };
  }

  return { dx, dy };
}

/**
 * Recognizes if a stroke points in a single direction and ends with a V-barbed arrowhead.
 */
function detectArrow(
  points: StrokePoint[],
  totalLen: number
): { isArrow: boolean; start: StrokePoint; tip: StrokePoint } | null {
  if (points.length < 10) return null;

  // Find point furthest from start along the main direction
  const p0 = points[0];
  let maxDistFromStart = 0;
  let tipIndex = 0;

  for (let i = 1; i < points.length; i++) {
    const d = dist(p0, points[i]);
    if (d > maxDistFromStart) {
      maxDistFromStart = d;
      tipIndex = i;
    }
  }

  // If tip is near the very end (last 30% of stroke) and the remaining points turn back:
  if (tipIndex >= points.length * 0.65 && tipIndex < points.length - 2) {
    const headLen = pathLength(points.slice(tipIndex));

    if (headLen / totalLen >= 0.12 && headLen / totalLen <= 0.45) {
      const tipPoint = points[tipIndex];
      const endPoint = points[points.length - 1];

      // Verify arrowhead turns backwards relative to shaft vector
      const shaftDx = tipPoint.x - p0.x;
      const shaftDy = tipPoint.y - p0.y;
      const headDx = endPoint.x - tipPoint.x;
      const headDy = endPoint.y - tipPoint.y;

      const dotProduct = shaftDx * headDx + shaftDy * headDy;
      if (dotProduct < 0) {
        return {
          isArrow: true,
          start: p0,
          tip: tipPoint,
        };
      }
    }
  }

  return null;
}

/**
 * Classifies a user's freehand ink stroke and returns a mathematically
 * snapped geometric shape (line, arrow, circle, rectangle, or triangle).
 * Returns null if the stroke is arbitrary handwriting/drawing.
 */
export function classifyStroke(points: StrokePoint[]): SnappedShapeResult | null {
  if (points.length < 6) return null;

  const totalLen = pathLength(points);
  if (totalLen < 20) return null; // Ignore tiny twitches

  const p0 = points[0];
  const pn = points[points.length - 1];
  const endToEndDist = dist(p0, pn);
  const closureRatio = endToEndDist / totalLen;

  // Compute Bounding Box
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let sumX = 0, sumY = 0;

  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
    sumX += p.x;
    sumY += p.y;
  }

  const boxW = maxX - minX;
  const boxH = maxY - minY;
  const centroid = { x: sumX / points.length, y: sumY / points.length };

  // ── 1. Check for Vector Arrow ──
  const arrowInfo = detectArrow(points, totalLen);
  if (arrowInfo) {
    const rawDx = arrowInfo.tip.x - arrowInfo.start.x;
    const rawDy = arrowInfo.tip.y - arrowInfo.start.y;
    const snapped = snapAngle(rawDx, rawDy, 0.12);

    return {
      type: "arrow",
      x1: arrowInfo.start.x,
      y1: arrowInfo.start.y,
      x2: arrowInfo.start.x + snapped.dx,
      y2: arrowInfo.start.y + snapped.dy,
      confidence: 0.92,
    };
  }

  // ── 2. Check for Straight Line ──
  // A straight line has high end-to-end efficiency (D/L > 0.88)
  // and small deviation from the chord.
  if (closureRatio > 0.88) {
    let maxDeviation = 0;
    for (const p of points) {
      const dev = perpendicularDistance(p, p0, pn);
      if (dev > maxDeviation) maxDeviation = dev;
    }

    if (maxDeviation / endToEndDist < 0.14) {
      const rawDx = pn.x - p0.x;
      const rawDy = pn.y - p0.y;
      const snapped = snapAngle(rawDx, rawDy, 0.12);

      return {
        type: "line",
        x1: p0.x,
        y1: p0.y,
        x2: p0.x + snapped.dx,
        y2: p0.y + snapped.dy,
        confidence: 0.95,
      };
    }
  }

  // ── 3. Check for Closed Shapes (Circle, Rectangle, Triangle) ──
  if (closureRatio < 0.35) {
    // A. Circle / Ellipse Test
    // Calculate variance of radii from centroid
    let radiusSum = 0;
    const radii: number[] = [];

    for (const p of points) {
      const r = dist(p, centroid);
      radii.push(r);
      radiusSum += r;
    }

    const avgRadius = radiusSum / points.length;
    let varianceSum = 0;
    for (const r of radii) {
      const diff = r - avgRadius;
      varianceSum += diff * diff;
    }

    const stdDev = Math.sqrt(varianceSum / points.length);
    const coefficientOfVariation = stdDev / avgRadius;

    // If points are roughly equidistant from centroid, it's a Circle / Oval!
    if (coefficientOfVariation < 0.22) {
      // Check if it's nearly a circular circle vs oval
      const aspect = Math.min(boxW, boxH) / Math.max(boxW, boxH);
      if (aspect > 0.75) {
        // Perfect Circle
        const finalR = (boxW + boxH) / 4;
        return {
          type: "circle",
          x1: centroid.x - finalR,
          y1: centroid.y - finalR,
          x2: centroid.x + finalR,
          y2: centroid.y + finalR,
          confidence: 0.94,
        };
      } else {
        // Fitted Ellipse bounds
        return {
          type: "circle",
          x1: minX,
          y1: minY,
          x2: maxX,
          y2: maxY,
          confidence: 0.88,
        };
      }
    }

    // B. Polygon Simplification (Triangle vs Rectangle)
    const epsilon = Math.max(8, totalLen * 0.05);
    const simplified = simplifyRDP(points, epsilon);
    const cornerCount = simplified.length - 1; // last point meets first point

    if (cornerCount === 3) {
      // Triangle!
      return {
        type: "triangle",
        x1: minX,
        y1: minY,
        x2: maxX,
        y2: maxY,
        confidence: 0.89,
      };
    }

    if (cornerCount === 4 || cornerCount === 5) {
      // Rectangle!
      const aspect = Math.min(boxW, boxH) / Math.max(boxW, boxH);
      if (aspect > 0.88) {
        // Perfect Square
        const side = Math.max(boxW, boxH);
        return {
          type: "rectangle",
          x1: centroid.x - side / 2,
          y1: centroid.y - side / 2,
          x2: centroid.x + side / 2,
          y2: centroid.y + side / 2,
          confidence: 0.91,
        };
      }
      return {
        type: "rectangle",
        x1: minX,
        y1: minY,
        x2: maxX,
        y2: maxY,
        confidence: 0.9,
      };
    }
  }

  return null;
}
