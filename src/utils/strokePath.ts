import { getStroke } from "perfect-freehand";
import type { Stroke, PenStyle, StrokeWidth } from "../types/whiteboard";

/**
 * Converts the polygon point array returned by perfect-freehand's getStroke()
 * into an SVG path string, then parses it into a Path2D object ready for
 * ctx.fill() on an HTML5 Canvas context.
 *
 * perfect-freehand returns an array of [x, y] polygon vertices that outline
 * the stroke shape. We connect them with smooth cubic bezier curves using the
 * midpoint-chaining technique so the path looks organic rather than jagged.
 */
export function getSvgPathFromStroke(points: number[][]): string {
  if (points.length === 0) return "";

  const d: string[] = [];
  const [first, ...rest] = points;

  // Move to the starting point
  d.push(`M ${first[0].toFixed(2)} ${first[1].toFixed(2)}`);

  // Draw smooth quadratic curves through each midpoint
  for (let i = 0; i < rest.length - 1; i++) {
    const p0 = rest[i];
    const p1 = rest[i + 1];
    const mx = ((p0[0] + p1[0]) / 2).toFixed(2);
    const my = ((p0[1] + p1[1]) / 2).toFixed(2);
    d.push(`Q ${p0[0].toFixed(2)} ${p0[1].toFixed(2)} ${mx} ${my}`);
  }

  // Close the shape
  const last = rest[rest.length - 1];
  if (last) {
    d.push(`Q ${last[0].toFixed(2)} ${last[1].toFixed(2)} ${first[0].toFixed(2)} ${first[1].toFixed(2)}`);
  }
  d.push("Z");

  return d.join(" ");
}

/**
 * Convenience wrapper: builds a Path2D from the SVG path string so it can
 * be passed directly to ctx.fill(path2d).
 */
export function getPath2DFromStroke(points: number[][]): Path2D {
  return new Path2D(getSvgPathFromStroke(points));
}

// ── High-Performance GPU Path2D Caching Engine ────────────────────────────────
// Precomputes and caches outline vector geometry in memory for all completed strokes.
// When drawing at 120 FPS, the canvas redraw loop skips getStroke() and SVG parsing
// for hundreds of committed strokes, dropping per-frame CPU load from O(N) to O(1).

interface CachedStrokeEntry {
  path2d: Path2D;
  pointsCount: number;
  width: StrokeWidth;
  penStyle?: PenStyle;
}

const strokePathCache = new Map<string, CachedStrokeEntry>();

export function getCachedStrokePath2D(
  stroke: Stroke,
  getPfOptions: (style: PenStyle | undefined, width: number) => any,
  baseWidth: number
): Path2D {
  const cached = strokePathCache.get(stroke.id);
  if (
    cached &&
    cached.pointsCount === stroke.points.length &&
    cached.width === stroke.width &&
    cached.penStyle === stroke.penStyle
  ) {
    return cached.path2d;
  }

  // Compute outline points via perfect-freehand
  const rawPoints = stroke.points.map((p) => [p.x, p.y, p.pressure]);
  const pfOptions = getPfOptions(stroke.penStyle, baseWidth);
  const outlinePoints = getStroke(rawPoints, pfOptions);

  if (outlinePoints.length === 0) {
    const emptyPath = new Path2D();
    strokePathCache.set(stroke.id, {
      path2d: emptyPath,
      pointsCount: stroke.points.length,
      width: stroke.width,
      penStyle: stroke.penStyle,
    });
    return emptyPath;
  }

  const path2d = getPath2DFromStroke(outlinePoints);
  strokePathCache.set(stroke.id, {
    path2d,
    pointsCount: stroke.points.length,
    width: stroke.width,
    penStyle: stroke.penStyle,
  });

  return path2d;
}

export function invalidateStrokePath(strokeId: string): void {
  strokePathCache.delete(strokeId);
}

export function clearStrokePathCache(): void {
  strokePathCache.clear();
}
