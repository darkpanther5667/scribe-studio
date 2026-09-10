import type {
  PastedImage,
  ShapeItem,
  StickyNote,
  Stroke,
  TextItem,
} from "../types/whiteboard";

export interface Point2D {
  x: number;
  y: number;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}

/**
 * Standard Ray-casting algorithm to test if (px, py) is inside polygon.
 */
export function isPointInPolygon(px: number, py: number, polygon: Point2D[]): boolean {
  if (polygon.length < 3) return false;
  let inside = false;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;

    const intersect =
      yi > py !== yj > py &&
      px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Tests if a stroke is captured by the lasso polygon.
 * Returns true if a significant portion (centroid or multiple points) are inside.
 */
export function isStrokeInPolygon(stroke: Stroke, polygon: Point2D[]): boolean {
  if (stroke.points.length === 0) return false;

  let insideCount = 0;
  const sampleStep = Math.max(1, Math.floor(stroke.points.length / 10));

  for (let i = 0; i < stroke.points.length; i += sampleStep) {
    if (isPointInPolygon(stroke.points[i].x, stroke.points[i].y, polygon)) {
      insideCount++;
    }
  }

  return insideCount > 0;
}

/**
 * Tests if a geometric shape is captured by the lasso polygon.
 */
export function isShapeInPolygon(shape: ShapeItem, polygon: Point2D[]): boolean {
  const cx = (shape.x1 + shape.x2) / 2;
  const cy = (shape.y1 + shape.y2) / 2;
  return (
    isPointInPolygon(cx, cy, polygon) ||
    isPointInPolygon(shape.x1, shape.y1, polygon) ||
    isPointInPolygon(shape.x2, shape.y2, polygon)
  );
}

/**
 * Tests if a text item is captured by the lasso polygon.
 */
export function isTextInPolygon(text: TextItem, polygon: Point2D[]): boolean {
  return isPointInPolygon(text.x, text.y, polygon);
}

/**
 * Tests if a sticky note is captured by the lasso polygon.
 */
export function isNoteInPolygon(note: StickyNote, polygon: Point2D[]): boolean {
  const cx = note.x + note.width / 2;
  const cy = note.y + note.height / 2;
  return isPointInPolygon(cx, cy, polygon);
}

/**
 * Tests if a pasted image is captured by the lasso polygon.
 */
export function isImageInPolygon(img: PastedImage, polygon: Point2D[]): boolean {
  const cx = img.x + img.width / 2;
  const cy = img.y + img.height / 2;
  return isPointInPolygon(cx, cy, polygon);
}

/**
 * Computes bounding box encompassing all selected elements.
 */
export function computeSelectionBoundingBox(
  selectedStrokes: Stroke[],
  selectedShapes: ShapeItem[],
  selectedTexts: TextItem[],
  selectedNotes: StickyNote[],
  selectedImages: PastedImage[]
): BoundingBox | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasAny = false;

  for (const s of selectedStrokes) {
    for (const p of s.points) {
      if (p.x < minX) minX = p.x;
      if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.y > maxY) maxY = p.y;
      hasAny = true;
    }
  }

  for (const sh of selectedShapes) {
    minX = Math.min(minX, sh.x1, sh.x2);
    maxX = Math.max(maxX, sh.x1, sh.x2);
    minY = Math.min(minY, sh.y1, sh.y2);
    maxY = Math.max(maxY, sh.y1, sh.y2);
    hasAny = true;
  }

  for (const t of selectedTexts) {
    minX = Math.min(minX, t.x);
    minY = Math.min(minY, t.y);
    maxX = Math.max(maxX, t.x + 120);
    maxY = Math.max(maxY, t.y + t.fontSize * 1.5);
    hasAny = true;
  }

  for (const n of selectedNotes) {
    minX = Math.min(minX, n.x);
    minY = Math.min(minY, n.y);
    maxX = Math.max(maxX, n.x + n.width);
    maxY = Math.max(maxY, n.y + n.height);
    hasAny = true;
  }

  for (const img of selectedImages) {
    minX = Math.min(minX, img.x);
    minY = Math.min(minY, img.y);
    maxX = Math.max(maxX, img.x + img.width);
    maxY = Math.max(maxY, img.y + img.height);
    hasAny = true;
  }

  if (!hasAny) return null;

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX,
    height: maxY - minY,
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
  };
}
