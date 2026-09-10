import type { PressureCurve } from "../types/whiteboard";

/**
 * Calibrates raw hardware pressure from graphics tablets (Huion, Wacom, Apple Pencil, XP-Pen).
 *
 * Huion tablets provide 4096 or 8192 levels of pressure reported as a floating point
 * number between 0.0000 and 1.0000.
 *
 * A non-linear power/gamma curve aligns physical hand effort with digital line thickness,
 * preventing hairline vanishing when writing gently, and preventing screen strain.
 */
export function calibratePressure(
  rawPressure: number,
  pointerType: string,
  curve: PressureCurve = "medium"
): number {
  // If input is from a standard mouse without pressure
  if (pointerType === "mouse") {
    return 0.5;
  }

  // If input is from touch without pressure support
  if (pointerType === "touch" && rawPressure <= 0) {
    return 0.5;
  }

  // Fixed line width mode (e.g. constant dry-erase marker feel)
  if (curve === "off") {
    return 0.5;
  }

  // Ensure raw pressure is bounded
  const p = Math.max(0.01, Math.min(1, rawPressure));

  switch (curve) {
    case "soft":
      // Soft response: easy to get thick ink with a light touch (low wrist fatigue)
      return Math.pow(p, 0.55);

    case "firm":
      // Firm response: requires deliberate pressure to reach max thickness
      return Math.pow(p, 1.25);

    case "medium":
    default:
      // Calibrated sweet spot for Huion PW517 / PW500 / Wacom Pro Pen 2
      // Gives a delicate entry taper and effortless handwriting flow
      return Math.pow(p, 0.78);
  }
}

/**
 * Detects if the stylus side rocker / barrel button is currently held down.
 * Huion drivers typically map the lower button to Right-Click (e.buttons === 2)
 * or Eraser mode.
 */
export function isStylusBarrelButtonPressed(
  e: React.PointerEvent | PointerEvent
): boolean {
  if (e.pointerType !== "pen") return false;
  return e.button === 2 || (e.buttons & 2) !== 0 || (e.buttons & 32) !== 0;
}

/**
 * Detects if the stylus is using a physical eraser tail (e.g. flipped pen).
 */
export function isStylusEraserTip(
  e: React.PointerEvent | PointerEvent
): boolean {
  return (
    (e.pointerType as string) === "eraser" ||
    e.button === 5 ||
    (e.buttons & 32) !== 0
  );
}
