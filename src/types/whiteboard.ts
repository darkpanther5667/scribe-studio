/**
 * All whiteboard-related types for Version 5 (Lasso Selection, Shapes, Text, Styles, Notes, Laser).
 */

/** A single captured pointer sample in world coordinates: position + calibrated pressure */
export interface StrokePoint {
  x: number;
  y: number;
  pressure: number;
}

/** Line style options: Solid, Dashed, Dotted */
export type LineStyle = "solid" | "dashed" | "dotted";

/** Shape fill options: None (outline only), Semi-transparent fill */
export type FillStyle = "none" | "semi";

/**
 * Pen brush style — controls how the perfect-freehand outline is computed.
 * - pen       : balanced pressure-sensitive ink (default)
 * - brush     : Chinese calligraphy brush — dramatic taper, wide body
 * - fountain  : fountain pen — medium taper, elegant nib shape
 * - marker    : flat-cap marker — almost zero thinning, round ends
 * - pencil    : pencil — light, grainy, slightly irregular
 * - chisel    : flat calligraphy nib — angle-based width variation
 */
export type PenStyle = "pen" | "brush" | "fountain" | "marker" | "pencil" | "chisel";

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

export type StrokeWidth = "thin" | "medium" | "thick";

export const STROKE_WIDTH_MAP: Record<StrokeWidth, number> = {
  thin: 3,
  medium: 6,
  thick: 12,
};

/** Image resize handle positions */
export type ResizeHandle = "nw" | "ne" | "sw" | "se";

/** Stylus tablet pressure calibration curves */
export type PressureCurve = "soft" | "medium" | "firm" | "off";

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
  gridStyle?: GridStyle;
  boardTheme?: BoardTheme;
  backgroundColor?: string;
}
