import type { Camera, GridStyle, BoardTheme } from "../types/whiteboard";

export interface ThemeColors {
  canvasBg: string;
  sheetBg: string;
  primaryLine: string;
  secondaryLine: string;
  majorLine: string;
  dots: string;
  marginLine: string;
  accent: string;
  subtleText: string;
}

export const THEME_CONFIGS: Record<BoardTheme, ThemeColors> = {
  dark: {
    canvasBg: "#090d13",
    sheetBg: "#121820",
    primaryLine: "rgba(255, 255, 255, 0.18)",
    secondaryLine: "rgba(255, 255, 255, 0.09)",
    majorLine: "rgba(56, 189, 248, 0.40)",
    dots: "rgba(255, 255, 255, 0.25)",
    marginLine: "rgba(251, 113, 133, 0.60)",
    accent: "#38BDF8",
    subtleText: "rgba(255, 255, 255, 0.45)",
  },
  light: {
    canvasBg: "#f8fafc",
    sheetBg: "#ffffff",
    primaryLine: "rgba(15, 23, 42, 0.18)",
    secondaryLine: "rgba(15, 23, 42, 0.08)",
    majorLine: "rgba(37, 99, 235, 0.40)",
    dots: "rgba(15, 23, 42, 0.28)",
    marginLine: "rgba(225, 29, 72, 0.60)",
    accent: "#2563EB",
    subtleText: "rgba(15, 23, 42, 0.50)",
  },
  blueprint: {
    canvasBg: "#071b30",
    sheetBg: "#0a2544",
    primaryLine: "rgba(56, 189, 248, 0.30)",
    secondaryLine: "rgba(56, 189, 248, 0.15)",
    majorLine: "rgba(56, 189, 248, 0.60)",
    dots: "rgba(56, 189, 248, 0.42)",
    marginLine: "rgba(253, 224, 71, 0.65)",
    accent: "#38BDF8",
    subtleText: "rgba(56, 189, 248, 0.60)",
  },
};

export function getThemeColors(theme: BoardTheme = "dark"): ThemeColors {
  return THEME_CONFIGS[theme] || THEME_CONFIGS.dark;
}

/**
 * ── Renders the infinite canvas background grid/template in screen coordinates ──
 */
export function drawInfiniteTemplate(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  cam: Camera,
  style: GridStyle,
  theme: BoardTheme = "dark"
) {
  if (style === "none") return;

  const colors = getThemeColors(theme);
  ctx.save();

  switch (style) {
    case "dots": {
      const baseStep = 40;
      let step = baseStep;
      while (step * cam.zoom < 24) step *= 2;
      while (step * cam.zoom > 100) step /= 2;

      const screenStep = step * cam.zoom;
      const startX = ((cam.x % screenStep) + screenStep) % screenStep;
      const startY = ((cam.y % screenStep) + screenStep) % screenStep;

      ctx.fillStyle = colors.dots;
      const dotRadius = Math.max(1, 1.2 * Math.min(1.4, cam.zoom));
      for (let x = startX; x < width; x += screenStep) {
        for (let y = startY; y < height; y += screenStep) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case "grid": {
      // Cartesian Math Graph Paper with Major (5x) & Minor lines
      const minorWorldStep = 32;
      const majorWorldStep = minorWorldStep * 5;
      const screenMinor = minorWorldStep * cam.zoom;
      const screenMajor = majorWorldStep * cam.zoom;

      if (screenMinor >= 10) {
        // Minor grid lines
        ctx.strokeStyle = colors.secondaryLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        const startMinorX = ((cam.x % screenMinor) + screenMinor) % screenMinor;
        for (let x = startMinorX; x < width; x += screenMinor) {
          ctx.moveTo(x, 0);
          ctx.lineTo(x, height);
        }
        const startMinorY = ((cam.y % screenMinor) + screenMinor) % screenMinor;
        for (let y = startMinorY; y < height; y += screenMinor) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();
      }

      // Major grid lines
      ctx.strokeStyle = colors.primaryLine;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      const startMajorX = ((cam.x % screenMajor) + screenMajor) % screenMajor;
      for (let x = startMajorX; x < width; x += screenMajor) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      const startMajorY = ((cam.y % screenMajor) + screenMajor) % screenMajor;
      for (let y = startMajorY; y < height; y += screenMajor) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
      break;
    }

    case "ruled": {
      // Horizontal college-ruled lines
      const lineWorldStep = 36;
      const screenStep = lineWorldStep * cam.zoom;
      if (screenStep < 8) break;

      const startY = ((cam.y % screenStep) + screenStep) % screenStep;

      ctx.strokeStyle = colors.primaryLine;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let y = startY; y < height; y += screenStep) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Subtle vertical pink/coral margin guide at left
      const marginScreenX = cam.x + 160 * cam.zoom;
      if (marginScreenX >= 0 && marginScreenX <= width) {
        ctx.strokeStyle = colors.marginLine;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(marginScreenX, 0);
        ctx.lineTo(marginScreenX, height);
        ctx.stroke();
      }
      break;
    }

    case "cornell": {
      // Cornell notes system in infinite mode
      const lineWorldStep = 36;
      const screenStep = lineWorldStep * cam.zoom;
      if (screenStep >= 8) {
        const startY = ((cam.y % screenStep) + screenStep) % screenStep;
        ctx.strokeStyle = colors.secondaryLine;
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let y = startY; y < height; y += screenStep) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y);
        }
        ctx.stroke();
      }

      // Vertical separator separating Cue / Recall column
      const cueScreenX = cam.x - 300 * cam.zoom;
      if (cueScreenX >= 0 && cueScreenX <= width) {
        ctx.strokeStyle = colors.majorLine;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cueScreenX, 0);
        ctx.lineTo(cueScreenX, height);
        ctx.stroke();
      }
      break;
    }

    case "isometric": {
      // 3D Isometric grid (30°, 90°, 150°)
      const gridWorld = 40;
      const screenStep = gridWorld * cam.zoom;
      if (screenStep < 14) break;

      ctx.strokeStyle = colors.primaryLine;
      ctx.lineWidth = 1;

      // 1. Vertical lines (90°)
      ctx.beginPath();
      const startX = ((cam.x % screenStep) + screenStep) % screenStep;
      for (let x = startX; x < width; x += screenStep) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      ctx.stroke();

      // 2. Diagonal lines at 30° and 150° (dy = dx * tan(30°) = dx * 0.57735)
      const hStep = screenStep * Math.sqrt(3);
      if (hStep > 6) {
        ctx.strokeStyle = colors.secondaryLine;
        ctx.beginPath();
        // 30 degree diagonals
        const yStart30 = ((cam.y % hStep) + hStep) % hStep - height;
        for (let y = yStart30; y < height * 2; y += hStep) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y + width / Math.sqrt(3));
        }
        // 150 degree diagonals
        const yStart150 = ((cam.y % hStep) + hStep) % hStep;
        for (let y = yStart150; y < height * 2; y += hStep) {
          ctx.moveTo(0, y);
          ctx.lineTo(width, y - width / Math.sqrt(3));
        }
        ctx.stroke();
      }
      break;
    }

    case "music": {
      // Groups of 5 parallel horizontal stave lines
      const lineSpacing = 10 * cam.zoom;
      const staveGap = 55 * cam.zoom;
      const totalStaveHeight = lineSpacing * 4 + staveGap;
      if (totalStaveHeight < 16) break;

      const startStaveY = ((cam.y % totalStaveHeight) + totalStaveHeight) % totalStaveHeight - totalStaveHeight;

      ctx.strokeStyle = colors.primaryLine;
      ctx.lineWidth = 1;
      ctx.beginPath();

      for (let sy = startStaveY; sy < height + totalStaveHeight; sy += totalStaveHeight) {
        for (let i = 0; i < 5; i++) {
          const ly = sy + i * lineSpacing;
          if (ly >= 0 && ly <= height) {
            ctx.moveTo(0, ly);
            ctx.lineTo(width, ly);
          }
        }
      }
      ctx.stroke();

      // Subtle vertical measure bar lines
      const barStep = 320 * cam.zoom;
      if (barStep > 40) {
        ctx.strokeStyle = colors.secondaryLine;
        ctx.beginPath();
        const startBarX = ((cam.x % barStep) + barStep) % barStep;
        for (let bx = startBarX; bx < width; bx += barStep) {
          for (let sy = startStaveY; sy < height + totalStaveHeight; sy += totalStaveHeight) {
            ctx.moveTo(bx, sy);
            ctx.lineTo(bx, sy + 4 * lineSpacing);
          }
        }
        ctx.stroke();
      }
      break;
    }
  }

  ctx.restore();
}

/**
 * ── Renders the template inside a bounded 16:9 presentation slide (World Coordinates) ──
 */
export function drawBoundedSheetTemplate(
  ctx: CanvasRenderingContext2D,
  slideX: number,
  slideY: number,
  slideW: number,
  slideH: number,
  cam: Camera,
  style: GridStyle,
  theme: BoardTheme = "dark"
) {
  if (style === "none") return;

  const colors = getThemeColors(theme);
  ctx.save();

  // Clip strictly to slide boundaries
  ctx.beginPath();
  ctx.rect(slideX, slideY, slideW, slideH);
  ctx.clip();

  switch (style) {
    case "dots": {
      const gridSpacing = 40;
      ctx.fillStyle = colors.dots;
      const dotRadius = 1.4 / cam.zoom;
      for (let gx = slideX + gridSpacing; gx < slideX + slideW; gx += gridSpacing) {
        for (let gy = slideY + gridSpacing; gy < slideY + slideH; gy += gridSpacing) {
          ctx.beginPath();
          ctx.arc(gx, gy, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }

    case "grid": {
      // Math Graph Paper with minor and major lines
      const minorSpacing = 32;
      const majorSpacing = 160;

      // Minor lines
      ctx.strokeStyle = colors.secondaryLine;
      ctx.lineWidth = 0.8 / cam.zoom;
      ctx.beginPath();
      for (let gx = slideX + minorSpacing; gx < slideX + slideW; gx += minorSpacing) {
        ctx.moveTo(gx, slideY);
        ctx.lineTo(gx, slideY + slideH);
      }
      for (let gy = slideY + minorSpacing; gy < slideY + slideH; gy += minorSpacing) {
        ctx.moveTo(slideX, gy);
        ctx.lineTo(slideX + slideW, gy);
      }
      ctx.stroke();

      // Major lines
      ctx.strokeStyle = colors.primaryLine;
      ctx.lineWidth = 1.2 / cam.zoom;
      ctx.beginPath();
      for (let gx = slideX + majorSpacing; gx < slideX + slideW; gx += majorSpacing) {
        ctx.moveTo(gx, slideY);
        ctx.lineTo(gx, slideY + slideH);
      }
      for (let gy = slideY + majorSpacing; gy < slideY + slideH; gy += majorSpacing) {
        ctx.moveTo(slideX, gy);
        ctx.lineTo(slideX + slideW, gy);
      }
      ctx.stroke();
      break;
    }

    case "ruled": {
      // Lined Notebook Paper with Left Margin Line
      const lineSpacing = 36;
      const marginX = slideX + 220; // classic margin placement

      // Horizontal lines
      ctx.strokeStyle = colors.primaryLine;
      ctx.lineWidth = 1 / cam.zoom;
      ctx.beginPath();
      for (let gy = slideY + 80; gy < slideY + slideH - 40; gy += lineSpacing) {
        ctx.moveTo(slideX + 30, gy);
        ctx.lineTo(slideX + slideW - 30, gy);
      }
      ctx.stroke();

      // Vertical Margin Guide Line (Rose / Crimson)
      ctx.strokeStyle = colors.marginLine;
      ctx.lineWidth = 1.8 / cam.zoom;
      ctx.beginPath();
      ctx.moveTo(marginX, slideY + 20);
      ctx.lineTo(marginX, slideY + slideH - 20);
      ctx.stroke();

      // Header Rule Line
      ctx.strokeStyle = colors.primaryLine;
      ctx.lineWidth = 1.5 / cam.zoom;
      ctx.beginPath();
      ctx.moveTo(slideX + 30, slideY + 80);
      ctx.lineTo(slideX + slideW - 30, slideY + 80);
      ctx.stroke();
      break;
    }

    case "cornell": {
      // Standard Cornell Notes Template
      const headerH = 90;
      const footerH = 150;
      const cueColW = 440; // ~23% of 1920 width
      const contentY = slideY + headerH;
      const cueX = slideX + cueColW;
      const footerY = slideY + slideH - footerH;

      // 1. Top Header Divider
      ctx.strokeStyle = colors.majorLine;
      ctx.lineWidth = 2 / cam.zoom;
      ctx.beginPath();
      ctx.moveTo(slideX + 24, contentY);
      ctx.lineTo(slideX + slideW - 24, contentY);
      ctx.stroke();

      // Header Labels
      ctx.fillStyle = colors.subtleText;
      ctx.font = `${Math.max(12, Math.round(14 / cam.zoom))}px system-ui, sans-serif`;
      ctx.fillText("CORNELL NOTES • TOPIC / OBJECTIVE", slideX + 40, slideY + 45);

      // 2. Vertical Cue Column Divider
      ctx.beginPath();
      ctx.moveTo(cueX, contentY);
      ctx.lineTo(cueX, footerY);
      ctx.stroke();

      // Cue Column Label
      ctx.fillText("CUES / RECALL / QUESTIONS", slideX + 40, contentY + 36);

      // Notes Column Label
      ctx.fillText("LECTURE NOTES & DIAGRAMS", cueX + 40, contentY + 36);

      // 3. Horizontal Ruled Lines in Notes Column
      const lineSpacing = 36;
      ctx.strokeStyle = colors.secondaryLine;
      ctx.lineWidth = 1 / cam.zoom;
      ctx.beginPath();
      for (let gy = contentY + 54; gy < footerY - 20; gy += lineSpacing) {
        ctx.moveTo(cueX + 20, gy);
        ctx.lineTo(slideX + slideW - 30, gy);
      }
      ctx.stroke();

      // 4. Bottom Summary Divider
      ctx.strokeStyle = colors.majorLine;
      ctx.lineWidth = 2 / cam.zoom;
      ctx.beginPath();
      ctx.moveTo(slideX + 24, footerY);
      ctx.lineTo(slideX + slideW - 24, footerY);
      ctx.stroke();

      // Summary Label
      ctx.fillText("SUMMARY", slideX + 40, footerY + 36);
      break;
    }

    case "isometric": {
      // 3D Isometric Triangle Grid
      const step = 45;
      ctx.strokeStyle = colors.primaryLine;
      ctx.lineWidth = 0.8 / cam.zoom;

      // Vertical lines
      ctx.beginPath();
      for (let gx = slideX; gx <= slideX + slideW; gx += step) {
        ctx.moveTo(gx, slideY);
        ctx.lineTo(gx, slideY + slideH);
      }
      ctx.stroke();

      // Diagonal lines (30° and 150°)
      const hStep = step * Math.sqrt(3);
      ctx.strokeStyle = colors.secondaryLine;
      ctx.beginPath();

      for (let gy = slideY - slideW / Math.sqrt(3); gy <= slideY + slideH + slideW / Math.sqrt(3); gy += hStep) {
        // 30 degree lines
        ctx.moveTo(slideX, gy);
        ctx.lineTo(slideX + slideW, gy + slideW / Math.sqrt(3));
        // 150 degree lines
        ctx.moveTo(slideX, gy);
        ctx.lineTo(slideX + slideW, gy - slideW / Math.sqrt(3));
      }
      ctx.stroke();
      break;
    }

    case "music": {
      // Music Staves (groups of 5 lines)
      const lineSpacing = 12;
      const staveGap = 70;
      const startStaveY = slideY + 90;
      const endStaveY = slideY + slideH - 80;

      ctx.strokeStyle = colors.primaryLine;
      ctx.lineWidth = 1.2 / cam.zoom;

      for (let sy = startStaveY; sy + lineSpacing * 4 <= endStaveY; sy += lineSpacing * 4 + staveGap) {
        ctx.beginPath();
        for (let i = 0; i < 5; i++) {
          const ly = sy + i * lineSpacing;
          ctx.moveTo(slideX + 60, ly);
          ctx.lineTo(slideX + slideW - 60, ly);
        }
        ctx.stroke();

        // Left clef bar line
        ctx.lineWidth = 2 / cam.zoom;
        ctx.beginPath();
        ctx.moveTo(slideX + 60, sy);
        ctx.lineTo(slideX + 60, sy + 4 * lineSpacing);
        ctx.stroke();

        // Measure barlines across each staff (divide into 4 measures)
        const measureW = (slideW - 120) / 4;
        ctx.lineWidth = 1 / cam.zoom;
        ctx.beginPath();
        for (let m = 1; m < 4; m++) {
          const mx = slideX + 60 + m * measureW;
          ctx.moveTo(mx, sy);
          ctx.lineTo(mx, sy + 4 * lineSpacing);
        }
        // Double barline at end of last staff
        const endX = slideX + slideW - 60;
        ctx.moveTo(endX, sy);
        ctx.lineTo(endX, sy + 4 * lineSpacing);
        ctx.stroke();
      }
      break;
    }
  }

  ctx.restore();
}
