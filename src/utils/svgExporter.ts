import type { Slide, BoardTheme } from "../types/whiteboard";
import { STROKE_WIDTH_MAP } from "../types/whiteboard";
import { getStroke } from "perfect-freehand";
import { getSvgPathFromStroke } from "./strokePath";
import { getThemeColors } from "./canvasTemplates";
import { getPenStrokeOptions, makePfOptions } from "./strokeOptions";

export function generateSlideSvg(
  slide: Slide,
  theme: BoardTheme = "dark",
  width: number = 1920,
  height: number = 1080
): string {
  const colors = getThemeColors(theme);
  const slideW = width;
  const slideH = height;
  const originX = slideW / 2;
  const originY = slideH / 2;

  let svgElements: string[] = [];

  // 1. Background Rect
  svgElements.push(
    `<rect x="0" y="0" width="${slideW}" height="${slideH}" fill="${colors.canvasBg}" />`
  );

  // 2. Highlighters (Rendered under everything)
  for (const stroke of slide.strokes) {
    if (!stroke.isHighlighter || stroke.points.length < 2) continue;
    const rawPoints = stroke.points.map((p) => [p.x + originX, p.y + originY, p.pressure]);
    const baseWidth = (STROKE_WIDTH_MAP[stroke.width] ?? 6) * 2.8;
    const pfOptions = makePfOptions(baseWidth, true);
    const outlinePoints = getStroke(rawPoints, pfOptions);
    const pathD = getSvgPathFromStroke(outlinePoints);
    if (pathD) {
      svgElements.push(
        `<path d="${pathD}" fill="${stroke.color}" opacity="0.38" />`
      );
    }
  }

  // 3. Shapes
  for (const shape of slide.shapes) {
    const x1 = shape.x1 + originX;
    const y1 = shape.y1 + originY;
    const x2 = shape.x2 + originX;
    const y2 = shape.y2 + originY;
    const strokeColor = shape.color;
    const strokeW = shape.width === "thin" ? 2 : shape.width === "thick" ? 6 : 4;
    const isDash = shape.lineStyle === "dashed" ? 'stroke-dasharray="8 6"' : shape.lineStyle === "dotted" ? 'stroke-dasharray="2 6"' : "";
    const fill = shape.fillStyle === "semi" ? `fill="${strokeColor}" fill-opacity="0.18"` : 'fill="none"';

    switch (shape.type) {
      case "rectangle": {
        const rx = Math.min(x1, x2);
        const ry = Math.min(y1, y2);
        const rw = Math.abs(x2 - x1);
        const rh = Math.abs(y2 - y1);
        svgElements.push(
          `<rect x="${rx}" y="${ry}" width="${rw}" height="${rh}" stroke="${strokeColor}" stroke-width="${strokeW}" ${fill} ${isDash} rx="4" />`
        );
        break;
      }
      case "circle": {
        const cx = (x1 + x2) / 2;
        const cy = (y1 + y2) / 2;
        const rx = Math.abs(x2 - x1) / 2;
        const ry = Math.abs(y2 - y1) / 2;
        svgElements.push(
          `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" stroke="${strokeColor}" stroke-width="${strokeW}" ${fill} ${isDash} />`
        );
        break;
      }
      case "line": {
        svgElements.push(
          `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="${strokeW}" ${isDash} stroke-linecap="round" />`
        );
        break;
      }
      case "arrow": {
        svgElements.push(
          `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${strokeColor}" stroke-width="${strokeW}" ${isDash} stroke-linecap="round" />`
        );
        break;
      }
    }
  }

  // 4. Solid Pen Strokes
  for (const stroke of slide.strokes) {
    if (stroke.isHighlighter || stroke.points.length < 2) continue;
    const rawPoints = stroke.points.map((p) => [p.x + originX, p.y + originY, p.pressure]);
    const baseWidth = STROKE_WIDTH_MAP[stroke.width] ?? 4;
    const pfOptions = getPenStrokeOptions(stroke.penStyle ?? "pen", baseWidth);
    const outlinePoints = getStroke(rawPoints, pfOptions);
    const pathD = getSvgPathFromStroke(outlinePoints);
    if (pathD) {
      svgElements.push(
        `<path d="${pathD}" fill="${stroke.color}" opacity="${stroke.penStyle === "pencil" ? 0.75 : 1}" />`
      );
    }
  }

  // 5. Texts
  for (const text of slide.texts) {
    const tx = text.x + originX;
    const ty = text.y + originY + (text.fontSize || 20);
    svgElements.push(
      `<text x="${tx}" y="${ty}" fill="${text.color}" font-size="${text.fontSize || 20}" font-family="system-ui, sans-serif">${text.text}</text>`
    );
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${slideW} ${slideH}" width="${slideW}" height="${slideH}">
  ${svgElements.join("\n  ")}
</svg>`;
}

export function downloadSlideSvg(slide: Slide, title: string = "Scribe_Studio_Notes", theme: BoardTheme = "dark") {
  const svgContent = generateSlideSvg(slide, theme);
  const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${title.replace(/[^a-zA-Z0-9_-]/g, "_")}.svg`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
