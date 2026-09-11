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
function snapAngle(dx: number, dy: number, toleranceRad = 0.16): { dx: number; dy: number } {
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
 * Calculates polygon area using the Shoelace formula.
 */
function computePolygonArea(points: StrokePoint[]): number {
  let area = 0;
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return Math.abs(area) / 2;
}

/**
 * Distance of point p to the 4 edges of an axis-aligned bounding box.
 */
function distToBoxPerimeter(
  p: { x: number; y: number },
  minX: number,
  minY: number,
  maxX: number,
  maxY: number
): number {
  const dLeft = Math.abs(p.x - minX);
  const dRight = Math.abs(p.x - maxX);
  const dTop = Math.abs(p.y - minY);
  const dBottom = Math.abs(p.y - maxY);
  return Math.min(dLeft, dRight, dTop, dBottom);
}

/**
 * Recognizes if a stroke points in a single direction and ends with a V-barbed arrowhead.
 */
function detectArrow(
  points: StrokePoint[],
  totalLen: number
): { isArrow: boolean; start: StrokePoint; tip: StrokePoint } | null {
  if (points.length < 8) return null;

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

  // If tip is past the 55% mark of the stroke and the remaining points turn backwards:
  if (tipIndex >= points.length * 0.55 && tipIndex < points.length - 1) {
    const headLen = pathLength(points.slice(tipIndex));

    if (headLen / totalLen >= 0.08 && headLen / totalLen <= 0.45) {
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
 * Highly tolerant of natural human hand tremors and graphics tablet inputs.
 */
export function classifyStroke(points: StrokePoint[]): SnappedShapeResult | null {
  if (points.length < 5) return null;

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
  if (boxW < 8 && boxH < 8) return null;

  const boxArea = boxW * boxH;
  const centroid = { x: sumX / points.length, y: sumY / points.length };
  const boxAspect = Math.min(boxW, boxH) / Math.max(boxW, boxH);

  // ── 1. Check for Vector Arrow ──
  const arrowInfo = detectArrow(points, totalLen);
  if (arrowInfo) {
    const rawDx = arrowInfo.tip.x - arrowInfo.start.x;
    const rawDy = arrowInfo.tip.y - arrowInfo.start.y;
    const snapped = snapAngle(rawDx, rawDy, 0.16);

    return {
      type: "arrow",
      x1: arrowInfo.start.x,
      y1: arrowInfo.start.y,
      x2: arrowInfo.start.x + snapped.dx,
      y2: arrowInfo.start.y + snapped.dy,
      confidence: 0.94,
    };
  }

  // ── 2. Check for Straight Line ──
  // A hand-drawn straight line has high end-to-end efficiency (> 0.76)
  // and small mean perpendicular deviation from the chord.
  if (closureRatio > 0.76) {
    let maxDeviation = 0;
    let sumDeviation = 0;

    for (const p of points) {
      const dev = perpendicularDistance(p, p0, pn);
      if (dev > maxDeviation) maxDeviation = dev;
      sumDeviation += dev;
    }

    const avgDeviation = sumDeviation / points.length;

    if (maxDeviation / endToEndDist < 0.22 && avgDeviation / endToEndDist < 0.10) {
      const rawDx = pn.x - p0.x;
      const rawDy = pn.y - p0.y;
      const snapped = snapAngle(rawDx, rawDy, 0.16);

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
  // Closed strokes have low closureRatio (< 0.50) or end-to-end distance is small relative to box dimensions
  const isClosed = closureRatio < 0.50 || endToEndDist < Math.max(boxW, boxH) * 0.45;

  if (isClosed && boxArea > 100) {
    const polyArea = computePolygonArea(points);
    const fillRatio = polyArea / Math.max(1, boxArea);

    // ── A. Circle / Ellipse Detection ──
    const a = boxW / 2;
    const b = boxH / 2;
    let radialErrorSum = 0;

    for (const p of points) {
      const angle = Math.atan2(p.y - centroid.y, p.x - centroid.x);
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const expR = (a * b) / Math.sqrt((b * cosA) ** 2 + (a * sinA) ** 2);
      const actR = dist(p, centroid);
      radialErrorSum += Math.abs(actR - expR) / Math.max(a, b);
    }

    const avgRadialError = radialErrorSum / points.length;

    // Circles/ellipses have smooth radial match to ellipse equation and fill ratio around pi/4 (~0.785)
    if (avgRadialError < 0.26 && fillRatio >= 0.50 && fillRatio <= 0.94) {
      if (boxAspect > 0.78) {
        // Perfect Circle
        const finalR = (boxW + boxH) / 4;
        return {
          type: "circle",
          x1: centroid.x - finalR,
          y1: centroid.y - finalR,
          x2: centroid.x + finalR,
          y2: centroid.y + finalR,
          confidence: 0.96,
        };
      } else {
        // Fitted Ellipse bounds
        return {
          type: "circle",
          x1: minX,
          y1: minY,
          x2: maxX,
          y2: maxY,
          confidence: 0.92,
        };
      }
    }

    // ── B. Triangle Detection ──
    // Triangles have fill ratio between ~0.28 and ~0.66 and 3 dominant corners
    const epsilonTriangle = Math.max(8, totalLen * 0.07);
    const simplifiedTriangle = simplifyRDP(points, epsilonTriangle);
    const triangleCornerCount = simplifiedTriangle.length - 1;

    if (
      (triangleCornerCount === 3 || triangleCornerCount === 4) &&
      fillRatio >= 0.26 &&
      fillRatio <= 0.68
    ) {
      return {
        type: "triangle",
        x1: minX,
        y1: minY,
        x2: maxX,
        y2: maxY,
        confidence: 0.92,
      };
    }

    // ── C. Rectangle / Square Detection ──
    // Rectangles have high fill ratio (>= 0.72) and stroke points concentrate along the 4 edges of the box
    let perimDistSum = 0;
    for (const p of points) {
      perimDistSum += distToBoxPerimeter(p, minX, minY, maxX, maxY);
    }
    const avgPerimDist = perimDistSum / points.length;
    const normPerimDist = avgPerimDist / Math.max(1, Math.min(boxW, boxH));

    if (normPerimDist < 0.22 && fillRatio >= 0.70) {
      if (boxAspect > 0.85) {
        // Perfect Square
        const side = Math.max(boxW, boxH);
        return {
          type: "rectangle",
          x1: centroid.x - side / 2,
          y1: centroid.y - side / 2,
          x2: centroid.x + side / 2,
          y2: centroid.y + side / 2,
          confidence: 0.95,
        };
      } else {
        return {
          type: "rectangle",
          x1: minX,
          y1: minY,
          x2: maxX,
          y2: maxY,
          confidence: 0.93,
        };
      }
    }

    // Fallback: simplified polygon check for 4-5 corners
    const epsilonRect = Math.max(8, totalLen * 0.05);
    const simplifiedRect = simplifyRDP(points, epsilonRect);
    const rectCornerCount = simplifiedRect.length - 1;

    if ((rectCornerCount === 4 || rectCornerCount === 5) && fillRatio >= 0.68) {
      return {
        type: "rectangle",
        x1: minX,
        y1: minY,
        x2: maxX,
        y2: maxY,
        confidence: 0.90,
      };
    }
  }

  return null;
}
