import type { ShapeItem, StickyNote, StrokeWidth, TextItem } from "../types/whiteboard";
import { STROKE_WIDTH_MAP } from "../types/whiteboard";
import { distToSegmentSquared } from "./strokeEraser";

/**
 * Applies line style (solid, dashed, dotted) to context.
 */
export function applyLineStyle(
  ctx: CanvasRenderingContext2D,
  lineStyle = "solid",
  zoom = 1
): void {
  if (lineStyle === "dashed") {
    ctx.setLineDash([12 / zoom, 8 / zoom]);
  } else if (lineStyle === "dotted") {
    ctx.setLineDash([3 / zoom, 6 / zoom]);
  } else {
    ctx.setLineDash([]);
  }
}

/**
 * Draws a geometric shape on the 2D canvas context with line styles & optional fill.
 */
export function drawShape(
  ctx: CanvasRenderingContext2D,
  shape: ShapeItem,
  zoom = 1
): void {
  const { type, x1, y1, x2, y2, color, width, lineStyle = "solid", fillStyle = "none" } = shape;
  const strokeSize = STROKE_WIDTH_MAP[width as StrokeWidth] ?? 4;

  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeSize;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  applyLineStyle(ctx, lineStyle, zoom);

  const minX = Math.min(x1, x2);
  const maxX = Math.max(x1, x2);
  const minY = Math.min(y1, y2);
  const maxY = Math.max(y1, y2);
  const w = maxX - minX;
  const h = maxY - minY;

  const shouldFill = fillStyle === "semi";
  if (shouldFill) {
    // 15% opacity pastel tint fill
    ctx.fillStyle = `${color}28`;
  }

  ctx.beginPath();

  switch (type) {
    case "line": {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      break;
    }

    case "arrow": {
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      // Arrowhead is drawn solid for clarity
      ctx.setLineDash([]);
      const angle = Math.atan2(y2 - y1, x2 - x1);
      const headLength = Math.max(14, strokeSize * 3);
      const headAngle = Math.PI / 6;

      const arrowX1 = x2 - headLength * Math.cos(angle - headAngle);
      const arrowY1 = y2 - headLength * Math.sin(angle - headAngle);
      const arrowX2 = x2 - headLength * Math.cos(angle + headAngle);
      const arrowY2 = y2 - headLength * Math.sin(angle + headAngle);

      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(arrowX1, arrowY1);
      ctx.moveTo(x2, y2);
      ctx.lineTo(arrowX2, arrowY2);
      ctx.stroke();
      break;
    }

    case "rectangle": {
      const radius = Math.min(6, Math.min(w, h) / 4);
      if (typeof ctx.roundRect === "function" && radius > 0) {
        ctx.beginPath();
        ctx.roundRect(minX, minY, w, h, radius);
        if (shouldFill) ctx.fill();
        ctx.stroke();
      } else {
        if (shouldFill) ctx.fillRect(minX, minY, w, h);
        ctx.strokeRect(minX, minY, w, h);
      }
      break;
    }

    case "circle": {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const rx = Math.abs(x2 - x1) / 2;
      const ry = Math.abs(y2 - y1) / 2;

      ctx.beginPath();
      ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, Math.PI * 2);
      if (shouldFill) ctx.fill();
      ctx.stroke();
      break;
    }

    case "triangle": {
      const topX = (x1 + x2) / 2;
      const topY = y1;
      const botLeftX = x1;
      const botLeftY = y2;
      const botRightX = x2;
      const botRightY = y2;

      ctx.beginPath();
      ctx.moveTo(topX, topY);
      ctx.lineTo(botRightX, botRightY);
      ctx.lineTo(botLeftX, botLeftY);
      ctx.closePath();
      if (shouldFill) ctx.fill();
      ctx.stroke();
      break;
    }
  }

  ctx.restore();
}

/**
 * Draws typed text on canvas with clean wrapping & high-DPI rendering.
 */
export function drawText(
  ctx: CanvasRenderingContext2D,
  textItem: TextItem,
  _zoom = 1
): void {
  const { text, x, y, color, fontSize } = textItem;
  ctx.save();
  ctx.font = `600 ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.fillStyle = color;
  ctx.textBaseline = "top";

  const lines = text.split("\n");
  const lineHeight = fontSize * 1.3;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x, y + i * lineHeight);
  }

  ctx.restore();
}

/**
 * Draws a sticky note / callout card on canvas.
 */
export function drawStickyNote(
  ctx: CanvasRenderingContext2D,
  note: StickyNote,
  zoom = 1
): void {
  const { x, y, width, height, color, text } = note;

  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
  ctx.shadowBlur = 10 / zoom;
  ctx.shadowOffsetY = 4 / zoom;

  // Sticky note body
  ctx.fillStyle = color;
  if (typeof ctx.roundRect === "function") {
    ctx.beginPath();
    ctx.roundRect(x, y, width, height, 8);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, width, height);
  }

  ctx.shadowColor = "transparent";

  // Note text (dark gray ink on pastel paper)
  ctx.font = "500 16px system-ui, -apple-system, sans-serif";
  ctx.fillStyle = "#1e293b";
  ctx.textBaseline = "top";

  const padding = 14;
  const lines = text.split("\n");
  const lineHeight = 22;

  for (let i = 0; i < lines.length; i++) {
    ctx.fillText(lines[i], x + padding, y + padding + i * lineHeight, width - padding * 2);
  }

  ctx.restore();
}

/**
 * Tests if an eraser circle touches a geometric shape.
 */
export function shapeIntersectsEraser(
  shape: ShapeItem,
  ex: number,
  ey: number,
  radius: number
): boolean {
  const { type, x1, y1, x2, y2 } = shape;
  const radiusSq = radius * radius;

  switch (type) {
    case "line":
    case "arrow": {
      return distToSegmentSquared(ex, ey, x1, y1, x2, y2) <= radiusSq;
    }
    case "rectangle": {
      const minX = Math.min(x1, x2);
      const maxX = Math.max(x1, x2);
      const minY = Math.min(y1, y2);
      const maxY = Math.max(y1, y2);
      return (
        distToSegmentSquared(ex, ey, minX, minY, maxX, minY) <= radiusSq ||
        distToSegmentSquared(ex, ey, maxX, minY, maxX, maxY) <= radiusSq ||
        distToSegmentSquared(ex, ey, maxX, maxY, minX, maxY) <= radiusSq ||
        distToSegmentSquared(ex, ey, minX, maxY, minX, minY) <= radiusSq
      );
    }
    case "circle": {
      const cx = (x1 + x2) / 2;
      const cy = (y1 + y2) / 2;
      const avgR = (Math.abs(x2 - x1) + Math.abs(y2 - y1)) / 4;
      const dToCenter = Math.sqrt((ex - cx) ** 2 + (ey - cy) ** 2);
      return Math.abs(dToCenter - avgR) <= radius;
    }
    case "triangle": {
      const topX = (x1 + x2) / 2;
      const topY = y1;
      return (
        distToSegmentSquared(ex, ey, topX, topY, x2, y2) <= radiusSq ||
        distToSegmentSquared(ex, ey, x2, y2, x1, y2) <= radiusSq ||
        distToSegmentSquared(ex, ey, x1, y2, topX, topY) <= radiusSq
      );
    }
  }
}
