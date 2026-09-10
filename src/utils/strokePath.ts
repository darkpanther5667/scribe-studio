/**
 * Converts the polygon point array returned by perfect-freehand's getStroke()
 * into an SVG path string, then parses it into a Path2D object ready for
 * ctx.fill() on an HTML5 Canvas context.
 *
 * perfect-freehand returns an array of [x, y] polygon vertices that outline
 * the stroke shape.  We connect them with smooth cubic bezier curves using the
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
