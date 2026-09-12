import { jsPDF } from "jspdf";
import type { Slide, StrokeWidth } from "../types/whiteboard";
import { STROKE_WIDTH_MAP } from "../types/whiteboard";
import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from "./strokePath";
import { drawShape, drawStickyNote, drawText } from "./shapeRenderer";
import { drawMathItem, getOrRenderMathImage } from "./mathRenderer";
import { getThemeColors, drawInfiniteTemplate } from "./canvasTemplates";
import { getPenStrokeOptions } from "./strokeOptions";

/**
 * Ensures all math formula SVGs and pasted images are loaded before rasterizing.
 */
async function ensureSlideAssetsLoaded(slide: Slide): Promise<void> {
  const promises: Promise<void>[] = [];

  if (slide.images) {
    for (const img of slide.images) {
      if (img.imgElement && !img.imgElement.complete) {
        promises.push(
          new Promise((resolve) => {
            img.imgElement.onload = () => resolve();
            img.imgElement.onerror = () => resolve();
          })
        );
      }
    }
  }

  if (slide.maths) {
    for (const m of slide.maths) {
      const entry = getOrRenderMathImage(m);
      if (!entry.loaded) {
        promises.push(
          new Promise((resolve) => {
            const origOnload = entry.img.onload;
            entry.img.onload = (e) => {
              if (typeof origOnload === "function") origOnload.call(entry.img, e);
              resolve();
            };
            entry.img.onerror = () => resolve();
          })
        );
      }
    }
  }

  if (promises.length > 0) {
    await Promise.race([
      Promise.all(promises),
      new Promise((resolve) => setTimeout(resolve, 800)),
    ]);
  }
}

/**
 * Renders a single slide's elements onto a dedicated 4K Ultra-HD (3840x2160) canvas
 * producing true 300+ DPI print-ready quality.
 */
export async function renderSlideToCanvas(
  slide: Slide,
  slideIndex: number,
  totalSlides: number,
  lectureTitle: string
): Promise<HTMLCanvasElement> {
  await ensureSlideAssetsLoaded(slide);

  // 4K Ultra-HD resolution (3840 x 2160, 300+ DPI print-ready quality)
  const canvas = document.createElement("canvas");
  canvas.width = 3840;
  canvas.height = 2160;
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;

  const theme = slide.boardTheme || "dark";
  const colors = getThemeColors(theme);

  // 1. Fill theme background
  ctx.fillStyle = slide.backgroundColor || colors.canvasBg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // 2. Determine slide content bounding box
  let minX = 0;
  let maxX = 1920;
  let minY = 0;
  let maxY = 1080;

  const hasContent =
    (slide.images && slide.images.length > 0) ||
    (slide.strokes && slide.strokes.length > 0) ||
    (slide.shapes && slide.shapes.length > 0) ||
    (slide.texts && slide.texts.length > 0) ||
    (slide.notes && slide.notes.length > 0) ||
    (slide.maths && slide.maths.length > 0);

  if (hasContent) {
    minX = Infinity;
    maxX = -Infinity;
    minY = Infinity;
    maxY = -Infinity;

    if (slide.images) {
      for (const img of slide.images) {
        minX = Math.min(minX, img.x);
        maxX = Math.max(maxX, img.x + img.width);
        minY = Math.min(minY, img.y);
        maxY = Math.max(maxY, img.y + img.height);
      }
    }

    if (slide.strokes) {
      for (const s of slide.strokes) {
        for (const p of s.points) {
          minX = Math.min(minX, p.x);
          maxX = Math.max(maxX, p.x);
          minY = Math.min(minY, p.y);
          maxY = Math.max(maxY, p.y);
        }
      }
    }

    if (slide.shapes) {
      for (const sh of slide.shapes) {
        minX = Math.min(minX, sh.x1, sh.x2);
        maxX = Math.max(maxX, sh.x1, sh.x2);
        minY = Math.min(minY, sh.y1, sh.y2);
        maxY = Math.max(maxY, sh.y1, sh.y2);
      }
    }

    if (slide.texts) {
      for (const t of slide.texts) {
        minX = Math.min(minX, t.x);
        maxX = Math.max(maxX, t.x + 300);
        minY = Math.min(minY, t.y);
        maxY = Math.max(maxY, t.y + 100);
      }
    }

    if (slide.notes) {
      for (const n of slide.notes) {
        minX = Math.min(minX, n.x);
        maxX = Math.max(maxX, n.x + n.width);
        minY = Math.min(minY, n.y);
        maxY = Math.max(maxY, n.y + n.height);
      }
    }

    if (slide.maths) {
      for (const m of slide.maths) {
        minX = Math.min(minX, m.x);
        maxX = Math.max(maxX, m.x + 320);
        minY = Math.min(minY, m.y);
        maxY = Math.max(maxY, m.y + 120);
      }
    }
  }

  const footerH = 80;
  const availableW = 3840;
  const availableH = 2160 - footerH;

  const padding = 120;
  const contentW = Math.max(1200, maxX - minX + padding * 2);
  const contentH = Math.max(675, maxY - minY + padding * 2);

  // 4K scaling factor relative to content (2x compared to standard 1080p)
  const scale = Math.min(availableW / contentW, availableH / contentH, 3.2);
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const targetX = availableW / 2 - cx * scale;
  const targetY = availableH / 2 - cy * scale;

  // 3. Render Background Grid/Paper Template if active
  if (slide.gridStyle && slide.gridStyle !== "none") {
    drawInfiniteTemplate(
      ctx,
      canvas.width,
      canvas.height - footerH,
      { x: targetX, y: targetY, zoom: scale },
      slide.gridStyle,
      theme
    );
  }

  ctx.save();
  ctx.translate(targetX, targetY);
  ctx.scale(scale, scale);

  // 4. Render Pasted Images / PDF Pages
  if (slide.images) {
    for (const item of slide.images) {
      if (item.imgElement && item.imgElement.complete) {
        ctx.drawImage(item.imgElement, item.x, item.y, item.width, item.height);

        if (item.isPdfPage) {
          ctx.save();
          const badgeText = `PDF • ${item.pdfName || "Document"} (p. ${item.pageNumber || 1}/${item.totalPages || 1})`;
          ctx.font = `600 ${14 / scale}px monospace`;
          ctx.fillStyle = theme === "light" ? "#0284c7" : "#38bdf8";
          ctx.fillText(badgeText, item.x, item.y - 8 / scale);
          ctx.restore();
        }
      }
    }
  }

  // 5. Render Sticky Notes
  if (slide.notes) {
    for (const note of slide.notes) {
      drawStickyNote(ctx, note, scale);
    }
  }

  // 6. Render Geometric Shapes
  if (slide.shapes) {
    for (const shape of slide.shapes) {
      drawShape(ctx, shape, scale);
    }
  }

  // 7. Render Highlighters
  if (slide.strokes) {
    for (const stroke of slide.strokes) {
      if (!stroke.isHighlighter || stroke.points.length < 2) continue;
      const baseWidth = STROKE_WIDTH_MAP[stroke.width as StrokeWidth] ?? 6;
      const inputPoints = stroke.points.map((p) => [p.x, p.y, p.pressure]);
      const outline = getStroke(inputPoints, getPenStrokeOptions("marker", baseWidth));
      const pathData = getSvgPathFromStroke(outline);

      ctx.save();
      ctx.fillStyle = stroke.color;
      ctx.globalAlpha = 0.35;
      ctx.fill(new Path2D(pathData));
      ctx.restore();
    }
  }

  // 8. Render Pen Ink Strokes with authentic pen styles (Gel, Fountain, Brush, etc.)
  if (slide.strokes) {
    for (const stroke of slide.strokes) {
      if (stroke.isHighlighter || stroke.isEraser || stroke.points.length < 2) continue;
      const baseWidth = STROKE_WIDTH_MAP[stroke.width as StrokeWidth] ?? 6;
      const inputPoints = stroke.points.map((p) => [p.x, p.y, p.pressure]);
      const pfOptions = getPenStrokeOptions(stroke.penStyle ?? "pen", baseWidth);
      const outline = getStroke(inputPoints, pfOptions);
      const pathData = getSvgPathFromStroke(outline);

      ctx.save();
      ctx.fillStyle = stroke.color;
      ctx.fill(new Path2D(pathData));
      ctx.restore();
    }
  }

  // 9. Render Typed Text Items
  if (slide.texts) {
    for (const textItem of slide.texts) {
      drawText(ctx, textItem, scale);
    }
  }

  // 10. Render LaTeX Math Formulas with KaTeX
  if (slide.maths) {
    for (const mathItem of slide.maths) {
      drawMathItem(ctx, mathItem, scale);
    }
  }

  ctx.restore();

  // 11. Render Bottom Studio Watermark / Footer Banner in 4K
  ctx.save();
  const isDark = theme !== "light";
  ctx.fillStyle = isDark ? "rgba(18, 18, 22, 0.95)" : "rgba(241, 245, 249, 0.95)";
  ctx.fillRect(0, 2160 - footerH, 3840, footerH);

  ctx.strokeStyle = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, 2160 - footerH);
  ctx.lineTo(3840, 2160 - footerH);
  ctx.stroke();

  ctx.font = "bold 26px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = isDark ? "#38bdf8" : "#0284c7";
  ctx.fillText("✦ Scribe Studio", 48, 2160 - 30);

  ctx.font = "500 24px 'Plus Jakarta Sans', sans-serif";
  ctx.fillStyle = isDark ? "#a1a1aa" : "#64748b";
  ctx.fillText(`Lecture: ${lectureTitle}`, 280, 2160 - 30);

  const pageLabel = `Slide ${slideIndex + 1} of ${totalSlides}`;
  const labelWidth = ctx.measureText(pageLabel).width;
  ctx.fillStyle = isDark ? "#e4e4e7" : "#1e293b";
  ctx.fillText(pageLabel, 3840 - 48 - labelWidth, 2160 - 30);
  ctx.restore();

  return canvas;
}

/**
 * Compiles all lecture slides into a single multi-page PDF notes document with
 * 4K Ultra-HD resolution (300 DPI) and lossless PNG embedding.
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

    const slideCanvas = await renderSlideToCanvas(slides[i], i, total, lectureTitle);
    // Lossless PNG encoding for pixel-perfect clarity without JPEG compression noise
    const dataUrl = slideCanvas.toDataURL("image/png");

    if (i > 0) {
      pdf.addPage([1920, 1080], "landscape");
    }

    // Embed 3840x2160 PNG into 1920x1080 PDF page -> Retina 2x (300 DPI)
    pdf.addImage(dataUrl, "PNG", 0, 0, 1920, 1080, undefined, "FAST");
  }

  const safeTitle = lectureTitle
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .trim()
    .replace(/\s+/g, "_");

  pdf.save(`${safeTitle || "Lecture"}_Class_Notes_HD.pdf`);
}

/**
 * Exports a single lecture slide as a crystal-clear 4K Ultra-HD (3840x2160, 300 DPI) PNG image.
 */
export async function exportSlideAsHighResPng(
  slide: Slide,
  lectureTitle: string,
  slideIndex = 0,
  totalSlides = 1
): Promise<string> {
  const slideCanvas = await renderSlideToCanvas(slide, slideIndex, totalSlides, lectureTitle);
  const dataUrl = slideCanvas.toDataURL("image/png");

  const safeTitle = lectureTitle
    .replace(/[^a-zA-Z0-9_\- ]/g, "")
    .trim()
    .replace(/\s+/g, "_") || "Lecture";

  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = `ScribeStudio_${safeTitle}_Slide_${slideIndex + 1}_4K.png`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);

  return dataUrl;
}
