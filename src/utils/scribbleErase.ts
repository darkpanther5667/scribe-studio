import type { StrokePoint, Stroke, ShapeItem, TextItem, StickyNote } from "../types/whiteboard";

export interface ScribbleDetectionResult {
  isScribble: boolean;
  erasedStrokeIds: string[];
  erasedShapeIds: string[];
  erasedTextIds: string[];
  erasedNoteIds: string[];
  center?: { x: number; y: number };
}

export function detectScribbleGesture(points: StrokePoint[]): boolean {
  // A true scratch-out scribble requires multiple rapid zigzags
  if (points.length < 22) return false;

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  let totalLength = 0;

  for (let i = 0; i < points.length; i++) {
    const p = points[i];
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;

    if (i > 0) {
      const prev = points[i - 1];
      totalLength += Math.hypot(p.x - prev.x, p.y - prev.y);
    }
  }

  const width = maxX - minX;
  const height = maxY - minY;
  const diag = Math.hypot(width, height);

  // Bounds must be within realistic single-item scratch-out size
  if (diag < 20 || diag > 260) return false;

  // Real scribbling has very high path density packed into a small area
  // Normal handwriting letters (m, w, cursive) have totalLength / diag between 1.5 and 2.8
  if (totalLength < diag * 3.8) return false;

  let xReversals = 0;
  let yReversals = 0;
  let lastDx = 0;
  let lastDy = 0;
  const minThreshold = 5;

  for (let i = 2; i < points.length; i++) {
    const dx = points[i].x - points[i - 2].x;
    const dy = points[i].y - points[i - 2].y;

    if (Math.abs(dx) > minThreshold) {
      if (lastDx !== 0 && ((dx > 0 && lastDx < 0) || (dx < 0 && lastDx > 0))) {
        xReversals++;
      }
      lastDx = dx;
    }

    if (Math.abs(dy) > minThreshold) {
      if (lastDy !== 0 && ((dy > 0 && lastDy < 0) || (dy < 0 && lastDy > 0))) {
        yReversals++;
      }
      lastDy = dy;
    }
  }

  // Must have at least 6 directional reversals (back-and-forth scratch)
  // Prevents letters like "m", "w", "3", "8", Greek letters, and cursive loops from triggering
  return xReversals >= 6 || yReversals >= 6 || (xReversals >= 4 && yReversals >= 4);
}

export function findScribbleTargets(
  points: StrokePoint[],
  strokes: Stroke[],
  shapes: ShapeItem[],
  texts: TextItem[],
  notes: StickyNote[]
): ScribbleDetectionResult {
  if (!detectScribbleGesture(points)) {
    return {
      isScribble: false,
      erasedStrokeIds: [],
      erasedShapeIds: [],
      erasedTextIds: [],
      erasedNoteIds: [],
    };
  }

  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }

  const pad = 6;
  const box = {
    x1: minX - pad,
    y1: minY - pad,
    x2: maxX + pad,
    y2: maxY + pad,
  };

  const erasedStrokeIds: string[] = [];
  const erasedShapeIds: string[] = [];
  const erasedTextIds: string[] = [];
  const erasedNoteIds: string[] = [];

  for (const stroke of strokes) {
    // Only erase if scribble directly covers a significant portion of the target stroke (at least 35% of its points)
    let insideCount = 0;
    for (const pt of stroke.points) {
      if (pt.x >= box.x1 && pt.x <= box.x2 && pt.y >= box.y1 && pt.y <= box.y2) {
        insideCount++;
      }
    }
    const threshold = Math.max(3, Math.min(stroke.points.length * 0.35, 12));
    if (insideCount >= threshold) {
      erasedStrokeIds.push(stroke.id);
    }
  }

  for (const shape of shapes) {
    const sMinX = Math.min(shape.x1, shape.x2);
    const sMaxX = Math.max(shape.x1, shape.x2);
    const sMinY = Math.min(shape.y1, shape.y2);
    const sMaxY = Math.max(shape.y1, shape.y2);
    const centerX = (sMinX + sMaxX) / 2;
    const centerY = (sMinY + sMaxY) / 2;

    // Center of shape must be inside the scribble box
    if (centerX >= box.x1 && centerX <= box.x2 && centerY >= box.y1 && centerY <= box.y2) {
      erasedShapeIds.push(shape.id);
    }
  }

  for (const text of texts) {
    const fs = text.fontSize || 20;
    const tW = Math.max(text.text.length * fs * 0.6, 60);
    const tH = Math.max(fs * 1.2, 24);
    const centerX = text.x + tW / 2;
    const centerY = text.y + tH / 2;

    if (centerX >= box.x1 && centerX <= box.x2 && centerY >= box.y1 && centerY <= box.y2) {
      erasedTextIds.push(text.id);
    }
  }

  for (const note of notes) {
    const centerX = note.x + note.width / 2;
    const centerY = note.y + note.height / 2;

    if (centerX >= box.x1 && centerX <= box.x2 && centerY >= box.y1 && centerY <= box.y2) {
      erasedNoteIds.push(note.id);
    }
  }

  const hasTargets =
    erasedStrokeIds.length > 0 ||
    erasedShapeIds.length > 0 ||
    erasedTextIds.length > 0 ||
    erasedNoteIds.length > 0;

  return {
    isScribble: hasTargets,
    erasedStrokeIds,
    erasedShapeIds,
    erasedTextIds,
    erasedNoteIds,
    center: { x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
  };
}
