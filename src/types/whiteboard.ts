/**
 * All whiteboard-related types for Version 5 (Lasso Selection, Shapes, Text, Styles, Notes, Laser).
 */

/** A single captured pointer sample in world coordinates: position + calibrated pressure */
export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
  time?: number;
  tiltX?: number; // PointerEvent tiltX (-90 to +90 degrees)
  tiltY?: number; // PointerEvent tiltY (-90 to +90 degrees)
}

/** Line style options: Solid, Dashed, Dotted */
export type LineStyle = "solid" | "dashed" | "dotted";

/** Shape fill options: None (outline only), Semi-transparent fill */
export type FillStyle = "none" | "semi";

/**
 * Pen brush style — controls how the perfect-freehand outline is computed.
 * - pen       : balanced pressure-sensitive ink (default)
 * - gel       : Japanese gel pen (Pilot G2 feel) — ultra-smooth, rich ink flow with speed tapers
 * - ballpoint : ballpoint pen (BIC / Parker feel) — crisp, clean, rapid math derivation
 * - brush     : Chinese calligraphy brush — dramatic taper, wide body
 * - fountain  : fountain pen — medium taper, elegant nib shape
 * - marker    : flat-cap marker — almost zero thinning, round ends
 * - pencil    : pencil — light, grainy, slightly irregular
 * - chisel    : flat calligraphy nib — angle-based width variation
 */
export type PenStyle = "pen" | "gel" | "ballpoint" | "brush" | "fountain" | "marker" | "pencil" | "chisel";

/** A fully recorded stroke, highlighter, or eraser path committed to history */
export interface Stroke {
  id: string;
  color: string;
  width: StrokeWidth;
  points: StrokePoint[];
  isEraser?: boolean;
  isHighlighter?: boolean;
  lineStyle?: LineStyle;
  penStyle?: PenStyle;
}

/** Geometric shapes for teaching (Math, Physics, Diagrams) */
export type ShapeType =
  | "line"
  | "arrow"
  | "rectangle"
  | "circle"
  | "triangle"
  | "coordinate_plane";

export interface ShapeItem {
  id: string;
  type: ShapeType;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: StrokeWidth;
  lineStyle?: LineStyle;
  fillStyle?: FillStyle;
}

/** Typed Text item on the board */
export interface TextItem {
  id: string;
  text: string;
  x: number;
  y: number;
  color: string;
  fontSize: number;
  /** "normal" = Inter/system UI, "handwriting" = Caveat handwriting font */
  fontStyle?: "normal" | "handwriting";
}

/** Educator Sticky Note / Callout Card */
export interface StickyNote {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

/** Laser pointer point with timestamp for decaying comet tail */
export interface LaserPoint {
  x: number;
  y: number;
  time: number;
}

/** Pasted image or rendered PDF page placed on the infinite canvas in world coordinates */
export interface PastedImage {
  id: string;
  url: string;
  imgElement: HTMLImageElement;
  x: number;
  y: number;
  width: number;
  height: number;
  isPdfPage?: boolean;
  pdfName?: string;
  pageNumber?: number;
  totalPages?: number;
}

/** Camera state for infinite canvas pan and zoom */
export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

/** Mathematical equation / formula item rendered with KaTeX */
export interface MathItem {
  id: string;
  latex: string;
  x: number;
  y: number;
  fontSize: number;
  color: string;
}

/** Active tool mode */
export type ToolMode =
  | "draw"
  | "highlighter"
  | "lasso"
  | "line"
  | "arrow"
  | "rectangle"
  | "circle"
  | "triangle"
  | "coordinate_plane"
  | "text"
  | "math"
  | "note"
  | "laser"
  | "erase"
  | "pan";

/** Educator Template Paper styles */
export type GridStyle =
  | "dots"
  | "grid"
  | "ruled"
  | "cornell"
  | "isometric"
  | "music"
  | "none";

/** Educator Board Themes */
export type BoardTheme = "dark" | "light" | "blueprint";

/** Palette color for strokes, shapes, and notes */
export type StrokeColor = string;

export type StrokeWidth = "ultrathin" | "thin" | "medium" | "thick" | "broad";

export const STROKE_WIDTH_MAP: Record<StrokeWidth, number> = {
  ultrathin: 1.5,
  thin: 3,
  medium: 6,
  thick: 10,
  broad: 16,
};

export const STROKE_WIDTH_ORDER: StrokeWidth[] = [
  "ultrathin",
  "thin",
  "medium",
  "thick",
  "broad",
];

/** Quick educator favorite pen slot definition (Goodnotes / Notability style) */
export interface FavoritePen {
  id: string;
  name: string;
  style: PenStyle;
  width: StrokeWidth;
  color: string;
  isHighlighter?: boolean;
}

/** Image resize handle positions */
export type ResizeHandle = "nw" | "ne" | "sw" | "se";

/** Stylus tablet pressure calibration curves */
export type PressureCurve = "soft" | "medium" | "firm" | "off";

/** Palm rejection sensitivity levels for graphic tablet displays & touchscreens */
export type PalmRejectionMode = "strict" | "standard" | "off";

/** Action triggered when holding the stylus rocker / side barrel button */
export type BarrelButtonAction = "erase" | "lasso" | "pan" | "none";

/** Intelligent handwriting curve smoothing and micro-jitter stabilization */
export type StabilizerLevel = "off" | "smooth" | "calligraphy";

/** Comprehensive Hardware Pen Tablet & Stylus Settings */
export interface TabletSettings {
  pressureCurve: PressureCurve;
  palmRejection: PalmRejectionMode;
  barrelButtonAction: BarrelButtonAction; // Button 1 (Lower Rocker)
  barrelButton2Action?: BarrelButtonAction; // Button 2 (Upper Rocker)
  stabilizerLevel?: StabilizerLevel;
  enableScribbleErase?: boolean;
  enableTiltDynamics?: boolean; // Dynamic chisel angle and soft tilt shading
  smoothing: number; // 0.1 to 1.0
  streamline: number; // 0.1 to 1.0
  showHoverCursor: boolean;
  minPressureThreshold: number; // 0.0 to 0.15
}

/** Interactive Math-to-Life simulation types */
export type SimType = "wave" | "pendulum" | "ramp" | "spring" | "orbit" | "custom_equation";

export interface SimulationParams {
  // Wave
  amplitude?: number;
  frequency?: number;
  wavelength?: number;
  waveType?: "traveling" | "standing";

  // Pendulum
  length?: number;
  gravity?: number;
  damping?: number;
  angle?: number;
  showVectors?: boolean;
  showEnergy?: boolean;

  // Ramp
  rampAngle?: number;
  friction?: number;
  blockMass?: number;
  showForces?: boolean;

  // Spring
  springK?: number;
  mass?: number;

  // Orbit
  eccentricity?: number;
  orbitSpeed?: number;

  // Universal Custom Equation Params
  equationStr?: string;
  equationLatex?: string;
  varA?: number;
  varB?: number;
  varC?: number;
  varD?: number;
  varAName?: string;
  varBName?: string;
  varCName?: string;
  varDName?: string;
  xRange?: number;
  yScale?: number;
  speed?: number;
  showDerivative?: boolean;
  showParticle?: boolean;
}

export interface PhysicsSimulationItem {
  id: string;
  type: SimType;
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  isRunning: boolean;
  params: SimulationParams;
}

/** A single presentation slide in the educator's lecture deck */
export interface Slide {
  id: string;
  title?: string;
  strokes: Stroke[];
  shapes: ShapeItem[];
  texts: TextItem[];
  notes: StickyNote[];
  images: PastedImage[];
  maths?: MathItem[];
  simulations?: PhysicsSimulationItem[];
  gridStyle?: GridStyle;
  boardTheme?: BoardTheme;
  backgroundColor?: string;
}
