import type { PressureCurve, TabletSettings } from "../types/whiteboard";

export const TABLET_SETTINGS_STORAGE_KEY = "tapboard_tablet_settings_v2";

export const DEFAULT_TABLET_SETTINGS: TabletSettings = {
  pressureCurve: "soft",
  palmRejection: "strict",
  barrelButtonAction: "erase",
  barrelButton2Action: "lasso",
  stabilizerLevel: "smooth",
  enableScribbleErase: false,
  enableTiltDynamics: true,
  smoothing: 0.6,
  streamline: 0.45,
  showHoverCursor: true,
  minPressureThreshold: 0.012,
};

export interface TabletBrandProfile {
  id: string;
  name: string;
  description: string;
  settings: Partial<TabletSettings>;
}

export const TABLET_PROFILES: TabletBrandProfile[] = [
  {
    id: "huion-hs64",
    name: "Huion HS64 (PW100 Pen)",
    description: "6.3×4\" pad, PW100 battery-free pen, 8192 levels, ±60° tilt shading, 266 PPS high-rate digitizer.",
    settings: {
      pressureCurve: "soft",
      palmRejection: "standard",
      barrelButtonAction: "erase",
      barrelButton2Action: "lasso",
      enableTiltDynamics: true,
      minPressureThreshold: 0.01,
      smoothing: 0.58,
      streamline: 0.42,
      stabilizerLevel: "smooth",
      showHoverCursor: true,
    },
  },
  {
    id: "wacom",
    name: "Wacom (Intuos / Cintiq / One)",
    description: "Natural feel with 4096-8192 levels, pro pen barrel mapping, and strict palm rejection.",
    settings: {
      pressureCurve: "medium",
      palmRejection: "strict",
      barrelButtonAction: "erase",
      barrelButton2Action: "pan",
      enableTiltDynamics: true,
      minPressureThreshold: 0.02,
    },
  },
  {
    id: "huion",
    name: "Huion (Kamvas / Inspiroy / PW517)",
    description: "Optimized for PenTech 3.0+ low activation force and delicate stroke entry.",
    settings: {
      pressureCurve: "soft",
      palmRejection: "strict",
      barrelButtonAction: "erase",
      minPressureThreshold: 0.015,
    },
  },
  {
    id: "xppen",
    name: "XP-Pen (Artist / Deco / X3 Pro)",
    description: "Tuned for X3 Smart Chip 16K/8K pressure response with anti-hairline stabilization.",
    settings: {
      pressureCurve: "medium",
      palmRejection: "strict",
      barrelButtonAction: "erase",
      minPressureThreshold: 0.02,
    },
  },
  {
    id: "apple",
    name: "Apple Pencil (iPad / Mac Sidecar)",
    description: "Buttery low-latency inking with rapid taper dynamics and full palm rejection.",
    settings: {
      pressureCurve: "soft",
      palmRejection: "strict",
      barrelButtonAction: "erase",
      minPressureThreshold: 0.01,
    },
  },
  {
    id: "surface",
    name: "Surface Pen / Windows Ink",
    description: "Calibrated for Microsoft MPP 2.0/2.6 protocol and physical tail eraser flip.",
    settings: {
      pressureCurve: "firm",
      palmRejection: "strict",
      barrelButtonAction: "erase",
      minPressureThreshold: 0.03,
    },
  },
];

export function loadTabletSettings(): TabletSettings {
  try {
    const raw = localStorage.getItem(TABLET_SETTINGS_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TABLET_SETTINGS };
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_TABLET_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_TABLET_SETTINGS };
  }
}

export function saveTabletSettings(settings: TabletSettings): void {
  try {
    localStorage.setItem(TABLET_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn("Failed to persist tablet settings:", err);
  }
}

/**
 * Calibrates raw hardware pressure from graphics tablets (Huion, Wacom, Apple Pencil, XP-Pen).
 *
 * Professional graphics tablets provide 4096, 8192, or 16384 levels of pressure reported
 * as a floating-point number between 0.0000 and 1.0000.
 *
 * A non-linear power/gamma curve aligns physical hand effort with digital line thickness,
 * preventing hairline vanishing when writing gently, and preventing screen strain.
 */
export function calibratePressure(
  rawPressure: number,
  pointerType: string,
  curve: PressureCurve = "medium",
  minThreshold: number = 0.02
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

  // Eliminate dead zone at near-zero pressure so very light pen contact doesn't disappear
  const thresholded = Math.max(0, rawPressure - minThreshold) / (1 - minThreshold);
  const p = Math.max(0.04, Math.min(1, thresholded));

  switch (curve) {
    case "soft":
      // Soft response: easy to get thick ink with a light touch (low wrist fatigue during long lectures)
      return Math.pow(p, 0.52);

    case "firm":
      // Firm response: requires deliberate pressure to reach max thickness (best for precision lettering & calligraphy)
      return Math.pow(p, 1.35);

    case "medium":
    default:
      // Calibrated sweet spot for Huion PW517 / Wacom Pro Pen 2 / XP-Pen X3
      // Gives a delicate entry taper and effortless handwriting flow
      return Math.pow(p, 0.74);
  }
}

/**
 * Detects if the stylus side rocker / barrel button is currently held down.
 * Graphic tablet drivers map barrel buttons to Right-Click (e.buttons === 2),
 * Barrel 2 (e.buttons === 32), or e.button === 2.
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

export interface StylusTiltData {
  tiltX: number; // -90 to +90 degrees
  tiltY: number; // -90 to +90 degrees
  tiltAngle: number; // 0 to 90 degrees total deviation from vertical
  azimuthDeg: number; // 0 to 360 degrees rotation angle
}

/**
 * Reads hardware tilt coordinates from graphic tablets (Huion HS64 supports ±60° tilt).
 */
export function getStylusTilt(e: React.PointerEvent | PointerEvent): StylusTiltData {
  const tiltX = typeof e.tiltX === "number" ? e.tiltX : 0;
  const tiltY = typeof e.tiltY === "number" ? e.tiltY : 0;

  const radX = (tiltX * Math.PI) / 180;
  const radY = (tiltY * Math.PI) / 180;
  const tanSq = Math.tan(radX) * Math.tan(radX) + Math.tan(radY) * Math.tan(radY);
  const tiltAngle = Math.min(90, Math.round((Math.atan(Math.sqrt(tanSq)) * 180) / Math.PI));

  let azimuthDeg = Math.round((Math.atan2(tiltY, tiltX) * 180) / Math.PI);
  if (azimuthDeg < 0) azimuthDeg += 360;

  return { tiltX, tiltY, tiltAngle, azimuthDeg };
}

export type StylusButtonIdentifier = "button1" | "button2" | "eraser" | null;

/**
 * Identifies which physical button on the graphics tablet stylus is pressed.
 * Huion PW100 battery-free stylus features two rocker buttons:
 * - Button 1 (Lower): Right Click (e.button === 2 or buttons & 2)
 * - Button 2 (Upper): Middle Click / Barrel 2 (buttons & 32, buttons & 4, or button === 1)
 */
export function getStylusPressedButton(e: React.PointerEvent | PointerEvent): StylusButtonIdentifier {
  if (e.pointerType !== "pen") return null;

  if (isStylusEraserTip(e)) {
    return "eraser";
  }

  // Button 1 (Lower rocker: Right Click)
  if (e.button === 2 || (e.buttons & 2) !== 0) {
    return "button1";
  }

  // Button 2 (Upper rocker: Middle Click / Barrel 2)
  if ((e.buttons & 32) !== 0 || (e.buttons & 4) !== 0 || e.button === 1) {
    return "button2";
  }

  return null;
}
