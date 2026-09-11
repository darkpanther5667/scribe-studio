import katex from "katex";
import type { MathItem } from "../types/whiteboard";

interface RenderedMathCache {
  img: HTMLImageElement;
  width: number;
  height: number;
  loaded: boolean;
}

const mathCache = new Map<string, RenderedMathCache>();

/**
 * Pre-renders and caches a LaTeX equation as an offscreen SVG image
 */
export function getOrRenderMathImage(
  item: MathItem,
  onLoaded?: () => void
): RenderedMathCache {
  const cacheKey = `${item.latex}::${item.color}::${item.fontSize}`;
  const existing = mathCache.get(cacheKey);
  if (existing) return existing;

  let html = "";
  try {
    html = katex.renderToString(item.latex, {
      displayMode: true,
      throwOnError: false,
    });
  } catch {
    html = `<span style="color:red;">Error parsing LaTeX</span>`;
  }

  // Estimate canvas size based on fontSize and expression length
  const approxWidth = Math.max(120, item.latex.length * item.fontSize * 0.9);
  const approxHeight = Math.max(50, item.fontSize * 2.6);

  const svgContent = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${approxWidth}" height="${approxHeight}">
      <foreignObject width="100%" height="100%">
        <div xmlns="http://www.w3.org/1999/xhtml" style="color: ${item.color}; font-size: ${item.fontSize}px; display: inline-block; white-space: nowrap;">
          ${html}
        </div>
      </foreignObject>
    </svg>
  `;

  const blob = new Blob([svgContent], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const img = new Image();

  const cacheEntry: RenderedMathCache = {
    img,
    width: approxWidth,
    height: approxHeight,
    loaded: false,
  };

  img.onload = () => {
    cacheEntry.loaded = true;
    URL.revokeObjectURL(url);
    if (onLoaded) onLoaded();
  };
  img.onerror = () => {
    cacheEntry.loaded = false;
    URL.revokeObjectURL(url);
  };

  img.src = url;
  mathCache.set(cacheKey, cacheEntry);
  return cacheEntry;
}

/**
 * Draws a MathItem on the 2D canvas context
 */
export function drawMathItem(
  ctx: CanvasRenderingContext2D,
  item: MathItem,
  _zoom = 1,
  onLoaded?: () => void
): void {
  const entry = getOrRenderMathImage(item, onLoaded);
  if (entry.loaded) {
    ctx.drawImage(entry.img, item.x, item.y, entry.width, entry.height);
  } else {
    // Fallback while rendering image
    ctx.save();
    ctx.fillStyle = item.color;
    ctx.font = `600 ${item.fontSize}px 'KaTeX_Main', serif`;
    ctx.textBaseline = "top";
    ctx.fillText(item.latex, item.x, item.y);
    ctx.restore();
  }
}
