import { jsPDF } from "jspdf";
import type { Slide } from "../types/whiteboard";
import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from "./strokePath";
import { drawShape, drawStickyNote, drawText } from "./shapeRenderer";

function makePfOptions(width: number, isHighlighter = false) {
  return {
    size: width,
    thinning: isHighlighter ? 0.05 : 0.55,
    smoothing: 0.55,
    streamline: 0.45,
    easing: (t: number) => Math.sin((t * Math.PI) / 2),
    start: {
      taper: isHighlighter ? 0 : width * 1.8,
      cap: true,
    },
    end: {
      taper: isHighlighter ? 0 : width * 1.8,
      cap: true,
    },
  };
}

const STROKE_WIDTH_MAP: Record<string, number> = {
  thin: 3,
  medium: 6,
  thick: 12,
};

/**
 * Renders a single slide's elements onto a dedicated 1920x1080 canvas.
 */
function renderSlideToCanvas(
  slide: Slide,
  slideIndex: number,
  totalSlides: number,
  lectureTitle: string
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = 1920;
  canvas.height = 1080;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  // 1. Fill deep blackboard background
  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Determine slide content bounding box to fit 16:9 canvas
  let minX = 0;
  let maxX = 1920;
  let minY = 0;
  let maxY = 1080;

  const hasContent =
    slide.images.length > 0 ||
    slide.strokes.length > 0 ||
    slide.shapes.length > 0 ||
    slide.texts.length > 0 ||
    slide.notes.length > 0;

  if (hasContent) {
    minX = Infinity;
    maxX = -Infinity;
    minY = Infinity;
    maxY = -Infinity;

    for (const img of slide.images) {
      minX = Math.min(minX, img.x);
      maxX = Math.max(maxX, img.x + img.width);
      minY = Math.min(minY, img.y);
      maxY = Math.max(maxY, img.y + img.height);
    }

    for (const s of slide.strokes) {
      for (const p of s.points) {
        minX = Math.min(minX, p.x);
        maxX = Math.max(maxX, p.x);
        minY = Math.min(minY, p.y);
        maxY = Math.max(maxY, p.y);
      }
    }

    for (const sh of slide.shapes) {
      minX = Math.min(minX, sh.x1, sh.x2);
      maxX = Math.max(maxX, sh.x1, sh.x2);
      minY = Math.min(minY, sh.y1, sh.y2);
      maxY = Math.max(maxY, sh.y1, sh.y2);
    }

    for (const t of slide.texts) {
      minX = Math.min(minX, t.x);
      maxX = Math.max(maxX, t.x + 300);
      minY = Math.min(minY, t.y);
      maxY = Math.max(maxY, t.y + 100);
    }

    for (const n of slide.notes) {
      minX = Math.min(minX, n.x);
      maxX = Math.max(maxX, n.x + n.width);
      minY = Math.min(minY, n.y);
      maxY = Math.max(maxY, n.y + n.height);
    }
  }

  // If slide has images/PDF page, give padding
  const padding = 60;
  const contentW = Math.max(800, maxX - minX + padding * 2);
  const contentH = Math.max(450, maxY - minY + padding * 2);

  const scale = Math.min(1920 / contentW, (1080 - 60) / contentH, 1.5);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const targetX = 1920 / 2 - cx * scale;
  const targetY = (1080 - 40) / 2 - cy * scale;

  ctx.save();
  ctx.translate(targetX, targetY);
  ctx.scale(scale, scale);

  // 3. Render Pasted Images / PDF Pages
  for (const item of slide.images) {
    if (item.imgElement && item.imgElement.complete) {
      ctx.drawImage(item.imgElement, item.x, item.y, item.width, item.height);

      if (item.isPdfPage) {
        ctx.save();
        const badgeText = `PDF • ${item.pdfName || "Document"} (p. ${item.pageNumber || 1}/${item.totalPages || 1})`;
        ctx.font = `600 12px monospace`;
        ctx.fillStyle = "#38bdf8";
        ctx.fillText(badgeText, item.x, item.y - 8);
        ctx.restore();
      }
    }
  }

  // 4. Render Sticky Notes
  for (const note of slide.notes) {
    drawStickyNote(ctx, note, scale);
  }

  // 5. Render Shapes
  for (const shape of slide.shapes) {
    drawShape(ctx, shape, scale);
  }

  // 6. Render Highlighters
  for (const stroke of slide.strokes) {
    if (!stroke.isHighlighter || stroke.points.length < 2) continue;
    const size = STROKE_WIDTH_MAP[stroke.width] ?? 6;
    const inputPoints = stroke.points.map((p) => [p.x, p.y, p.pressure]);
    const outline = getStroke(inputPoints, makePfOptions(size, true));
    const pathData = getSvgPathFromStroke(outline);

    ctx.save();
    ctx.fillStyle = stroke.color;
    ctx.globalAlpha = 0.35;
    ctx.fill(new Path2D(pathData));
    ctx.restore();
  }

  // 7. Render Normal Ink Strokes
  for (const stroke of slide.strokes) {
    if (stroke.isHighlighter || stroke.isEraser || stroke.points.length < 2) continue;
    const size = STROKE_WIDTH_MAP[stroke.width] ?? 6;
    const inputPoints = stroke.points.map((p) => [p.x, p.y, p.pressure]);
    const outline = getStroke(inputPoints, makePfOptions(size, false));
    const pathData = getSvgPathFromStroke(outline);

    ctx.save();
    ctx.fillStyle = stroke.color;
    ctx.fill(new Path2D(pathData));
    ctx.restore();
  }

  // 8. Render Typed Text Items
  for (const textItem of slide.texts) {
    drawText(ctx, textItem, scale);
  }

  ctx.restore();

  // 9. Render Bottom Studio Banner / Watermark
  ctx.save();
  ctx.fillStyle = "rgba(24, 24, 27, 0.9)";
  ctx.fillRect(0, 1080 - 40, 1920, 40);

  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, 1080 - 40);
  ctx.lineTo(1920, 1080 - 40);
  ctx.stroke();

  ctx.font = "600 13px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "#38bdf8";
  ctx.fillText("✦ Scribe Studio", 32, 1080 - 15);

  ctx.font = "500 13px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = "#a1a1aa";
  ctx.fillText(`Lecture: ${lectureTitle}`, 160, 1080 - 15);

  const pageLabel = `Slide ${slideIndex + 1} of ${totalSlides}`;
  const labelWidth = ctx.measureText(pageLabel).width;
  ctx.fillStyle = "#e4e4e7";
  ctx.fillText(pageLabel, 1920 - 32 - labelWidth, 1080 - 15);
  ctx.restore();

  return canvas;
}

/**
 * Compiles all lecture slides into a single multi-page PDF notes document.
 */
export async function exportClassNotesPdf(
  slides: Slide[],
  lectureTitle: string,
  onProgress?: (current: number, total: number) => void
): Promise<void> {
  if (!slides || slides.length === 0) return;

  const pdf = new jsPDF({
    orientation: "landscape",
    unit: "px",
    format: [1920, 1080],
    compress: true,
  });

  const total = slides.length;

  for (let i = 0; i < total; i++) {
    if (onProgress) onProgress(i + 1, total);

    const slideCanvas = renderSlideToCanvas(slides[i], i, total, lectureTitle);
    const dataUrl = slideCanvas.toDataURL("image/jpeg", 0.88);

    if (i > 0) {
      pdf.addPage([1920, 1080], "landscape");
    }

    pdf.addImage(dataUrl, "JPEG", 0, 0, 1920, 1080);
  }

  const safeTitle = lectureTitle
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .trim()
    .replace(/\s+/g, "_");

  pdf.save(`${safeTitle || "Lecture"}_Class_Notes.pdf`);
}
