import type { PenStyle } from "../types/whiteboard";

export function getPenStrokeOptions(style: PenStyle | undefined, width: number) {
  switch (style) {
    // ── Chinese / East-Asian Calligraphy Brush ──────────────────────────────
    // Thick body, dramatic ink-wash taper at both ends, highly pressure-responsive
    case "brush":
      return {
        size: width * 2.8,
        thinning: 0.92,
        smoothing: 0.7,
        streamline: 0.35,
        easing: (t: number) => t * t * t,
        start: { taper: width * 5, easing: (t: number) => t * t * t, cap: true },
        end:   { taper: width * 4, easing: (t: number) => t * t * t, cap: true },
        simulatePressure: false,
        last: true,
      };

    // ── Fountain Pen ─────────────────────────────────────────────────────────
    // Elegant nib — moderate taper, flows cleanly; wider at pressure peaks
    case "fountain":
      return {
        size: width * 1.4,
        thinning: 0.65,
        smoothing: 0.65,
        streamline: 0.5,
        easing: (t: number) => Math.sin((t * Math.PI) / 2),
        start: { taper: width * 0.5, easing: (t: number) => t, cap: false },
        end:   { taper: width * 2.5, easing: (t: number) => t * t, cap: true },
        simulatePressure: false,
        last: true,
      };

    // ── Flat Marker ──────────────────────────────────────────────────────────
    // Almost zero thinning, round flat caps, constant thick line
    case "marker":
      return {
        size: width * 1.8,
        thinning: 0.08,
        smoothing: 0.8,
        streamline: 0.6,
        easing: (t: number) => t,
        start: { taper: 0, cap: true },
        end:   { taper: 0, cap: true },
        simulatePressure: false,
        last: true,
      };

    // ── Pencil ───────────────────────────────────────────────────────────────
    // Light, thin, slightly irregular — low pressure gives faint trace
    case "pencil":
      return {
        size: width * 0.9,
        thinning: 0.72,
        smoothing: 0.3,
        streamline: 0.2,
        easing: (t: number) => t,
        start: { taper: width * 0.3, cap: true },
        end:   { taper: width * 0.3, cap: true },
        simulatePressure: false,
        last: true,
      };

    // ── Chisel / Flat Calligraphy Nib ────────────────────────────────────────
    // Italic-nib effect: strokes going diagonally are thick, horizontal = thin
    case "chisel":
      return {
        size: width * 2.0,
        thinning: 0.5,
        smoothing: 0.9,
        streamline: 0.7,
        easing: (t: number) => Math.sin((t * Math.PI) / 2),
        start: { taper: 0, cap: false },
        end:   { taper: 0, cap: false },
        simulatePressure: false,
        last: true,
      };

    // ── Default Pen ──────────────────────────────────────────────────────────
    default:
    case "pen":
      return {
        size: width,
        thinning: 0.55,
        smoothing: 0.55,
        streamline: 0.45,
        easing: (t: number) => Math.sin((t * Math.PI) / 2),
        start: { taper: width * 1.8, easing: (t: number) => t * t, cap: true },
        end:   { taper: width * 1.2, easing: (t: number) => t * t, cap: true },
        simulatePressure: false,
        last: true,
      };
  }
}

export function makePfOptions(width: number, isHighlighter = false) {
  if (isHighlighter) {
    return {
      size: width,
      thinning: 0.05,
      smoothing: 0.55,
      streamline: 0.45,
      easing: (t: number) => Math.sin((t * Math.PI) / 2),
      start: { taper: 0, cap: true },
      end:   { taper: 0, cap: true },
      simulatePressure: false,
      last: true,
    };
  }
  return getPenStrokeOptions("pen", width);
}
