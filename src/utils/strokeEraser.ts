import type { Stroke, StrokePoint } from "../types/whiteboard";

/**
 * Returns squared distance from point (px, py) to line segment (x1, y1) -> (x2, y2).
 */
export function distToSegmentSquared(
  px: number,
  py: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number
): number {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const l2 = dx * dx + dy * dy;

  if (l2 === 0) {
    return (px - x1) * (px - x1) + (py - y1) * (py - y1);
  }

  let t = ((px - x1) * dx + (py - y1) * dy) / l2;
  t = Math.max(0, Math.min(1, t));

  const projX = x1 + t * dx;
  const projY = y1 + t * dy;

  return (px - projX) * (px - projX) + (py - projY) * (py - projY);
}

/**
 * Subdivides any long segments in a stroke so point-distance erasing
 * produces silky-smooth, continuous precision cuts even on fast strokes.
 */
function densifyStrokePoints(points: StrokePoint[], maxStep = 4): StrokePoint[] {
  if (points.length < 2) return points;

  const result: StrokePoint[] = [points[0]];

  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i];
    const p1 = points[i + 1];
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > maxStep) {
      const steps = Math.ceil(dist / maxStep);
      for (let s = 1; s < steps; s++) {
        const t = s / steps;
        result.push({
          x: p0.x + dx * t,
          y: p0.y + dy * t,
          pressure: p0.pressure + (p1.pressure - p0.pressure) * t,
        });
      }
    }

    result.push(p1);
  }

  return result;
}

/**
 * Sweeps an eraser capsule from (x0, y0) to (x1, y1) with the given radius
 * and cleanly slices/trims intersecting strokes into remaining sub-strokes.
 *
 * If the whole stroke is covered, it is completely removed.
 * If only a part is rubbed, that exact segment is erased, leaving the rest intact.
 */
export function sliceStrokesWithEraser(
  strokes: Stroke[],
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  eraserRadius: number
): { nextStrokes: Stroke[]; didChange: boolean } {
  const radiusSq = eraserRadius * eraserRadius;
  let didChange = false;
  const nextStrokes: Stroke[] = [];

  for (const stroke of strokes) {
    // Quick bounding box rejection to keep 120 FPS performance
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const p of stroke.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
    }

    const sweepMinX = Math.min(x0, x1) - eraserRadius;
    const sweepMaxX = Math.max(x0, x1) + eraserRadius;
    const sweepMinY = Math.min(y0, y1) - eraserRadius;
    const sweepMaxY = Math.max(y0, y1) + eraserRadius;

    // Disjoint bounding boxes: stroke is definitely untouched
    if (maxX < sweepMinX || minX > sweepMaxX || maxY < sweepMinY || minY > sweepMaxY) {
      nextStrokes.push(stroke);
      continue;
    }

    // Densify points for smooth sub-pixel cuts
    const densePoints = densifyStrokePoints(stroke.points, 4);

    // Check which points fall inside the swept eraser capsule
    let strokeHit = false;
    const isErased: boolean[] = new Array(densePoints.length);

    for (let i = 0; i < densePoints.length; i++) {
      const p = densePoints[i];
      const d2 = distToSegmentSquared(p.x, p.y, x0, y0, x1, y1);
      if (d2 <= radiusSq) {
        isErased[i] = true;
        strokeHit = true;
      } else {
        isErased[i] = false;
      }
    }

    if (!strokeHit) {
      nextStrokes.push(stroke);
      continue;
    }

    // Stroke was hit! Split into remaining contiguous runs of >= 2 points
    didChange = true;
    let currentRun: StrokePoint[] = [];

    for (let i = 0; i < densePoints.length; i++) {
      if (isErased[i]) {
        if (currentRun.length >= 2) {
          nextStrokes.push({
            ...stroke,
            id: crypto.randomUUID(),
            points: currentRun,
          });
        }
        currentRun = [];
      } else {
        currentRun.push(densePoints[i]);
      }
    }

    if (currentRun.length >= 2) {
      nextStrokes.push({
        ...stroke,
        id: crypto.randomUUID(),
        points: currentRun,
      });
    }
  }

  return { nextStrokes, didChange };
}
