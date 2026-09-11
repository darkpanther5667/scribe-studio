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
  if (points.length < 12) return false;

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

  if (diag < 18 || diag > 280) return false;
  if (totalLength < diag * 2.2) return false;

  let xReversals = 0;
  let yReversals = 0;
  let lastDx = 0;
  let lastDy = 0;
  const minThreshold = 4;

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

  return xReversals >= 3 || yReversals >= 3;
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

  const pad = 12;
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
    let hit = false;
    for (const pt of stroke.points) {
      if (pt.x >= box.x1 && pt.x <= box.x2 && pt.y >= box.y1 && pt.y <= box.y2) {
        hit = true;
        break;
      }
    }
    if (hit) erasedStrokeIds.push(stroke.id);
  }

  for (const shape of shapes) {
    const sMinX = Math.min(shape.x1, shape.x2);
    const sMaxX = Math.max(shape.x1, shape.x2);
    const sMinY = Math.min(shape.y1, shape.y2);
    const sMaxY = Math.max(shape.y1, shape.y2);

    if (!(sMaxX < box.x1 || sMinX > box.x2 || sMaxY < box.y1 || sMinY > box.y2)) {
      erasedShapeIds.push(shape.id);
    }
  }

  for (const text of texts) {
    const fs = text.fontSize || 20;
    const tW = Math.max(text.text.length * fs * 0.6, 60);
    const tH = Math.max(fs * 1.2, 24);
    if (!(text.x + tW < box.x1 || text.x > box.x2 || text.y + tH < box.y1 || text.y > box.y2)) {
      erasedTextIds.push(text.id);
    }
  }

  for (const note of notes) {
    if (!(note.x + note.width < box.x1 || note.x > box.x2 || note.y + note.height < box.y1 || note.y > box.y2)) {
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
