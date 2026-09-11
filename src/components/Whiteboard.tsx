import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { getStroke } from "perfect-freehand";
import type {
  Camera,
  FillStyle,
  GridStyle,
  LaserPoint,
  LineStyle,
  PastedImage,
  PenStyle,
  ResizeHandle,
  ShapeItem,
  StickyNote,
  Stroke,
  StrokeColor,
  StrokeWidth,
  TextItem,
  ToolMode,
  Slide,
  MathItem,
} from "../types/whiteboard";
import { STROKE_WIDTH_MAP } from "../types/whiteboard";
import {
  computeSelectionBoundingBox,
  isImageInPolygon,
  isNoteInPolygon,
  isShapeInPolygon,
  isStrokeInPolygon,
  isTextInPolygon,
} from "../utils/lassoSelection";
import { drawShape, drawStickyNote, drawText, shapeIntersectsEraser } from "../utils/shapeRenderer";
import { sliceStrokesWithEraser } from "../utils/strokeEraser";
import { getPath2DFromStroke } from "../utils/strokePath";
import { loadPdfDocument, type LoadedPdf, type RenderedPdfPage } from "../utils/pdfLoader";
import { PdfImportModal, type PdfLayoutMode } from "./PdfImportModal";
import { classifyStroke } from "../utils/smartInkRecognition";
import { Toolbar } from "./Toolbar";
import { HeaderBar } from "./HeaderBar";
import { ShortcutsModal } from "./ShortcutsModal";
import { SlideTray } from "./SlideTray";
import { exportClassNotesPdf } from "../utils/pdfNotesExporter";
import {
  saveLectureToStorage,
  loadLectureFromStorage,
  exportTapboardFile,
  parseTapboardFile,
} from "../utils/projectPersistence";
import { drawMathItem } from "../utils/mathRenderer";
import { MathFormulaModal } from "./MathFormulaModal";
import { lectureRecorder, type RecorderState } from "../utils/lectureRecorder";
import { LectureRecorderWidget } from "./LectureRecorderWidget";
import { AuthModal } from "./AuthModal";
import { CloudLibraryModal } from "./CloudLibraryModal";
import {
  getCurrentUser,
  signOutUser,
  saveDrawingToCloud,
  getSupabaseClient,
  type CloudDrawingRecord,
} from "../lib/supabase";
import type { User } from "@supabase/supabase-js";
import { LassoSelect, Copy, Trash2, X, StickyNote as StickyNoteIcon } from "lucide-react";

// ─── Pen style → perfect-freehand options ────────────────────────────────────

function getPenStrokeOptions(style: PenStyle | undefined, width: number) {
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

function makePfOptions(width: number, isHighlighter = false) {
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

// ─── Lasso Selection Data Structure ──────────────────────────────────────────
export interface SelectionState {
  strokeIds: Set<string>;
  shapeIds: Set<string>;
  textIds: Set<string>;
  noteIds: Set<string>;
  imageIds: Set<string>;
}

const EMPTY_SELECTION: SelectionState = {
  strokeIds: new Set(),
  shapeIds: new Set(),
  textIds: new Set(),
  noteIds: new Set(),
  imageIds: new Set(),
};

const DEFAULT_CAMERA: Camera = { x: 0, y: 0, zoom: 1 };

function hasSelectedElements(sel: SelectionState): boolean {
  return (
    sel.strokeIds.size > 0 ||
    sel.shapeIds.size > 0 ||
    sel.textIds.size > 0 ||
    sel.noteIds.size > 0 ||
    sel.imageIds.size > 0
  );
}

function countSelectedElements(sel: SelectionState): number {
  return (
    sel.strokeIds.size +
    sel.shapeIds.size +
    sel.textIds.size +
    sel.noteIds.size +
    sel.imageIds.size
  );
}

// ─── Full Board History Snapshot for Unified Undo / Redo ────────────────────
interface BoardSnapshot {
  strokes: Stroke[];
  shapes: ShapeItem[];
  texts: TextItem[];
  notes: StickyNote[];
  images: PastedImage[];
  maths: MathItem[];
}

export const Whiteboard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Mode & Visual State ──────────────────────────────────────────────────────
  const [mode, setMode] = useState<ToolMode>("draw");
  const modeRef = useRef<ToolMode>(mode);
  modeRef.current = mode;

  const [color, setColor] = useState<StrokeColor>("#FFFFFF");
  const colorRef = useRef<StrokeColor>(color);
  colorRef.current = color;

  const [strokeWidth, setStrokeWidth] = useState<StrokeWidth>("medium");
  const strokeWidthRef = useRef<StrokeWidth>(strokeWidth);
  strokeWidthRef.current = strokeWidth;

  const [lineStyle, setLineStyle] = useState<LineStyle>("solid");
  const lineStyleRef = useRef<LineStyle>(lineStyle);
  lineStyleRef.current = lineStyle;

  const [penStyle, setPenStyle] = useState<PenStyle>("pen");
  const penStyleRef = useRef<PenStyle>(penStyle);
  penStyleRef.current = penStyle;

  const [fillStyle, setFillStyle] = useState<FillStyle>("none");
  const fillStyleRef = useRef<FillStyle>(fillStyle);
  fillStyleRef.current = fillStyle;

  const [fontStyle, setFontStyle] = useState<"normal" | "handwriting">("handwriting");
  const textFontStyleRef = useRef<"normal" | "handwriting">(fontStyle);
  textFontStyleRef.current = fontStyle;

  const [gridStyle, setGridStyle] = useState<GridStyle>("dots");

  // ── Camera (Infinite Canvas) ─────────────────────────────────────────────────
  const [camera, setCamera] = useState<Camera>({ x: 0, y: 0, zoom: 1 });
  const cameraRef = useRef<Camera>(camera);
  cameraRef.current = camera;

  // ── Board Elements ──────────────────────────────────────────────────────────
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const strokesRef = useRef<Stroke[]>(strokes);
  strokesRef.current = strokes;

  const [shapes, setShapes] = useState<ShapeItem[]>([]);
  const shapesRef = useRef<ShapeItem[]>(shapes);
  shapesRef.current = shapes;

  const [texts, setTexts] = useState<TextItem[]>([]);
  const textsRef = useRef<TextItem[]>(texts);
  textsRef.current = texts;

  const [notes, setNotes] = useState<StickyNote[]>([]);
  const notesRef = useRef<StickyNote[]>(notes);
  notesRef.current = notes;

  const [images, setImages] = useState<PastedImage[]>([]);
  const imagesRef = useRef<PastedImage[]>(images);
  imagesRef.current = images;

  const [maths, setMaths] = useState<MathItem[]>([]);
  const mathsRef = useRef<MathItem[]>(maths);
  mathsRef.current = maths;

  const [isMathModalOpen, setIsMathModalOpen] = useState(false);
  const [pendingMathPos, setPendingMathPos] = useState<{ x: number; y: number } | null>(null);

  // ── Enterprise Video & Mic Lecture Recorder State ────────────────────────────
  const [recorderState, setRecorderState] = useState<RecorderState>({
    isRecording: false,
    isPaused: false,
    seconds: 0,
  });

  // ── Supabase Cloud Sync & Auth State ─────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isCloudLibraryOpen, setIsCloudLibraryOpen] = useState(false);
  const [activeCloudDrawingId, setActiveCloudDrawingId] = useState<string | null>(null);
  const [isSavingToCloud, setIsSavingToCloud] = useState(false);

  useEffect(() => {
    getCurrentUser().then((user) => {
      if (user) setCurrentUser(user);
    });

    const client = getSupabaseClient();
    if (!client) return;

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setCurrentUser(session.user);
        setIsAuthModalOpen(false);
      } else if (event === "SIGNED_OUT") {
        setCurrentUser(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);
  const selectedImageIdRef = useRef<string | null>(selectedImageId);
  selectedImageIdRef.current = selectedImageId;

  // ── Native PDF Document Import State ─────────────────────────────────────────
  const [pendingPdf, setPendingPdf] = useState<{ pdf: LoadedPdf; fileSize: number } | null>(null);

  // ── Multi-Slide Presentation Deck Architecture (Unacademy-grade) ─────────
  const [slides, setSlides] = useState<Slide[]>([
    { id: "slide-1", strokes: [], shapes: [], texts: [], notes: [], images: [] },
  ]);
  const slidesRef = useRef<Slide[]>(slides);
  slidesRef.current = slides;

  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const currentSlideIndexRef = useRef(0);
  currentSlideIndexRef.current = currentSlideIndex;

  const [isExportingNotes, setIsExportingNotes] = useState(false);

  // ── Lasso Selection State & Refs ─────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<SelectionState>(EMPTY_SELECTION);
  const selectedIdsRef = useRef<SelectionState>(selectedIds);
  selectedIdsRef.current = selectedIds;

  const isLassoingRef = useRef(false);
  const lassoPolygonRef = useRef<{ x: number; y: number }[]>([]);
  const isDraggingSelectionRef = useRef(false);
  const selectionDragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const selectionDragSnapshotRef = useRef<BoardSnapshot | null>(null);

  const dragInitialStrokesRef = useRef<Stroke[]>([]);
  const dragInitialShapesRef = useRef<ShapeItem[]>([]);
  const dragInitialTextsRef = useRef<TextItem[]>([]);
  const dragInitialNotesRef = useRef<StickyNote[]>([]);
  const dragInitialImagesRef = useRef<PastedImage[]>([]);

  // ── Robust Inline Text Editor Modal ─────────────────────────────────────────
  const [textEditor, setTextEditor] = useState<{
    screenX: number;
    screenY: number;
    worldX: number;
    worldY: number;
    text: string;
    isNote?: boolean;
  } | null>(null);
  const textEditorRef = useRef<HTMLTextAreaElement>(null);

  // ── History & Undo/Redo Action Stacks ────────────────────────────────────────
  const [undoStack, setUndoStack] = useState<BoardSnapshot[]>([]);
  const [redoStack, setRedoStack] = useState<BoardSnapshot[]>([]);

  // ── In-Flight Gesture Refs ──────────────────────────────────────────────────
  const isDrawingRef = useRef(false);
  const isDrawingShapeRef = useRef(false);
  const isErasingRef = useRef(false);
  const isPenActiveRef = useRef(false);
  const isPanningRef = useRef(false);
  const isSpaceHeldRef = useRef(false);
  const isDraggingImageRef = useRef(false);
  const isResizingImageRef = useRef(false);
  const resizeHandleRef = useRef<ResizeHandle | null>(null);
  const initialImageRectRef = useRef<{ x: number; y: number; width: number; height: number } | null>(null);
  const initialPointerWorldRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragImageOffsetRef = useRef<{ id: string; offsetX: number; offsetY: number } | null>(null);
  const lastPanPointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const activeStrokeRef = useRef<Stroke | null>(null);
  const activeShapeRef = useRef<ShapeItem | null>(null);
  const shapeStartPointRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastEraserPointRef = useRef<{ x: number; y: number } | null>(null);
  const currentEraserPointRef = useRef<{ x: number; y: number } | null>(null);
  const laserTrailRef = useRef<LaserPoint[]>([]);
  const snapshotBeforeGestureRef = useRef<BoardSnapshot | null>(null);

  // ── Multi-Touch Touchscreen Gestures (Two-finger pan & pinch zoom) ───────────
  const touchPointersRef = useRef<Map<number, { clientX: number; clientY: number }>>(new Map());
  const pinchGestureRef = useRef<{
    initialDist: number;
    initialZoom: number;
    initialMidpoint: { x: number; y: number };
    initialCam: Camera;
  } | null>(null);

  // ── Smart Ink Draw-and-Hold Shape Recognition State & Refs ──────────────────
  const [smartSnapEnabled, setSmartSnapEnabled] = useState(true);
  const smartSnapEnabledRef = useRef(smartSnapEnabled);
  smartSnapEnabledRef.current = smartSnapEnabled;

  const holdTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSnappedShapeRef = useRef(false);
  const snappedShapeRef = useRef<ShapeItem | null>(null);

  // ── Scribe Studio Branding & Hardware HUD State ──────────────────────────────
  const [lectureTitle, setLectureTitle] = useState(() => {
    return (
      localStorage.getItem("scribe_lecture_title") ||
      "Untitled Lecture • " +
        new Date().toLocaleDateString(undefined, { month: "short", day: "numeric" })
    );
  });
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [livePressure, setLivePressure] = useState(0);
  const [isLiveStylus, setIsLiveStylus] = useState(false);

  const handleTitleChange = (newTitle: string) => {
    setLectureTitle(newTitle);
    localStorage.setItem("scribe_lecture_title", newTitle);
  };

  const rafIdRef = useRef<number>(0);
  const dpiRef = useRef(window.devicePixelRatio || 1);

  // ── Canvas context getter ────────────────────────────────────────────────────
  const getCtx = useCallback((): CanvasRenderingContext2D | null => {
    return canvasRef.current?.getContext("2d") ?? null;
  }, []);

  // ── Coordinate Transformers ─────────────────────────────────────────────────
  const screenToWorld = useCallback((screenX: number, screenY: number) => {
    const cam = cameraRef.current;
    return {
      x: (screenX - cam.x) / cam.zoom,
      y: (screenY - cam.y) / cam.zoom,
    };
  }, []);

  // ── Dynamic Eraser Radius ───────────────────────────────────────────────────
  const getEraserRadius = useCallback(() => {
    const w = strokeWidthRef.current;
    if (w === "thin") return 12;
    if (w === "medium") return 22;
    return 38;
  }, []);

  // ── Resize handler (High-DPI backing store) ─────────────────────────────────
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpi = window.devicePixelRatio || 1;
    dpiRef.current = dpi;
    canvas.width = canvas.offsetWidth * dpi;
    canvas.height = canvas.offsetHeight * dpi;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.scale(dpi, dpi);
  }, []);

  useEffect(() => {
    handleResize();
    const observer = new ResizeObserver(handleResize);
    if (canvasRef.current) observer.observe(canvasRef.current);
    return () => observer.disconnect();
  }, [handleResize]);

  // ── Background Grid Pattern ──────────────────────────────────────────────────
  const drawBackgroundGrid = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    cam: Camera,
    style: GridStyle
  ) => {
    if (style === "none") return;

    const baseStep = 40;
    let step = baseStep;
    while (step * cam.zoom < 24) step *= 2;
    while (step * cam.zoom > 100) step /= 2;

    const screenStep = step * cam.zoom;
    const startX = ((cam.x % screenStep) + screenStep) % screenStep;
    const startY = ((cam.y % screenStep) + screenStep) % screenStep;

    if (style === "dots") {
      ctx.fillStyle = "rgba(255, 255, 255, 0.14)";
      const dotRadius = Math.max(1, 1.2 * Math.min(1.4, cam.zoom));
      for (let x = startX; x < width; x += screenStep) {
        for (let y = startY; y < height; y += screenStep) {
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    } else if (style === "grid") {
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = startX; x < width; x += screenStep) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = startY; y < height; y += screenStep) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();
    }
  };

  // ── Render Loop ─────────────────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const ctx = getCtx();
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    const cam = cameraRef.current;
    const width = canvas.offsetWidth;
    const height = canvas.offsetHeight;

    // 1. Clear viewport
    ctx.clearRect(0, 0, width, height);

    // 2. Draw Educator Grid Pattern
    drawBackgroundGrid(ctx, width, height, cam, gridStyle);

    // 3. Apply Camera World Transform
    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.scale(cam.zoom, cam.zoom);

    // 3.5. Render Bounded Slide Sheet
    const slideW = 1920;
    const slideH = 1080;
    const slideX = -slideW / 2;
    const slideY = -slideH / 2;
    const currentSlideForBg = slidesRef.current[currentSlideIndexRef.current];
    const slideBg = currentSlideForBg?.backgroundColor;

    ctx.save();
    if (isFiniteModeRef.current && slideBg) {
      // ── Finite mode: refined paper sheet with elevation shadow ────────────
      const sheetRadius = 14 / cam.zoom;

      // Outer soft ambient elevation shadow
      ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
      ctx.shadowBlur = 40 / cam.zoom;
      ctx.shadowOffsetY = 12 / cam.zoom;
      ctx.fillStyle = slideBg;

      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(slideX, slideY, slideW, slideH, sheetRadius);
        ctx.fill();
      } else {
        ctx.fillRect(slideX, slideY, slideW, slideH);
      }

      ctx.shadowColor = "transparent";
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;

      // Subtle crisp sheet border
      ctx.strokeStyle = "rgba(0, 0, 0, 0.12)";
      ctx.lineWidth = 1 / cam.zoom;
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(slideX, slideY, slideW, slideH, sheetRadius);
        ctx.stroke();
      } else {
        ctx.strokeRect(slideX, slideY, slideW, slideH);
      }

      // ── Grid overlay inside the sheet based on active gridStyle ───────────
      if (gridStyle !== "none") {
        const gridSpacing = 40; // world units
        if (gridStyle === "dots") {
          ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
          const dotRadius = 1.2 / cam.zoom;
          for (let gx = slideX + gridSpacing; gx < slideX + slideW; gx += gridSpacing) {
            for (let gy = slideY + gridSpacing; gy < slideY + slideH; gy += gridSpacing) {
              ctx.beginPath();
              ctx.arc(gx, gy, dotRadius, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        } else if (gridStyle === "grid") {
          ctx.strokeStyle = "rgba(0, 0, 0, 0.07)";
          ctx.lineWidth = 0.8 / cam.zoom;
          ctx.beginPath();
          // vertical lines
          for (let gx = slideX + gridSpacing; gx < slideX + slideW; gx += gridSpacing) {
            ctx.moveTo(gx, slideY);
            ctx.lineTo(gx, slideY + slideH);
          }
          // horizontal lines
          for (let gy = slideY + gridSpacing; gy < slideY + slideH; gy += gridSpacing) {
            ctx.moveTo(slideX, gy);
            ctx.lineTo(slideX + slideW, gy);
          }
          ctx.stroke();
        }
      }
    } else {
      // ── Infinite canvas: subtle ghost outline only ─────────────────────────
      ctx.strokeStyle = "rgba(255, 255, 255, 0.08)";
      ctx.lineWidth = 1.5 / cam.zoom;
      if (typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(slideX, slideY, slideW, slideH, 12 / cam.zoom);
        ctx.stroke();
      } else {
        ctx.strokeRect(slideX, slideY, slideW, slideH);
      }
      // Corner crosshairs
      const markLen = 16 / cam.zoom;
      ctx.strokeStyle = "rgba(255, 255, 255, 0.22)";
      ctx.lineWidth = 1.2 / cam.zoom;
      const stageCorners = [
        [slideX, slideY, 1, 1],
        [slideX + slideW, slideY, -1, 1],
        [slideX, slideY + slideH, 1, -1],
        [slideX + slideW, slideY + slideH, -1, -1],
      ];
      for (const [cx, cy, dx, dy] of stageCorners) {
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + (dx as number) * markLen, cy);
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx, cy + (dy as number) * markLen);
        ctx.stroke();
      }
    }
    ctx.restore();

    // 4. Render Pasted Images & PDF Pages
    for (const item of imagesRef.current) {
      if (item.imgElement.complete && item.imgElement.naturalWidth > 0) {
        ctx.save();
        ctx.shadowColor = "rgba(0, 0, 0, 0.4)";
        ctx.shadowBlur = 10 / cam.zoom;
        ctx.shadowOffsetY = 4 / cam.zoom;
        ctx.drawImage(item.imgElement, item.x, item.y, item.width, item.height);
        ctx.restore();

        // PDF Page Header Badge (e.g. "PDF • Lecture-Notes.pdf (p. 1/5)")
        if (item.isPdfPage) {
          ctx.save();
          const badgeText = `PDF • ${item.pdfName || "Document"} (p. ${item.pageNumber || 1}/${item.totalPages || 1})`;
          const fontSize = Math.max(10, 11 / cam.zoom);
          ctx.font = `500 ${fontSize}px ui-monospace, SFMono-Regular, monospace`;
          const textWidth = ctx.measureText(badgeText).width;
          const badgeH = 22 / cam.zoom;
          const badgeW = textWidth + 18 / cam.zoom;
          const badgeX = item.x;
          const badgeY = item.y - badgeH - 4 / cam.zoom;

          ctx.fillStyle = "rgba(24, 24, 27, 0.9)";
          if (typeof ctx.roundRect === "function") {
            ctx.beginPath();
            ctx.roundRect(badgeX, badgeY, badgeW, badgeH, 6 / cam.zoom);
            ctx.fill();
          } else {
            ctx.fillRect(badgeX, badgeY, badgeW, badgeH);
          }

          ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
          ctx.lineWidth = 1 / cam.zoom;
          ctx.stroke();

          ctx.fillStyle = "#e4e4e7";
          ctx.textBaseline = "middle";
          ctx.fillText(badgeText, badgeX + 9 / cam.zoom, badgeY + badgeH / 2);
          ctx.restore();
        }

        if (item.id === selectedImageIdRef.current) {
          ctx.save();
          ctx.strokeStyle = "#38bdf8";
          ctx.lineWidth = 2 / cam.zoom;
          ctx.setLineDash([6 / cam.zoom, 4 / cam.zoom]);
          ctx.strokeRect(item.x, item.y, item.width, item.height);

          const handleSize = 8 / cam.zoom;
          const corners = [
            [item.x, item.y],
            [item.x + item.width, item.y],
            [item.x, item.y + item.height],
            [item.x + item.width, item.y + item.height],
          ];

          ctx.fillStyle = "#ffffff";
          ctx.strokeStyle = "#0284c7";
          ctx.lineWidth = 1.5 / cam.zoom;
          ctx.setLineDash([]);

          for (const [cx, cy] of corners) {
            ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
            ctx.strokeRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
          }
          ctx.restore();
        }
      }
    }

    // 5. Render Sticky Notes
    for (const note of notesRef.current) {
      drawStickyNote(ctx, note, cam.zoom);
    }

    // 6. Render Geometric Shapes (Committed + Active Preview + Live Snapped Shape)
    const previewShape = activeShapeRef.current || snappedShapeRef.current;
    const allShapes = previewShape
      ? [...shapesRef.current, previewShape]
      : shapesRef.current;

    for (const shape of allShapes) {
      drawShape(ctx, shape, cam.zoom);
    }

    // Visual snap indicator badge when smart shape snap just occurred
    if (isSnappedShapeRef.current && snappedShapeRef.current) {
      const sh = snappedShapeRef.current;
      const minX = Math.min(sh.x1, sh.x2);
      const minY = Math.min(sh.y1, sh.y2);
      ctx.save();
      ctx.font = `600 ${Math.max(10, 11 / cam.zoom)}px monospace`;
      ctx.fillStyle = "#38bdf8";
      ctx.fillText("✦ SNAPPED", minX, minY - 8 / cam.zoom);
      ctx.restore();
    }

    // 7. Render Typed Text Items
    for (const textItem of textsRef.current) {
      drawText(ctx, textItem, cam.zoom);
    }

    // 7.5. Render KaTeX Mathematical Equations & Formulas
    for (const mathItem of mathsRef.current) {
      drawMathItem(ctx, mathItem, cam.zoom, scheduleRedraw);
    }

    // 8. Render Highlighters
    const active = activeStrokeRef.current;
    const allStrokes = active ? [...strokesRef.current, active] : strokesRef.current;

    for (const stroke of allStrokes) {
      if (!stroke.isHighlighter || stroke.points.length < 2) continue;

      const rawPoints = stroke.points.map((p) => [p.x, p.y, p.pressure]);
      const baseWidth = (STROKE_WIDTH_MAP[stroke.width] ?? 6) * 2.8;
      const pfOptions = makePfOptions(baseWidth, true);
      const outlinePoints = getStroke(rawPoints, pfOptions);

      if (outlinePoints.length === 0) continue;

      const path = getPath2DFromStroke(outlinePoints);
      ctx.save();
      ctx.globalAlpha = 0.38;
      ctx.fillStyle = stroke.color;
      ctx.fill(path);
      ctx.restore();
    }

    // 9. Render Normal Solid Pen Ink Strokes
    for (const stroke of allStrokes) {
      if (stroke.isHighlighter || stroke.points.length < 2) continue;

      const rawPoints = stroke.points.map((p) => [p.x, p.y, p.pressure]);
      const baseWidth = STROKE_WIDTH_MAP[stroke.width] ?? 4;
      const pfOptions = getPenStrokeOptions(stroke.penStyle ?? "pen", baseWidth);
      const outlinePoints = getStroke(rawPoints, pfOptions);

      if (outlinePoints.length === 0) continue;

      const path = getPath2DFromStroke(outlinePoints);

      // Pencil style: draw with slight transparency for paper texture feel
      if (stroke.penStyle === "pencil") {
        ctx.save();
        ctx.globalAlpha = 0.75;
        ctx.fillStyle = stroke.color;
        ctx.fill(path);
        ctx.restore();
      } else {
        ctx.fillStyle = stroke.color;
        ctx.fill(path);
      }
    }

    // 10. Render Glowing Laser Comet Trail
    const now = Date.now();
    const laserPoints = laserTrailRef.current;
    if (laserPoints.length > 0) {
      laserTrailRef.current = laserPoints.filter((lp) => now - lp.time < 800);
      const activeLaser = laserTrailRef.current;

      for (let i = 0; i < activeLaser.length; i++) {
        const lp = activeLaser[i];
        const age = now - lp.time;
        const alpha = Math.max(0, 1 - age / 800);
        const radius = (6 + (i / activeLaser.length) * 6) / cam.zoom;

        ctx.save();
        ctx.beginPath();
        ctx.arc(lp.x, lp.y, radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(244, 63, 94, ${alpha * 0.4})`;
        ctx.shadowColor = "#f43f5e";
        ctx.shadowBlur = 12 / cam.zoom;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(lp.x, lp.y, radius * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
        ctx.restore();
      }

      // Unacademy Pulsing Laser Ripple Orb at the tip for mobile learners
      if (activeLaser.length > 0) {
        const tip = activeLaser[activeLaser.length - 1];
        const pulsePhase = (now % 1000) / 1000;
        const rippleR = (12 + pulsePhase * 26) / cam.zoom;
        const rippleAlpha = (1 - pulsePhase) * 0.8;

        ctx.save();
        ctx.beginPath();
        ctx.arc(tip.x, tip.y, rippleR, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(244, 63, 94, ${rippleAlpha})`;
        ctx.lineWidth = 2.5 / cam.zoom;
        ctx.shadowColor = "#f43f5e";
        ctx.shadowBlur = 10 / cam.zoom;
        ctx.stroke();
        ctx.restore();
      }

      if (laserTrailRef.current.length > 0) {
        scheduleRedraw();
      }
    }

    // 11. Render Visual Eraser Ring while actively swiping
    if (isErasingRef.current && currentEraserPointRef.current) {
      const ep = currentEraserPointRef.current;
      const radius = getEraserRadius();

      ctx.save();
      ctx.beginPath();
      ctx.arc(ep.x, ep.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(255, 255, 255, 0.12)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.85)";
      ctx.lineWidth = 1.5 / cam.zoom;
      ctx.setLineDash([4 / cam.zoom, 4 / cam.zoom]);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }

    // 12. Render Active In-Flight Lasso Loop
    if (isLassoingRef.current && lassoPolygonRef.current.length > 1) {
      const poly = lassoPolygonRef.current;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(poly[0].x, poly[0].y);
      for (let i = 1; i < poly.length; i++) {
        ctx.lineTo(poly[i].x, poly[i].y);
      }
      ctx.closePath();
      ctx.fillStyle = "rgba(56, 189, 248, 0.12)";
      ctx.fill();

      ctx.strokeStyle = "#38bdf8";
      ctx.lineWidth = 1.8 / cam.zoom;
      ctx.setLineDash([6 / cam.zoom, 4 / cam.zoom]);
      ctx.stroke();
      ctx.restore();
    }

    // 13. Render Selected Elements Bounding Box & Drag Handles
    const curSel = selectedIdsRef.current;
    if (hasSelectedElements(curSel)) {
      const selStrokes = strokesRef.current.filter((s) => curSel.strokeIds.has(s.id));
      const selShapes = shapesRef.current.filter((sh) => curSel.shapeIds.has(sh.id));
      const selTexts = textsRef.current.filter((t) => curSel.textIds.has(t.id));
      const selNotes = notesRef.current.filter((n) => curSel.noteIds.has(n.id));
      const selImages = imagesRef.current.filter((i) => curSel.imageIds.has(i.id));

      const bbox = computeSelectionBoundingBox(
        selStrokes,
        selShapes,
        selTexts,
        selNotes,
        selImages
      );

      if (bbox) {
        const pad = 12 / cam.zoom;
        const bx = bbox.minX - pad;
        const by = bbox.minY - pad;
        const bw = bbox.width + pad * 2;
        const bh = bbox.height + pad * 2;

        ctx.save();
        // Dashed bounding box
        ctx.strokeStyle = "#38bdf8";
        ctx.lineWidth = 1.8 / cam.zoom;
        ctx.setLineDash([6 / cam.zoom, 4 / cam.zoom]);
        ctx.strokeRect(bx, by, bw, bh);

        // Soft translucent highlight over selection
        ctx.fillStyle = "rgba(56, 189, 248, 0.04)";
        ctx.fillRect(bx, by, bw, bh);

        // Corner & Edge Handles
        const handleSize = 8 / cam.zoom;
        const corners = [
          [bx, by],
          [bx + bw, by],
          [bx, by + bh],
          [bx + bw, by + bh],
          [bx + bw / 2, by],
          [bx + bw / 2, by + bh],
          [bx, by + bh / 2],
          [bx + bw, by + bh / 2],
        ];

        ctx.fillStyle = "#ffffff";
        ctx.strokeStyle = "#0284c7";
        ctx.lineWidth = 1.5 / cam.zoom;
        ctx.setLineDash([]);

        for (const [cx, cy] of corners) {
          ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
          ctx.strokeRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
        }
        ctx.restore();
      }
    }

    // 14. Restore camera transform
    ctx.restore();
  }, [gridStyle, getCtx, getEraserRadius]);

  // ── rAF Scheduling ──────────────────────────────────────────────────────────
  const scheduleRedraw = useCallback(() => {
    cancelAnimationFrame(rafIdRef.current);
    rafIdRef.current = requestAnimationFrame(redraw);
  }, [redraw]);

  useEffect(() => {
    scheduleRedraw();
  }, [strokes, shapes, texts, notes, images, camera, selectedImageId, selectedIds, gridStyle, scheduleRedraw]);

  useEffect(() => {
    return () => cancelAnimationFrame(rafIdRef.current);
  }, []);

  // ── Wheel Event Listener (Pinch-Zoom, Trackpad, & Mouse Wheel) ──────────────
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();

      // In finite sheet mode the view is locked — no scroll or zoom allowed
      if (isFiniteModeRef.current) return;

      const rect = canvas.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      // 1. PINCH-TO-ZOOM (Trackpads dispatch WheelEvent with ctrlKey: true on pinch gesture)
      // Also handles Ctrl / Cmd / Alt + mouse wheel zooming towards pointer cursor
      if (e.ctrlKey || e.metaKey || e.altKey) {
        const zoomDelta = -e.deltaY * 0.01;
        const zoomFactor = Math.exp(zoomDelta);

        setCamera((prev) => {
          const nextZoom = Math.min(Math.max(0.1, prev.zoom * zoomFactor), 15);
          const scaleRatio = nextZoom / prev.zoom;

          const nextCamera = {
            zoom: nextZoom,
            x: cursorX - (cursorX - prev.x) * scaleRatio,
            y: cursorY - (cursorY - prev.y) * scaleRatio,
          };
          cameraRef.current = nextCamera;
          return nextCamera;
        });
        scheduleRedraw();
        return;
      }

      // 2. TWO-FINGER TRACKPAD SWIPE / MOUSE WHEEL PANNING
      // Swiping two fingers on trackpad pans the blackboard smoothly in 2D (like Figma/Miro)
      let deltaX = e.deltaX;
      let deltaY = e.deltaY;
      if (e.deltaMode === 1) {
        // Line mode (Windows mouse wheel)
        deltaX *= 24;
        deltaY *= 24;
      } else if (e.deltaMode === 2) {
        deltaX *= 100;
        deltaY *= 100;
      }

      const dx = e.shiftKey ? deltaY : deltaX;
      const dy = e.shiftKey ? 0 : deltaY;

      setCamera((prev) => {
        const next = {
          ...prev,
          x: prev.x - dx,
          y: prev.y - dy,
        };
        cameraRef.current = next;
        return next;
      });

      scheduleRedraw();
    };

    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => canvas.removeEventListener("wheel", onWheel);
  }, [scheduleRedraw]);

  // ── Helper to place images ──────────────────────────────────────────────────
  const placeImage = useCallback(
    (file: File, spawnX?: number, spawnY?: number) => {
      const url = URL.createObjectURL(file);
      const img = new Image();

      img.onload = () => {
        const canvas = canvasRef.current;
        const cam = cameraRef.current;
        const viewW = canvas?.offsetWidth ?? window.innerWidth;
        const viewH = canvas?.offsetHeight ?? window.innerHeight;

        let w = img.naturalWidth;
        let h = img.naturalHeight;
        const maxDim = 720;
        if (w > maxDim || h > maxDim) {
          const scale = Math.min(maxDim / w, maxDim / h);
          w *= scale;
          h *= scale;
        }

        const worldX =
          spawnX !== undefined
            ? (spawnX - cam.x) / cam.zoom - w / 2
            : (viewW / 2 - cam.x) / cam.zoom - w / 2;
        const worldY =
          spawnY !== undefined
            ? (spawnY - cam.y) / cam.zoom - h / 2
            : (viewH / 2 - cam.y) / cam.zoom - h / 2;

        const newImage: PastedImage = {
          id: crypto.randomUUID(),
          url,
          imgElement: img,
          x: worldX,
          y: worldY,
          width: w,
          height: h,
        };

        setImages((prev) => [...prev, newImage]);
        setSelectedImageId(newImage.id);
        scheduleRedraw();
      };

      img.src = url;
    },
    [scheduleRedraw]
  );

  // ── Native PDF Document Upload Handler ───────────────────────────────────────
  const handlePdfUpload = useCallback(async (file: File) => {
    try {
      const loaded = await loadPdfDocument(file);
      setPendingPdf({ pdf: loaded, fileSize: file.size });
    } catch (err) {
      console.error("Failed to load PDF:", err);
      alert("Failed to load PDF document. Please ensure it is a valid PDF file.");
    }
  }, []);

  // ── Clipboard Paste Listener ────────────────────────────────────────────────
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type === "application/pdf") {
          const file = item.getAsFile();
          if (file) {
            handlePdfUpload(file);
            e.preventDefault();
            break;
          }
        }
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            placeImage(file);
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [placeImage, handlePdfUpload]);

  // ── Drag & Drop Image & PDF Files ───────────────────────────────────────────
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) {
        handlePdfUpload(file);
        return;
      }
      if (file.type.startsWith("image/")) {
        const rect = canvasRef.current?.getBoundingClientRect();
        const dropX = rect ? e.clientX - rect.left : undefined;
        const dropY = rect ? e.clientY - rect.top : undefined;
        placeImage(file, dropX, dropY);
      }
    }
  };

  // ── Undo & Redo Handlers ────────────────────────────────────────────────────
  const takeSnapshot = useCallback((): BoardSnapshot => {
    return {
      strokes: [...strokesRef.current],
      shapes: [...shapesRef.current],
      texts: [...textsRef.current],
      notes: [...notesRef.current],
      images: [...imagesRef.current],
      maths: [...mathsRef.current],
    };
  }, []);

  // ── Multi-Slide Presentation Deck Management (Unacademy-grade) ───────────────
  const syncCurrentSlideToDeck = useCallback((): Slide[] => {
    const deck = slidesRef.current;
    const currentIndex = currentSlideIndexRef.current;
    const currentSlide = deck[currentIndex];
    if (!currentSlide) return deck;

    const updatedSlide: Slide = {
      ...currentSlide,
      strokes: [...strokesRef.current],
      shapes: [...shapesRef.current],
      texts: [...textsRef.current],
      notes: [...notesRef.current],
      images: [...imagesRef.current],
      maths: [...mathsRef.current],
    };

    const nextDeck = [...deck];
    nextDeck[currentIndex] = updatedSlide;
    slidesRef.current = nextDeck;
    setSlides(nextDeck);
    return nextDeck;
  }, []);

  const loadSlide = useCallback((targetSlide: Slide) => {
    strokesRef.current = targetSlide.strokes;
    shapesRef.current = targetSlide.shapes;
    textsRef.current = targetSlide.texts;
    notesRef.current = targetSlide.notes;
    imagesRef.current = targetSlide.images;
    const targetMaths = targetSlide.maths || [];
    mathsRef.current = targetMaths;

    setStrokes(targetSlide.strokes);
    setShapes(targetSlide.shapes);
    setTexts(targetSlide.texts);
    setNotes(targetSlide.notes);
    setImages(targetSlide.images);
    setMaths(targetMaths);

    selectedIdsRef.current = EMPTY_SELECTION;
    setSelectedIds(EMPTY_SELECTION);
    setSelectedImageId(null);
    setTextEditor(null);
    setUndoStack([]);
    setRedoStack([]);
    scheduleRedraw();
  }, [scheduleRedraw]);

  // ── True Browser Fullscreen Mode (Monitor / Presentation Fullscreen) ─────────
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn("Fullscreen request error:", err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch((err) => {
          console.warn("Exit fullscreen error:", err);
        });
      }
    }
  }, []);

  // ── Finite Sheet Mode (bounded canvas for PDF presentation) ─────────────────
  // When true the canvas is a limited page; when false it is the infinite canvas.
  const [isFiniteMode, setIsFiniteMode] = useState(false);
  const isFiniteModeRef = useRef(false);
  isFiniteModeRef.current = isFiniteMode;

  const toggleFiniteMode = useCallback(() => {
    setIsFiniteMode((prev) => {
      const next = !prev;
      isFiniteModeRef.current = next;
      if (next) {
        // Entering sheet mode: switch to a dark pen color so it's visible on the sheet
        setColor("#1a1a2e");
        colorRef.current = "#1a1a2e";
      } else {
        // Exiting to infinite canvas: restore bright white pen
        setColor("#FFFFFF");
        colorRef.current = "#FFFFFF";
      }
      return next;
    });
  }, []);

  // ── Fit Current Slide / PDF Page to Viewport Screen (Proper Full View) ────────
  const handleFitToScreen = useCallback((
    targetW?: number,
    targetH?: number,
    targetX?: number,
    targetY?: number
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const viewW = canvas.offsetWidth;
    const viewH = canvas.offsetHeight;

    const currentSlide = slidesRef.current[currentSlideIndexRef.current];
    const firstPdfOrImg = currentSlide?.images[0];

    let tw = targetW ?? 1920;
    let th = targetH ?? 1080;
    let tx = targetX ?? -960;
    let ty = targetY ?? -540;

    if (targetW === undefined && firstPdfOrImg) {
      tw = firstPdfOrImg.width;
      th = firstPdfOrImg.height;
      tx = firstPdfOrImg.x;
      ty = firstPdfOrImg.y;
    }

    // In finite mode the left sidebar toolbar is ~72px wide; offset the center rightward
    const leftToolbarW = isFiniteModeRef.current ? 72 : 0;
    // Comfortable presentation padding (leave room for top header 64px & bottom tray 60px)
    const padX = 24 + leftToolbarW / 2;
    const padY = 64;
    const availW = Math.max(100, viewW - padX * 2);
    const availH = Math.max(100, viewH - padY * 2);

    const scaleX = availW / tw;
    const scaleY = availH / th;
    const fitZoom = Math.min(scaleX, scaleY);

    const centerX = tx + tw / 2;
    const centerY = ty + th / 2;

    const nextCam: Camera = {
      zoom: fitZoom,
      // Shift canvas center right by half the toolbar width so PDF is visually centered
      x: viewW / 2 + leftToolbarW / 2 - centerX * fitZoom,
      y: (viewH + 16) / 2 - centerY * fitZoom,
    };

    cameraRef.current = nextCam;
    setCamera(nextCam);
    scheduleRedraw();
  }, [scheduleRedraw]);

  const handleSelectSlide = useCallback((targetIndex: number) => {
    if (
      targetIndex < 0 ||
      targetIndex >= slidesRef.current.length ||
      targetIndex === currentSlideIndexRef.current
    ) {
      return;
    }
    const latestDeck = syncCurrentSlideToDeck();
    currentSlideIndexRef.current = targetIndex;
    setCurrentSlideIndex(targetIndex);
    loadSlide(latestDeck[targetIndex]);
    setTimeout(() => {
      handleFitToScreen();
    }, 20);
  }, [syncCurrentSlideToDeck, loadSlide, handleFitToScreen]);

  const handleAddBlankSlide = useCallback(() => {
    const latestDeck = syncCurrentSlideToDeck();
    const newSlide: Slide = {
      id: crypto.randomUUID(),
      title: `Slide ${latestDeck.length + 1}`,
      strokes: [],
      shapes: [],
      texts: [],
      notes: [],
      images: [],
      // Blank slides render as a light grey sheet
      backgroundColor: "#e8e8e8",
    };
    const insertIdx = currentSlideIndexRef.current + 1;
    const nextDeck = [
      ...latestDeck.slice(0, insertIdx),
      newSlide,
      ...latestDeck.slice(insertIdx),
    ];
    slidesRef.current = nextDeck;
    setSlides(nextDeck);
    currentSlideIndexRef.current = insertIdx;
    setCurrentSlideIndex(insertIdx);
    loadSlide(newSlide);
    setTimeout(() => {
      handleFitToScreen();
    }, 20);
  }, [syncCurrentSlideToDeck, loadSlide, handleFitToScreen]);

  const handleDuplicateSlide = useCallback((index: number) => {
    const latestDeck = syncCurrentSlideToDeck();
    const sourceSlide = latestDeck[index];
    if (!sourceSlide) return;

    const clonedSlide: Slide = {
      ...sourceSlide,
      id: crypto.randomUUID(),
      title: `${sourceSlide.title || `Slide ${index + 1}`} (Copy)`,
      strokes: sourceSlide.strokes.map((s) => ({
        ...s,
        id: crypto.randomUUID(),
        points: [...s.points],
      })),
      shapes: sourceSlide.shapes.map((sh) => ({ ...sh, id: crypto.randomUUID() })),
      texts: sourceSlide.texts.map((t) => ({ ...t, id: crypto.randomUUID() })),
      notes: sourceSlide.notes.map((n) => ({ ...n, id: crypto.randomUUID() })),
      images: sourceSlide.images.map((img) => ({ ...img, id: crypto.randomUUID() })),
      maths: (sourceSlide.maths || []).map((m) => ({ ...m, id: crypto.randomUUID() })),
    };

    const nextDeck = [
      ...latestDeck.slice(0, index + 1),
      clonedSlide,
      ...latestDeck.slice(index + 1),
    ];
    slidesRef.current = nextDeck;
    setSlides(nextDeck);
    currentSlideIndexRef.current = index + 1;
    setCurrentSlideIndex(index + 1);
    loadSlide(clonedSlide);
  }, [syncCurrentSlideToDeck, loadSlide]);

  const handleDeleteSlide = useCallback((index: number) => {
    if (slidesRef.current.length <= 1) return;
    const latestDeck = syncCurrentSlideToDeck();
    const nextDeck = latestDeck.filter((_, i) => i !== index);
    const newActiveIdx = Math.min(index, nextDeck.length - 1);
    slidesRef.current = nextDeck;
    setSlides(nextDeck);
    currentSlideIndexRef.current = newActiveIdx;
    setCurrentSlideIndex(newActiveIdx);
    loadSlide(nextDeck[newActiveIdx]);
  }, [syncCurrentSlideToDeck, loadSlide]);

  const handleExportNotesPdf = useCallback(async () => {
    if (isExportingNotes) return;
    setIsExportingNotes(true);
    try {
      const latestDeck = syncCurrentSlideToDeck();
      await exportClassNotesPdf(latestDeck, lectureTitle);
    } catch (err) {
      console.error("Failed to export class notes PDF:", err);
    } finally {
      setIsExportingNotes(false);
    }
  }, [isExportingNotes, syncCurrentSlideToDeck, lectureTitle]);

  // ── Enterprise .tapboard Project Persistence ────────────────────────────────
  const handleExportTapboard = useCallback(() => {
    const latestDeck = syncCurrentSlideToDeck();
    exportTapboardFile({
      title: lectureTitle,
      slides: latestDeck,
      currentSlideIndex: currentSlideIndexRef.current,
      gridStyle,
      isFiniteMode: isFiniteModeRef.current,
    });
  }, [syncCurrentSlideToDeck, lectureTitle, gridStyle]);

  const handleImportTapboard = useCallback(
    async (file: File) => {
      try {
        const project = await parseTapboardFile(file);
        setLectureTitle(project.title);
        setSlides(project.slides);
        slidesRef.current = project.slides;
        setGridStyle(project.gridStyle);
        setIsFiniteMode(project.isFiniteMode);
        isFiniteModeRef.current = project.isFiniteMode;

        const targetIdx = Math.min(project.currentSlideIndex, project.slides.length - 1);
        setCurrentSlideIndex(targetIdx);
        currentSlideIndexRef.current = targetIdx;
        loadSlide(project.slides[targetIdx]);
        setTimeout(() => handleFitToScreen(), 50);
      } catch (err: any) {
        alert("Failed to load project: " + (err?.message || "Invalid file"));
      }
    },
    [loadSlide, handleFitToScreen]
  );

  // ── Enterprise Video & Mic Lecture Recording ────────────────────────────────
  const handleStartRecording = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    await lectureRecorder.startRecording(canvas, lectureTitle);
  }, [lectureTitle]);

  // ── Supabase Cloud Save & Load Operations ────────────────────────────────────
  const handleSaveCurrentToCloud = useCallback(async () => {
    setIsSavingToCloud(true);
    try {
      const currentDeck = syncCurrentSlideToDeck();
      const savedRow = await saveDrawingToCloud({
        id: activeCloudDrawingId || undefined,
        title: lectureTitle,
        slides: currentDeck,
        gridStyle,
        isFiniteMode,
      });
      setActiveCloudDrawingId(savedRow.id);
      alert(`Lecture "${savedRow.title}" successfully saved to Supabase Cloud!`);
    } catch (err: any) {
      alert("Failed to save to cloud: " + (err?.message || "Please check credentials"));
    } finally {
      setIsSavingToCloud(false);
    }
  }, [activeCloudDrawingId, lectureTitle, gridStyle, isFiniteMode, syncCurrentSlideToDeck]);

  const handleLoadCloudDrawing = useCallback(
    (record: CloudDrawingRecord) => {
      setActiveCloudDrawingId(record.id);
      setLectureTitle(record.title);
      setSlides(record.slides);
      slidesRef.current = record.slides;
      setGridStyle(record.grid_style);
      setIsFiniteMode(record.is_finite_mode);
      isFiniteModeRef.current = record.is_finite_mode;

      const targetIdx = 0;
      setCurrentSlideIndex(targetIdx);
      currentSlideIndexRef.current = targetIdx;
      if (record.slides[0]) {
        loadSlide(record.slides[0]);
      }
      setTimeout(() => handleFitToScreen(), 50);
    },
    [loadSlide, handleFitToScreen]
  );

  const handleNewNotebook = useCallback(() => {
    setActiveCloudDrawingId(null);
    const newSlide: Slide = {
      id: `slide-${Date.now()}`,
      title: "Slide 1",
      strokes: [],
      shapes: [],
      texts: [],
      notes: [],
      images: [],
      maths: [],
    };
    setSlides([newSlide]);
    slidesRef.current = [newSlide];
    setCurrentSlideIndex(0);
    currentSlideIndexRef.current = 0;

    strokesRef.current = [];
    shapesRef.current = [];
    textsRef.current = [];
    notesRef.current = [];
    imagesRef.current = [];
    mathsRef.current = [];
    setStrokes([]);
    setShapes([]);
    setTexts([]);
    setNotes([]);
    setImages([]);
    setMaths([]);
    setSelectedImageId(null);
    selectedIdsRef.current = EMPTY_SELECTION;
    setSelectedIds(EMPTY_SELECTION);
    activeStrokeRef.current = null;
    activeShapeRef.current = null;
    laserTrailRef.current = [];
    setUndoStack([]);
    setRedoStack([]);

    const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    setLectureTitle(`Lecture (${today}) - Untitled`);
    setCamera(DEFAULT_CAMERA);
    scheduleRedraw();
    setIsCloudLibraryOpen(false);
  }, [scheduleRedraw]);

  // ── IndexedDB Auto-Save & Project Restore Lifecycle ─────────────────────────
  const isLoadedFromStorageRef = useRef(false);

  useEffect(() => {
    // 1. Restore from IndexedDB on startup
    (async () => {
      try {
        const cached = await loadLectureFromStorage();
        if (cached && cached.slides && cached.slides.length > 0) {
          setLectureTitle(cached.title || "Untitled Lecture");
          setSlides(cached.slides);
          slidesRef.current = cached.slides;
          setGridStyle(cached.gridStyle || "dots");
          setIsFiniteMode(Boolean(cached.isFiniteMode));
          isFiniteModeRef.current = Boolean(cached.isFiniteMode);

          const targetIdx = Math.min(cached.currentSlideIndex || 0, cached.slides.length - 1);
          setCurrentSlideIndex(targetIdx);
          currentSlideIndexRef.current = targetIdx;
          loadSlide(cached.slides[targetIdx]);
        }
      } catch (err) {
        console.warn("[Tapboard] Auto-restore error:", err);
      } finally {
        isLoadedFromStorageRef.current = true;
      }
    })();

    // 2. Subscribe to recorder service
    lectureRecorder.subscribe((s) => setRecorderState(s));

    // 3. Listen to Supabase Auth state
    getCurrentUser().then((u) => setCurrentUser(u));
    const sbClient = getSupabaseClient();
    if (sbClient) {
      const { data: authSub } = sbClient.auth.onAuthStateChange((_event, session) => {
        setCurrentUser(session?.user || null);
      });
      return () => authSub.subscription.unsubscribe();
    }
  }, [loadSlide]);

  // 3. Debounced Auto-Save to IndexedDB on any change
  useEffect(() => {
    if (!isLoadedFromStorageRef.current) return;
    const timer = setTimeout(() => {
      const currentDeck = syncCurrentSlideToDeck();
      saveLectureToStorage({
        title: lectureTitle,
        slides: currentDeck,
        currentSlideIndex: currentSlideIndexRef.current,
        gridStyle,
        isFiniteMode: isFiniteModeRef.current,
      });

      // Background auto-save to Supabase Cloud if user is authenticated and this is an active cloud notebook
      if (currentUser && activeCloudDrawingId) {
        saveDrawingToCloud({
          id: activeCloudDrawingId,
          title: lectureTitle,
          slides: currentDeck,
          gridStyle,
          isFiniteMode: isFiniteModeRef.current,
        }).catch((e) => console.warn("[Tapboard] Cloud auto-save error:", e));
      }
    }, 800);
    return () => clearTimeout(timer);
  }, [
    slides,
    strokes,
    shapes,
    texts,
    notes,
    images,
    maths,
    lectureTitle,
    currentSlideIndex,
    gridStyle,
    isFiniteMode,
    currentUser,
    activeCloudDrawingId,
    syncCurrentSlideToDeck,
  ]);

  // ── Import Rendered PDF Pages to Canvas ─────────────────────────────────────
  const handleImportPdfPages = useCallback(
    (pages: RenderedPdfPage[], layout: PdfLayoutMode) => {
      // If multi-page PDF, generate lecture slide deck (Unacademy masterclass workflow)
      if (pages.length > 1) {
        const newDeck: Slide[] = pages.map((p, idx) => {
          const aspect = p.worldWidth / p.worldHeight;
          const slideH = 1080;
          const slideW = Math.round(1080 * aspect);

          const pageImage: PastedImage = {
            id: crypto.randomUUID(),
            url: p.dataUrl,
            imgElement: p.imgElement,
            x: -slideW / 2,
            y: -slideH / 2,
            width: slideW,
            height: slideH,
            isPdfPage: true,
            pdfName: pendingPdf?.pdf.fileName,
            pageNumber: p.pageNumber,
            totalPages: pendingPdf?.pdf.numPages,
          };
          return {
            id: `slide-${idx + 1}-${crypto.randomUUID().slice(0, 8)}`,
            title: `Slide ${idx + 1} • Page ${p.pageNumber}`,
            strokes: [],
            shapes: [],
            texts: [],
            notes: [],
            images: [pageImage],
            // PDF slides use white background; blank slides added later get grey
            backgroundColor: "#ffffff",
          };
        });

        slidesRef.current = newDeck;
        setSlides(newDeck);
        currentSlideIndexRef.current = 0;
        setCurrentSlideIndex(0);
        loadSlide(newDeck[0]);
        setPendingPdf(null);

        // Enter finite-sheet presentation mode + fullscreen
        setIsFiniteMode(true);
        isFiniteModeRef.current = true;
        // Switch to dark pen so annotations are visible on the light slide
        setColor("#1a1a2e");
        colorRef.current = "#1a1a2e";
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }

        setTimeout(() => {
          const firstImg = newDeck[0].images[0];
          handleFitToScreen(firstImg.width, firstImg.height, firstImg.x, firstImg.y);
        }, 50);
        return;
      }

      // Single-page PDF import: place centered at 1080p presentation scale
      if (pages.length === 1) {
        const p = pages[0];
        const aspect = p.worldWidth / p.worldHeight;
        const slideH = 1080;
        const slideW = Math.round(1080 * aspect);

        const newImage: PastedImage = {
          id: crypto.randomUUID(),
          url: p.dataUrl,
          imgElement: p.imgElement,
          x: -slideW / 2,
          y: -slideH / 2,
          width: slideW,
          height: slideH,
          isPdfPage: true,
          pdfName: pendingPdf?.pdf.fileName,
          pageNumber: p.pageNumber,
          totalPages: pendingPdf?.pdf.numPages,
        };

        setUndoStack((u) => [...u, takeSnapshot()]);
        setRedoStack([]);

        const next = [...imagesRef.current, newImage];
        imagesRef.current = next;
        setImages(next);
        setSelectedImageId(newImage.id);
        setPendingPdf(null);
        scheduleRedraw();

        // Enter finite-sheet presentation mode + fullscreen
        setIsFiniteMode(true);
        isFiniteModeRef.current = true;
        // Switch to dark pen so annotations are visible on the light slide
        setColor("#1a1a2e");
        colorRef.current = "#1a1a2e";
        if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen().catch(() => {});
        }

        setTimeout(() => {
          handleFitToScreen(slideW, slideH, -slideW / 2, -slideH / 2);
        }, 50);
        return;
      }

      const cam = cameraRef.current;
      const canvas = canvasRef.current;
      const viewW = canvas?.offsetWidth ?? window.innerWidth;
      const viewH = canvas?.offsetHeight ?? window.innerHeight;

      // Position the first page centered in current viewport
      const firstW = pages[0]?.worldWidth ?? 600;
      const firstH = pages[0]?.worldHeight ?? 800;
      const startX = (viewW / 2 - cam.x) / cam.zoom - firstW / 2;
      const startY = (viewH / 2 - cam.y) / cam.zoom - firstH / 2;

      const spacing = 48;
      let currentX = startX;
      let currentY = startY;

      const newImages: PastedImage[] = [];

      for (const p of pages) {
        const newImage: PastedImage = {
          id: crypto.randomUUID(),
          url: p.dataUrl,
          imgElement: p.imgElement,
          x: currentX,
          y: currentY,
          width: p.worldWidth,
          height: p.worldHeight,
          isPdfPage: true,
          pdfName: pendingPdf?.pdf.fileName,
          pageNumber: p.pageNumber,
          totalPages: pendingPdf?.pdf.numPages,
        };
        newImages.push(newImage);

        if (layout === "vertical") {
          currentY += p.worldHeight + spacing;
        } else {
          currentX += p.worldWidth + spacing;
        }
      }

      setUndoStack((u) => [...u, takeSnapshot()]);
      setRedoStack([]);

      const next = [...imagesRef.current, ...newImages];
      imagesRef.current = next;
      setImages(next);
      if (newImages.length > 0) {
        setSelectedImageId(newImages[0].id);
      }
      setPendingPdf(null);
      scheduleRedraw();
    },
    [pendingPdf, takeSnapshot, scheduleRedraw, loadSlide, handleFitToScreen]
  );

  const restoreSnapshot = useCallback((snap: BoardSnapshot) => {
    strokesRef.current = snap.strokes;
    shapesRef.current = snap.shapes;
    textsRef.current = snap.texts;
    notesRef.current = snap.notes;
    imagesRef.current = snap.images;
    const snapMaths = snap.maths || [];
    mathsRef.current = snapMaths;
    setStrokes(snap.strokes);
    setShapes(snap.shapes);
    setTexts(snap.texts);
    setNotes(snap.notes);
    setImages(snap.images);
    setMaths(snapMaths);
    selectedIdsRef.current = EMPTY_SELECTION;
    setSelectedIds(EMPTY_SELECTION);
    scheduleRedraw();
  }, [scheduleRedraw]);

  const handleUndo = useCallback(() => {
    setUndoStack((prevUndo) => {
      if (prevUndo.length === 0) return prevUndo;
      const targetState = prevUndo[prevUndo.length - 1];
      const remainingUndo = prevUndo.slice(0, -1);

      setRedoStack((r) => [...r, takeSnapshot()]);
      restoreSnapshot(targetState);
      return remainingUndo;
    });
  }, [takeSnapshot, restoreSnapshot]);

  const handleRedo = useCallback(() => {
    setRedoStack((prevRedo) => {
      if (prevRedo.length === 0) return prevRedo;
      const targetState = prevRedo[prevRedo.length - 1];
      const remainingRedo = prevRedo.slice(0, -1);

      setUndoStack((u) => [...u, takeSnapshot()]);
      restoreSnapshot(targetState);
      return remainingRedo;
    });
  }, [takeSnapshot, restoreSnapshot]);

  // ── Lasso Action: Duplicate Selected Elements ───────────────────────────────
  const duplicateSelection = useCallback(() => {
    const sel = selectedIdsRef.current;
    if (!hasSelectedElements(sel)) return;

    const cam = cameraRef.current;
    const offset = 32 / cam.zoom;

    setUndoStack((u) => [...u, takeSnapshot()]);
    setRedoStack([]);

    const newSelectedIds: SelectionState = {
      strokeIds: new Set(),
      shapeIds: new Set(),
      textIds: new Set(),
      noteIds: new Set(),
      imageIds: new Set(),
    };

    // Duplicate Strokes
    const duplicatedStrokes: Stroke[] = [];
    for (const s of strokesRef.current) {
      if (sel.strokeIds.has(s.id)) {
        const newId = crypto.randomUUID();
        newSelectedIds.strokeIds.add(newId);
        duplicatedStrokes.push({
          ...s,
          id: newId,
          points: s.points.map((p) => ({ ...p, x: p.x + offset, y: p.y + offset })),
        });
      }
    }

    // Duplicate Shapes
    const duplicatedShapes: ShapeItem[] = [];
    for (const sh of shapesRef.current) {
      if (sel.shapeIds.has(sh.id)) {
        const newId = crypto.randomUUID();
        newSelectedIds.shapeIds.add(newId);
        duplicatedShapes.push({
          ...sh,
          id: newId,
          x1: sh.x1 + offset,
          y1: sh.y1 + offset,
          x2: sh.x2 + offset,
          y2: sh.y2 + offset,
        });
      }
    }

    // Duplicate Texts
    const duplicatedTexts: TextItem[] = [];
    for (const t of textsRef.current) {
      if (sel.textIds.has(t.id)) {
        const newId = crypto.randomUUID();
        newSelectedIds.textIds.add(newId);
        duplicatedTexts.push({
          ...t,
          id: newId,
          x: t.x + offset,
          y: t.y + offset,
        });
      }
    }

    // Duplicate Sticky Notes
    const duplicatedNotes: StickyNote[] = [];
    for (const n of notesRef.current) {
      if (sel.noteIds.has(n.id)) {
        const newId = crypto.randomUUID();
        newSelectedIds.noteIds.add(newId);
        duplicatedNotes.push({
          ...n,
          id: newId,
          x: n.x + offset,
          y: n.y + offset,
        });
      }
    }

    // Duplicate Images
    const duplicatedImages: PastedImage[] = [];
    for (const img of imagesRef.current) {
      if (sel.imageIds.has(img.id)) {
        const newId = crypto.randomUUID();
        newSelectedIds.imageIds.add(newId);
        duplicatedImages.push({
          ...img,
          id: newId,
          x: img.x + offset,
          y: img.y + offset,
        });
      }
    }

    const nextStrokes = [...strokesRef.current, ...duplicatedStrokes];
    const nextShapes = [...shapesRef.current, ...duplicatedShapes];
    const nextTexts = [...textsRef.current, ...duplicatedTexts];
    const nextNotes = [...notesRef.current, ...duplicatedNotes];
    const nextImages = [...imagesRef.current, ...duplicatedImages];

    strokesRef.current = nextStrokes;
    shapesRef.current = nextShapes;
    textsRef.current = nextTexts;
    notesRef.current = nextNotes;
    imagesRef.current = nextImages;

    setStrokes(nextStrokes);
    setShapes(nextShapes);
    setTexts(nextTexts);
    setNotes(nextNotes);
    setImages(nextImages);

    selectedIdsRef.current = newSelectedIds;
    setSelectedIds(newSelectedIds);
    scheduleRedraw();
  }, [takeSnapshot, scheduleRedraw]);

  // ── Lasso Action: Delete Selected Elements ─────────────────────────────────
  const deleteSelection = useCallback(() => {
    const sel = selectedIdsRef.current;
    if (!hasSelectedElements(sel)) return;

    setUndoStack((u) => [...u, takeSnapshot()]);
    setRedoStack([]);

    const nextStrokes = strokesRef.current.filter((s) => !sel.strokeIds.has(s.id));
    const nextShapes = shapesRef.current.filter((s) => !sel.shapeIds.has(s.id));
    const nextTexts = textsRef.current.filter((t) => !sel.textIds.has(t.id));
    const nextNotes = notesRef.current.filter((n) => !sel.noteIds.has(n.id));
    const nextImages = imagesRef.current.filter((i) => !sel.imageIds.has(i.id));

    strokesRef.current = nextStrokes;
    shapesRef.current = nextShapes;
    textsRef.current = nextTexts;
    notesRef.current = nextNotes;
    imagesRef.current = nextImages;

    setStrokes(nextStrokes);
    setShapes(nextShapes);
    setTexts(nextTexts);
    setNotes(nextNotes);
    setImages(nextImages);

    selectedIdsRef.current = EMPTY_SELECTION;
    setSelectedIds(EMPTY_SELECTION);
    scheduleRedraw();
  }, [takeSnapshot, scheduleRedraw]);

  // ── Keyboard Shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        handleUndo();
        return;
      }

      if (
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === "z") ||
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y")
      ) {
        e.preventDefault();
        handleRedo();
        return;
      }

      // Toggle Draw-and-Hold Smart Snap (Alt + S)
      if (e.altKey && e.key.toLowerCase() === "s") {
        e.preventDefault();
        setSmartSnapEnabled((prev) => !prev);
        return;
      }

      // Keyboard Shortcuts Cheat-sheet (? or Ctrl+/)
      if (e.key === "?" || ((e.ctrlKey || e.metaKey) && e.key === "/")) {
        e.preventDefault();
        setShortcutsOpen((prev) => !prev);
        return;
      }

      // Duplicate Selection (Ctrl + D)
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        if (hasSelectedElements(selectedIdsRef.current)) {
          e.preventDefault();
          duplicateSelection();
          return;
        }
      }

      // New Notebook (Ctrl + N or Alt + N)
      if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n") ||
        (e.altKey && e.key.toLowerCase() === "n")
      ) {
        e.preventDefault();
        handleNewNotebook();
        return;
      }

      // Add Blank Presentation Slide (Ctrl + Enter) - Unacademy signature
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        handleAddBlankSlide();
        return;
      }

      // Slide Navigation (PageDown / PageUp)
      if (e.key === "PageDown") {
        e.preventDefault();
        handleSelectSlide(currentSlideIndexRef.current + 1);
        return;
      }
      if (e.key === "PageUp") {
        e.preventDefault();
        handleSelectSlide(currentSlideIndexRef.current - 1);
        return;
      }

      // Delete Selection or Image
      if (e.key === "Delete" || e.key === "Backspace") {
        if (hasSelectedElements(selectedIdsRef.current)) {
          e.preventDefault();
          deleteSelection();
          return;
        }
        if (selectedImageIdRef.current) {
          e.preventDefault();
          setImages((prev) => prev.filter((img) => img.id !== selectedImageIdRef.current));
          setSelectedImageId(null);
          scheduleRedraw();
          return;
        }
      }

      if (e.code === "Space" && !e.repeat) {
        isSpaceHeldRef.current = true;
        return;
      }

      switch (e.key.toLowerCase()) {
        case "s":
          setMode("lasso");
          break;
        case "p":
          setMode("draw");
          break;
        case "b":
          setMode("highlighter");
          break;
        case "l":
          setMode("line");
          break;
        case "a":
          setMode("arrow");
          break;
        case "r":
          setMode("rectangle");
          break;
        case "c":
          setMode("circle");
          break;
        case "y":
          setMode("triangle");
          break;
        case "x":
          setMode("coordinate_plane");
          break;
        case "t":
          setMode("text");
          break;
        case "n":
          setMode("note");
          break;
        case "k":
          setMode("laser");
          break;
        case "e":
          setMode("erase");
          break;
        case "h":
          setMode("pan");
          break;
        case "g":
          setGridStyle((g) => (g === "dots" ? "grid" : g === "grid" ? "none" : "dots"));
          break;
        case "0":
          handleFitToScreen();
          break;
        case "f":
          toggleFullscreen();
          break;
        case "=":
        case "+":
          setCamera((cam) => ({ ...cam, zoom: Math.min(15, cam.zoom * 1.2) }));
          break;
        case "-":
          setCamera((cam) => ({ ...cam, zoom: Math.max(0.1, cam.zoom * 0.8) }));
          break;
        case "escape":
          selectedIdsRef.current = EMPTY_SELECTION;
          setSelectedIds(EMPTY_SELECTION);
          setSelectedImageId(null);
          setTextEditor(null);
          scheduleRedraw();
          break;
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        isSpaceHeldRef.current = false;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [handleUndo, handleRedo, handleNewNotebook, handleAddBlankSlide, handleSelectSlide, handleFitToScreen, toggleFullscreen, scheduleRedraw]);

  // ── Hit-testing images and resize handles ────────────────────────────────────
  const hitTestImageHandle = (
    worldX: number,
    worldY: number,
    img: PastedImage
  ): ResizeHandle | null => {
    const cam = cameraRef.current;
    const threshold = 14 / cam.zoom;

    if (Math.abs(worldX - img.x) < threshold && Math.abs(worldY - img.y) < threshold) return "nw";
    if (Math.abs(worldX - (img.x + img.width)) < threshold && Math.abs(worldY - img.y) < threshold) return "ne";
    if (Math.abs(worldX - img.x) < threshold && Math.abs(worldY - (img.y + img.height)) < threshold) return "sw";
    if (Math.abs(worldX - (img.x + img.width)) < threshold && Math.abs(worldY - (img.y + img.height)) < threshold) return "se";

    return null;
  };

  const findHitImage = useCallback((worldX: number, worldY: number) => {
    for (let i = imagesRef.current.length - 1; i >= 0; i--) {
      const img = imagesRef.current[i];
      if (
        worldX >= img.x &&
        worldX <= img.x + img.width &&
        worldY >= img.y &&
        worldY <= img.y + img.height
      ) {
        return img;
      }
    }
    return null;
  }, []);

  // ── Bulletproof Text / Note Editor Commit ───────────────────────────────────
  const commitTextEditor = useCallback(
    (customText?: string) => {
      if (!textEditor) return;
      const textToUse = customText !== undefined ? customText : textEditor.text;
      const trimmed = textToUse.trim();

      if (trimmed.length > 0) {
        setUndoStack((u) => [...u, takeSnapshot()]);
        setRedoStack([]);

        if (textEditor.isNote) {
          // Commit Sticky Note
          const newNote: StickyNote = {
            id: crypto.randomUUID(),
            text: trimmed,
            x: textEditor.worldX,
            y: textEditor.worldY,
            width: 200,
            height: 160,
            color: "#fef08a", // Soft sunshine yellow post-it
          };
          const next = [...notesRef.current, newNote];
          notesRef.current = next;
          setNotes(next);
        } else {
          // Commit Typed Text
          const fontSize =
            strokeWidthRef.current === "thin"
              ? 18
              : strokeWidthRef.current === "medium"
              ? 26
              : 36;

          const newText: TextItem = {
            id: crypto.randomUUID(),
            text: trimmed,
            x: textEditor.worldX,
            y: textEditor.worldY,
            color: colorRef.current,
            fontSize,
            fontStyle: textFontStyleRef.current,
          };
          const next = [...textsRef.current, newText];
          textsRef.current = next;
          setTexts(next);
        }
      }

      setTextEditor(null);
      scheduleRedraw();
    },
    [textEditor, takeSnapshot, scheduleRedraw]
  );

  const handleInsertMath = useCallback(
    (latexCode: string) => {
      const pos = pendingMathPos || { x: 0, y: 0 };
      setUndoStack((u) => [...u, takeSnapshot()]);
      setRedoStack([]);

      const fontSize =
        strokeWidthRef.current === "thin"
          ? 22
          : strokeWidthRef.current === "medium"
          ? 32
          : 44;

      const newMathItem: MathItem = {
        id: crypto.randomUUID(),
        latex: latexCode,
        x: pos.x,
        y: pos.y,
        fontSize,
        color: colorRef.current,
      };

      const next = [...mathsRef.current, newMathItem];
      mathsRef.current = next;
      setMaths(next);
      scheduleRedraw();
    },
    [pendingMathPos, takeSnapshot, scheduleRedraw]
  );

  // ── Pointer Handlers ────────────────────────────────────────────────────────
  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPoint = screenToWorld(screenX, screenY);

      // If text editor is already open, commit it when clicking elsewhere
      if (textEditor) {
        commitTextEditor();
        return;
      }

      // Handle Text / Note placement WITHOUT capturing pointer!
      if (modeRef.current === "text") {
        setTextEditor({
          screenX,
          screenY,
          worldX: worldPoint.x,
          worldY: worldPoint.y,
          text: "",
          isNote: false,
        });
        return;
      }

      if (modeRef.current === "note") {
        setTextEditor({
          screenX,
          screenY,
          worldX: worldPoint.x,
          worldY: worldPoint.y,
          text: "",
          isNote: true,
        });
        return;
      }

      if (modeRef.current === "math") {
        setPendingMathPos({ x: worldPoint.x, y: worldPoint.y });
        setIsMathModalOpen(true);
        return;
      }

      if (e.pointerType === "pen") {
        isPenActiveRef.current = true;
        setIsLiveStylus(true);
        setLivePressure(e.pressure || 0.5);
      } else if (e.pointerType === "touch" && isPenActiveRef.current) {
        return;
      } else {
        setIsLiveStylus(false);
      }

      if (e.pointerType === "touch") {
        touchPointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });
        if (touchPointersRef.current.size >= 2) {
          activeStrokeRef.current = null;
          activeShapeRef.current = null;
          isDrawingRef.current = false;
          isDrawingShapeRef.current = false;
          isErasingRef.current = false;
          isLassoingRef.current = false;
          isDraggingSelectionRef.current = false;

          const pts = Array.from(touchPointersRef.current.values());
          const dist = Math.hypot(pts[1].clientX - pts[0].clientX, pts[1].clientY - pts[0].clientY);
          const midX = (pts[0].clientX + pts[1].clientX) / 2;
          const midY = (pts[0].clientY + pts[1].clientY) / 2;

          pinchGestureRef.current = {
            initialDist: Math.max(dist, 10),
            initialZoom: cameraRef.current.zoom,
            initialMidpoint: { x: midX, y: midY },
            initialCam: { ...cameraRef.current },
          };
          scheduleRedraw();
          return;
        }
      }

      canvas.setPointerCapture(e.pointerId);

      // Detect Huion side barrel button or eraser tail
      const isBarrelPressed =
        e.pointerType === "pen" &&
        (e.button === 2 || (e.buttons & 2) !== 0 || (e.buttons & 32) !== 0);
      const isTailEraser = (e.pointerType as string) === "eraser" || e.button === 5;
      const isAutoEraser = isBarrelPressed || isTailEraser;
      const isEraseMode = isAutoEraser || modeRef.current === "erase";

      // 1. Pan Action — disabled in finite sheet mode (view is locked to slide)
      const isPanTriggered =
        !isEraseMode &&
        !isFiniteModeRef.current &&
        (isSpaceHeldRef.current || e.button === 1 || modeRef.current === "pan");

      if (isPanTriggered) {
        isPanningRef.current = true;
        lastPanPointRef.current = { x: e.clientX, y: e.clientY };
        return;
      }

      // 2. Lasso Selection Tool
      if (modeRef.current === "lasso" && !isEraseMode) {
        const curSel = selectedIdsRef.current;
        if (hasSelectedElements(curSel)) {
          const selStrokes = strokesRef.current.filter((s) => curSel.strokeIds.has(s.id));
          const selShapes = shapesRef.current.filter((sh) => curSel.shapeIds.has(sh.id));
          const selTexts = textsRef.current.filter((t) => curSel.textIds.has(t.id));
          const selNotes = notesRef.current.filter((n) => curSel.noteIds.has(n.id));
          const selImages = imagesRef.current.filter((i) => curSel.imageIds.has(i.id));

          const bbox = computeSelectionBoundingBox(
            selStrokes,
            selShapes,
            selTexts,
            selNotes,
            selImages
          );

          const pad = 14 / cameraRef.current.zoom;
          if (
            bbox &&
            worldPoint.x >= bbox.minX - pad &&
            worldPoint.x <= bbox.maxX + pad &&
            worldPoint.y >= bbox.minY - pad &&
            worldPoint.y <= bbox.maxY + pad
          ) {
            // Drag existing selection
            isDraggingSelectionRef.current = true;
            selectionDragStartRef.current = { x: worldPoint.x, y: worldPoint.y };
            selectionDragSnapshotRef.current = takeSnapshot();

            dragInitialStrokesRef.current = strokesRef.current.map((s) => ({
              ...s,
              points: s.points.map((p) => ({ ...p })),
            }));
            dragInitialShapesRef.current = shapesRef.current.map((sh) => ({ ...sh }));
            dragInitialTextsRef.current = textsRef.current.map((t) => ({ ...t }));
            dragInitialNotesRef.current = notesRef.current.map((n) => ({ ...n }));
            dragInitialImagesRef.current = imagesRef.current.map((i) => ({ ...i }));
            return;
          }
        }

        // Not inside existing selection: clear and start new lasso loop
        selectedIdsRef.current = EMPTY_SELECTION;
        setSelectedIds(EMPTY_SELECTION);
        isLassoingRef.current = true;
        lassoPolygonRef.current = [{ x: worldPoint.x, y: worldPoint.y }];
        scheduleRedraw();
        return;
      }

      // If clicking with any other tool, clear active selection
      if (hasSelectedElements(selectedIdsRef.current)) {
        selectedIdsRef.current = EMPTY_SELECTION;
        setSelectedIds(EMPTY_SELECTION);
      }

      // 3. Laser Pointer Tool
      if (modeRef.current === "laser" && !isEraseMode) {
        laserTrailRef.current = [{ x: worldPoint.x, y: worldPoint.y, time: Date.now() }];
        scheduleRedraw();
        return;
      }

      // 3. Precision Eraser: Swept Capsule Slicing (Strokes + Shapes + Texts + Notes)
      if (isEraseMode) {
        isErasingRef.current = true;
        snapshotBeforeGestureRef.current = takeSnapshot();
        lastEraserPointRef.current = { x: worldPoint.x, y: worldPoint.y };
        currentEraserPointRef.current = { x: worldPoint.x, y: worldPoint.y };

        const radius = getEraserRadius();

        // Erase Strokes
        const { nextStrokes, didChange: strokeChanged } = sliceStrokesWithEraser(
          strokesRef.current,
          worldPoint.x,
          worldPoint.y,
          worldPoint.x,
          worldPoint.y,
          radius
        );
        if (strokeChanged) {
          strokesRef.current = nextStrokes;
          setStrokes(nextStrokes);
        }

        // Erase Shapes
        const nextShapes = shapesRef.current.filter(
          (s) => !shapeIntersectsEraser(s, worldPoint.x, worldPoint.y, radius)
        );
        if (nextShapes.length !== shapesRef.current.length) {
          shapesRef.current = nextShapes;
          setShapes(nextShapes);
        }

        // Erase Sticky Notes
        const nextNotes = notesRef.current.filter(
          (n) =>
            !(
              worldPoint.x >= n.x &&
              worldPoint.x <= n.x + n.width &&
              worldPoint.y >= n.y &&
              worldPoint.y <= n.y + n.height
            )
        );
        if (nextNotes.length !== notesRef.current.length) {
          notesRef.current = nextNotes;
          setNotes(nextNotes);
        }

        scheduleRedraw();
        return;
      }

      // 4. Geometric Shapes: Line, Arrow, Rect, Circle, Triangle, Coordinate Plane
      const m = modeRef.current;
      if (
        m === "line" ||
        m === "arrow" ||
        m === "rectangle" ||
        m === "circle" ||
        m === "triangle" ||
        m === "coordinate_plane"
      ) {
        isDrawingShapeRef.current = true;
        snapshotBeforeGestureRef.current = takeSnapshot();
        shapeStartPointRef.current = { x: worldPoint.x, y: worldPoint.y };

        activeShapeRef.current = {
          id: crypto.randomUUID(),
          type: m,
          x1: worldPoint.x,
          y1: worldPoint.y,
          x2: worldPoint.x,
          y2: worldPoint.y,
          color: colorRef.current,
          width: strokeWidthRef.current,
          lineStyle: lineStyleRef.current,
          fillStyle: fillStyleRef.current,
        };

        scheduleRedraw();
        return;
      }

      // 5. Image Resize Handle
      if (selectedImageIdRef.current) {
        const selectedImg = imagesRef.current.find(
          (img) => img.id === selectedImageIdRef.current
        );
        if (selectedImg) {
          const handle = hitTestImageHandle(worldPoint.x, worldPoint.y, selectedImg);
          if (handle) {
            isResizingImageRef.current = true;
            resizeHandleRef.current = handle;
            initialImageRectRef.current = { ...selectedImg };
            initialPointerWorldRef.current = worldPoint;
            return;
          }
        }
      }

      // 6. Image Drag / Select
      // In finite sheet mode, PDF page images are locked (they ARE the slide background)
      const hitImage = findHitImage(worldPoint.x, worldPoint.y);
      const isLockedPdf = isFiniteModeRef.current && hitImage?.isPdfPage;
      if (!isLockedPdf && hitImage && (e.altKey || hitImage.id === selectedImageIdRef.current)) {
        setSelectedImageId(hitImage.id);
        isDraggingImageRef.current = true;
        dragImageOffsetRef.current = {
          id: hitImage.id,
          offsetX: worldPoint.x - hitImage.x,
          offsetY: worldPoint.y - hitImage.y,
        };
        scheduleRedraw();
        return;
      }

      if (!isLockedPdf && hitImage) {
        setSelectedImageId(hitImage.id);
      } else if (!hitImage) {
        setSelectedImageId(null);
      }

      // 7. Inking (Solid Pen or Highlighter)
      isDrawingRef.current = true;
      snapshotBeforeGestureRef.current = takeSnapshot();
      const currentMode = modeRef.current;
      const pressure = e.pressure > 0 ? e.pressure : 0.5;

      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }
      isSnappedShapeRef.current = false;
      snappedShapeRef.current = null;

      activeStrokeRef.current = {
        id: crypto.randomUUID(),
        color: colorRef.current,
        width: strokeWidthRef.current,
        isHighlighter: currentMode === "highlighter",
        lineStyle: lineStyleRef.current,
        penStyle: currentMode === "highlighter" ? undefined : penStyleRef.current,
        points: [{ x: worldPoint.x, y: worldPoint.y, pressure }],
      };

      setRedoStack([]);
      scheduleRedraw();
    },
    [screenToWorld, findHitImage, getEraserRadius, textEditor, commitTextEditor, takeSnapshot, scheduleRedraw]
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      if (e.pointerType === "touch" && isPenActiveRef.current) return;

      const canvas = canvasRef.current;
      if (!canvas) return;

      // Multi-Touch Pinch & Pan on Touchscreen Displays
      if (e.pointerType === "touch") {
        touchPointersRef.current.set(e.pointerId, { clientX: e.clientX, clientY: e.clientY });

        if (touchPointersRef.current.size >= 2 && pinchGestureRef.current) {
          if (isFiniteModeRef.current) return;

          const pts = Array.from(touchPointersRef.current.values());
          const curDist = Math.hypot(pts[1].clientX - pts[0].clientX, pts[1].clientY - pts[0].clientY);
          const curMidX = (pts[0].clientX + pts[1].clientX) / 2;
          const curMidY = (pts[0].clientY + pts[1].clientY) / 2;

          const { initialDist, initialZoom, initialMidpoint, initialCam } = pinchGestureRef.current;
          const scale = curDist / initialDist;
          const nextZoom = Math.min(Math.max(0.1, initialZoom * scale), 15);
          const scaleRatio = nextZoom / initialZoom;

          const rect = canvas.getBoundingClientRect();
          const focalX = initialMidpoint.x - rect.left;
          const focalY = initialMidpoint.y - rect.top;

          const panDx = curMidX - initialMidpoint.x;
          const panDy = curMidY - initialMidpoint.y;

          const nextCam = {
            zoom: nextZoom,
            x: focalX - (focalX - initialCam.x) * scaleRatio + panDx,
            y: focalY - (focalY - initialCam.y) * scaleRatio + panDy,
          };

          cameraRef.current = nextCam;
          setCamera(nextCam);
          scheduleRedraw();
          return;
        }
      }

      const rect = canvas.getBoundingClientRect();
      const screenX = e.clientX - rect.left;
      const screenY = e.clientY - rect.top;
      const worldPoint = screenToWorld(screenX, screenY);

      if (e.pointerType === "pen" && e.pressure > 0) {
        setIsLiveStylus(true);
        setLivePressure(e.pressure);
      }

      // 1. Pan Dragging
      if (isPanningRef.current) {
        const dx = e.clientX - lastPanPointRef.current.x;
        const dy = e.clientY - lastPanPointRef.current.y;
        lastPanPointRef.current = { x: e.clientX, y: e.clientY };

        setCamera((prev) => {
          const next = { ...prev, x: prev.x + dx, y: prev.y + dy };
          cameraRef.current = next;
          return next;
        });
        scheduleRedraw();
        return;
      }

      // 2. Lasso Drawing
      if (isLassoingRef.current) {
        lassoPolygonRef.current.push({ x: worldPoint.x, y: worldPoint.y });
        scheduleRedraw();
        return;
      }

      // 3. Selection Dragging
      if (isDraggingSelectionRef.current) {
        const dx = worldPoint.x - selectionDragStartRef.current.x;
        const dy = worldPoint.y - selectionDragStartRef.current.y;
        const sel = selectedIdsRef.current;

        const nextStrokes = dragInitialStrokesRef.current.map((s) => {
          if (!sel.strokeIds.has(s.id)) return s;
          return {
            ...s,
            points: s.points.map((p) => ({ ...p, x: p.x + dx, y: p.y + dy })),
          };
        });

        const nextShapes = dragInitialShapesRef.current.map((sh) => {
          if (!sel.shapeIds.has(sh.id)) return sh;
          return {
            ...sh,
            x1: sh.x1 + dx,
            y1: sh.y1 + dy,
            x2: sh.x2 + dx,
            y2: sh.y2 + dy,
          };
        });

        const nextTexts = dragInitialTextsRef.current.map((t) => {
          if (!sel.textIds.has(t.id)) return t;
          return {
            ...t,
            x: t.x + dx,
            y: t.y + dy,
          };
        });

        const nextNotes = dragInitialNotesRef.current.map((n) => {
          if (!sel.noteIds.has(n.id)) return n;
          return {
            ...n,
            x: n.x + dx,
            y: n.y + dy,
          };
        });

        const nextImages = dragInitialImagesRef.current.map((img) => {
          if (!sel.imageIds.has(img.id)) return img;
          return {
            ...img,
            x: img.x + dx,
            y: img.y + dy,
          };
        });

        strokesRef.current = nextStrokes;
        shapesRef.current = nextShapes;
        textsRef.current = nextTexts;
        notesRef.current = nextNotes;
        imagesRef.current = nextImages;

        scheduleRedraw();
        return;
      }

      // 4. Laser Pointer Trail
      if (modeRef.current === "laser" && (e.buttons > 0 || e.pointerType === "pen")) {
        laserTrailRef.current.push({ x: worldPoint.x, y: worldPoint.y, time: Date.now() });
        scheduleRedraw();
        return;
      }

      // 3. Geometric Shape Live Preview (with Shift constraint)
      if (isDrawingShapeRef.current && activeShapeRef.current) {
        const start = shapeStartPointRef.current;
        let endX = worldPoint.x;
        let endY = worldPoint.y;

        if (e.shiftKey) {
          const dx = endX - start.x;
          const dy = endY - start.y;
          const currentShapeType = activeShapeRef.current.type;

          if (currentShapeType === "line" || currentShapeType === "arrow") {
            const angle = Math.atan2(dy, dx);
            const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
            const dist = Math.sqrt(dx * dx + dy * dy);
            endX = start.x + dist * Math.cos(snappedAngle);
            endY = start.y + dist * Math.sin(snappedAngle);
          } else {
            const maxSide = Math.max(Math.abs(dx), Math.abs(dy));
            endX = start.x + maxSide * Math.sign(dx || 1);
            endY = start.y + maxSide * Math.sign(dy || 1);
          }
        }

        activeShapeRef.current.x2 = endX;
        activeShapeRef.current.y2 = endY;
        scheduleRedraw();
        return;
      }

      // 4. Active Precision Swept Slicing
      if (isErasingRef.current) {
        const p0 = lastEraserPointRef.current ?? worldPoint;
        const p1 = worldPoint;
        lastEraserPointRef.current = p1;
        currentEraserPointRef.current = p1;

        const radius = getEraserRadius();

        // Slicing strokes
        const { nextStrokes, didChange: strokeChanged } = sliceStrokesWithEraser(
          strokesRef.current,
          p0.x,
          p0.y,
          p1.x,
          p1.y,
          radius
        );
        if (strokeChanged) {
          strokesRef.current = nextStrokes;
          setStrokes(nextStrokes);
        }

        // Erasing shapes
        const nextShapes = shapesRef.current.filter(
          (s) => !shapeIntersectsEraser(s, p1.x, p1.y, radius)
        );
        if (nextShapes.length !== shapesRef.current.length) {
          shapesRef.current = nextShapes;
          setShapes(nextShapes);
        }

        scheduleRedraw();
        return;
      }

      // 5. Image Resizing
      if (
        isResizingImageRef.current &&
        initialImageRectRef.current &&
        selectedImageIdRef.current
      ) {
        const init = initialImageRectRef.current;
        const handle = resizeHandleRef.current;
        const dx = worldPoint.x - initialPointerWorldRef.current.x;
        const aspectRatio = init.width / init.height;

        let newWidth = init.width;
        let newHeight = init.height;
        let newX = init.x;
        let newY = init.y;

        if (handle === "se") {
          newWidth = Math.max(40, init.width + dx);
          newHeight = newWidth / aspectRatio;
        } else if (handle === "sw") {
          newWidth = Math.max(40, init.width - dx);
          newHeight = newWidth / aspectRatio;
          newX = init.x + (init.width - newWidth);
        } else if (handle === "ne") {
          newWidth = Math.max(40, init.width + dx);
          newHeight = newWidth / aspectRatio;
          newY = init.y + (init.height - newHeight);
        } else if (handle === "nw") {
          newWidth = Math.max(40, init.width - dx);
          newHeight = newWidth / aspectRatio;
          newX = init.x + (init.width - newWidth);
          newY = init.y + (init.height - newHeight);
        }

        setImages((prev) =>
          prev.map((img) =>
            img.id === selectedImageIdRef.current
              ? { ...img, x: newX, y: newY, width: newWidth, height: newHeight }
              : img
          )
        );
        scheduleRedraw();
        return;
      }

      // 6. Image Repositioning
      if (isDraggingImageRef.current && dragImageOffsetRef.current) {
        const { id, offsetX, offsetY } = dragImageOffsetRef.current;

        setImages((prev) =>
          prev.map((img) =>
            img.id === id
              ? { ...img, x: worldPoint.x - offsetX, y: worldPoint.y - offsetY }
              : img
          )
        );
        scheduleRedraw();
        return;
      }

      // 7. Active Inking or Live Snapped Shape Dragging
      if (isSnappedShapeRef.current && snappedShapeRef.current) {
        const sh = snappedShapeRef.current;
        if (sh.type === "line" || sh.type === "arrow") {
          sh.x2 = worldPoint.x;
          sh.y2 = worldPoint.y;
          if (e.shiftKey) {
            const dx = sh.x2 - sh.x1;
            const dy = sh.y2 - sh.y1;
            const angle = Math.atan2(dy, dx);
            const snappedAngle = Math.round(angle / (Math.PI / 4)) * (Math.PI / 4);
            const dist = Math.sqrt(dx * dx + dy * dy);
            sh.x2 = sh.x1 + dist * Math.cos(snappedAngle);
            sh.y2 = sh.y1 + dist * Math.sin(snappedAngle);
          }
        } else if (sh.type === "circle") {
          const cx = (sh.x1 + sh.x2) / 2;
          const cy = (sh.y1 + sh.y2) / 2;
          const r = Math.max(10, Math.sqrt((worldPoint.x - cx) ** 2 + (worldPoint.y - cy) ** 2));
          sh.x1 = cx - r;
          sh.y1 = cy - r;
          sh.x2 = cx + r;
          sh.y2 = cy + r;
        } else if (sh.type === "rectangle" || sh.type === "triangle") {
          sh.x2 = worldPoint.x;
          sh.y2 = worldPoint.y;
        }
        scheduleRedraw();
        return;
      }

      if (!isDrawingRef.current || !activeStrokeRef.current) return;

      const events =
        typeof e.nativeEvent.getCoalescedEvents === "function"
          ? e.nativeEvent.getCoalescedEvents()
          : [e.nativeEvent];

      for (const ev of events) {
        const sx = ev.clientX - rect.left;
        const sy = ev.clientY - rect.top;
        const world = screenToWorld(sx, sy);
        const pressure = ev.pressure > 0 ? ev.pressure : 0.5;

        activeStrokeRef.current.points.push({
          x: world.x,
          y: world.y,
          pressure,
        });
      }

      // Draw-and-Hold Detection for Pen Mode
      if (modeRef.current === "draw" && smartSnapEnabledRef.current) {
        if (holdTimeoutRef.current) {
          clearTimeout(holdTimeoutRef.current);
        }
        holdTimeoutRef.current = setTimeout(() => {
          if (!isDrawingRef.current || !activeStrokeRef.current) return;
          const pts = activeStrokeRef.current.points;
          if (pts.length < 8) return;

          const candidate = classifyStroke(pts);
          if (candidate) {
            isSnappedShapeRef.current = true;
            snappedShapeRef.current = {
              id: activeStrokeRef.current.id,
              type: candidate.type,
              x1: candidate.x1,
              y1: candidate.y1,
              x2: candidate.x2,
              y2: candidate.y2,
              color: colorRef.current,
              width: strokeWidthRef.current,
              lineStyle: lineStyleRef.current,
              fillStyle: fillStyleRef.current,
            };
            activeStrokeRef.current = null;
            scheduleRedraw();
          }
        }, 420);
      }

      scheduleRedraw();
    },
    [screenToWorld, getEraserRadius, scheduleRedraw]
  );

  const onPointerUp = useCallback((e?: React.PointerEvent<HTMLCanvasElement>) => {
    setLivePressure(0);
    if (e?.pointerId) {
      touchPointersRef.current.delete(e.pointerId);
      if (touchPointersRef.current.size < 2) {
        pinchGestureRef.current = null;
      }
    } else {
      touchPointersRef.current.clear();
      pinchGestureRef.current = null;
    }
    if (isPanningRef.current) isPanningRef.current = false;
    if (isDraggingImageRef.current) {
      isDraggingImageRef.current = false;
      dragImageOffsetRef.current = null;
    }
    if (isResizingImageRef.current) {
      isResizingImageRef.current = false;
      resizeHandleRef.current = null;
      initialImageRectRef.current = null;
    }

    // Finish Selection Dragging
    if (isDraggingSelectionRef.current) {
      isDraggingSelectionRef.current = false;
      if (selectionDragSnapshotRef.current) {
        setUndoStack((u) => [...u, selectionDragSnapshotRef.current!]);
        setRedoStack([]);
      }
      setStrokes(strokesRef.current);
      setShapes(shapesRef.current);
      setTexts(textsRef.current);
      setNotes(notesRef.current);
      setImages(imagesRef.current);
      scheduleRedraw();
    }

    // Finish Lasso Selection Drawing
    if (isLassoingRef.current) {
      isLassoingRef.current = false;
      const poly = lassoPolygonRef.current;
      if (poly.length >= 3) {
        const selStrokes = strokesRef.current.filter((s) => isStrokeInPolygon(s, poly));
        const selShapes = shapesRef.current.filter((sh) => isShapeInPolygon(sh, poly));
        const selTexts = textsRef.current.filter((t) => isTextInPolygon(t, poly));
        const selNotes = notesRef.current.filter((n) => isNoteInPolygon(n, poly));
        const selImages = imagesRef.current.filter((img) => isImageInPolygon(img, poly));

        const newSelection: SelectionState = {
          strokeIds: new Set(selStrokes.map((s) => s.id)),
          shapeIds: new Set(selShapes.map((s) => s.id)),
          textIds: new Set(selTexts.map((t) => t.id)),
          noteIds: new Set(selNotes.map((n) => n.id)),
          imageIds: new Set(selImages.map((i) => i.id)),
        };
        selectedIdsRef.current = newSelection;
        setSelectedIds(newSelection);
      } else {
        selectedIdsRef.current = EMPTY_SELECTION;
        setSelectedIds(EMPTY_SELECTION);
      }
      lassoPolygonRef.current = [];
      scheduleRedraw();
    }

    // Finish Drawing Geometric Shape
    if (isDrawingShapeRef.current && activeShapeRef.current) {
      isDrawingShapeRef.current = false;
      const finishedShape = activeShapeRef.current;
      activeShapeRef.current = null;

      let w = Math.abs(finishedShape.x2 - finishedShape.x1);
      let h = Math.abs(finishedShape.y2 - finishedShape.y1);

      // If coordinate plane was single-tapped/clicked without dragging, auto-stamp 360x360
      if (finishedShape.type === "coordinate_plane" && w <= 4 && h <= 4) {
        const cx = finishedShape.x1;
        const cy = finishedShape.y1;
        finishedShape.x1 = cx - 180;
        finishedShape.y1 = cy - 180;
        finishedShape.x2 = cx + 180;
        finishedShape.y2 = cy + 180;
        w = 360;
        h = 360;
      }

      if (w > 4 || h > 4) {
        if (snapshotBeforeGestureRef.current) {
          setUndoStack((u) => [...u, snapshotBeforeGestureRef.current!]);
          setRedoStack([]);
        }
        const nextShapes = [...shapesRef.current, finishedShape];
        shapesRef.current = nextShapes;
        setShapes(nextShapes);
      }
      scheduleRedraw();
    }

    // Finish Erasing
    if (isErasingRef.current) {
      isErasingRef.current = false;
      lastEraserPointRef.current = null;
      currentEraserPointRef.current = null;

      if (snapshotBeforeGestureRef.current) {
        setUndoStack((u) => [...u, snapshotBeforeGestureRef.current!]);
        setRedoStack([]);
      }
      scheduleRedraw();
    }

    // Finish Inking
    if (isDrawingRef.current && activeStrokeRef.current) {
      if (holdTimeoutRef.current) {
        clearTimeout(holdTimeoutRef.current);
        holdTimeoutRef.current = null;
      }

      isDrawingRef.current = false;
      const finished = activeStrokeRef.current;
      activeStrokeRef.current = null;

      // Check if stroke morphed into a snapped geometric shape
      if (isSnappedShapeRef.current && snappedShapeRef.current) {
        const shape = snappedShapeRef.current;
        isSnappedShapeRef.current = false;
        snappedShapeRef.current = null;

        if (snapshotBeforeGestureRef.current) {
          setUndoStack((u) => [...u, snapshotBeforeGestureRef.current!]);
          setRedoStack([]);
        }
        const nextShapes = [...shapesRef.current, shape];
        shapesRef.current = nextShapes;
        setShapes(nextShapes);
        scheduleRedraw();
        return;
      }

      isSnappedShapeRef.current = false;
      snappedShapeRef.current = null;

      if (finished.points.length > 1) {
        if (snapshotBeforeGestureRef.current) {
          setUndoStack((u) => [...u, snapshotBeforeGestureRef.current!]);
          setRedoStack([]);
        }
        const next = [...strokesRef.current, finished];
        strokesRef.current = next;
        setStrokes(next);
      } else {
        scheduleRedraw();
      }
    }
  }, [scheduleRedraw]);

  const onPointerCancel = useCallback((e?: React.PointerEvent<HTMLCanvasElement>) => {
    if (holdTimeoutRef.current) {
      clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    isSnappedShapeRef.current = false;
    snappedShapeRef.current = null;
    isPenActiveRef.current = false;
    touchPointersRef.current.clear();
    pinchGestureRef.current = null;
    onPointerUp(e);
  }, [onPointerUp]);

  // ── Zoom Handlers ───────────────────────────────────────────────────────────
  const handleZoomIn = useCallback(() => {
    setCamera((prev) => {
      const nextZoom = Math.min(15, prev.zoom * 1.25);
      const next = { ...prev, zoom: nextZoom };
      cameraRef.current = next;
      return next;
    });
    scheduleRedraw();
  }, [scheduleRedraw]);

  const handleZoomOut = useCallback(() => {
    setCamera((prev) => {
      const nextZoom = Math.max(0.1, prev.zoom * 0.8);
      const next = { ...prev, zoom: nextZoom };
      cameraRef.current = next;
      return next;
    });
    scheduleRedraw();
  }, [scheduleRedraw]);

  const handleResetCamera = useCallback(() => {
    cameraRef.current = DEFAULT_CAMERA;
    setCamera(DEFAULT_CAMERA);
    scheduleRedraw();
  }, [scheduleRedraw]);

  const handleClear = useCallback(() => {
    setUndoStack((u) => [...u, takeSnapshot()]);
    setRedoStack([]);
    strokesRef.current = [];
    shapesRef.current = [];
    textsRef.current = [];
    notesRef.current = [];
    imagesRef.current = [];
    mathsRef.current = [];
    setStrokes([]);
    setShapes([]);
    setTexts([]);
    setNotes([]);
    setImages([]);
    setMaths([]);
    setSelectedImageId(null);
    selectedIdsRef.current = EMPTY_SELECTION;
    setSelectedIds(EMPTY_SELECTION);
    activeStrokeRef.current = null;
    activeShapeRef.current = null;
    laserTrailRef.current = [];
    scheduleRedraw();
  }, [takeSnapshot, scheduleRedraw]);

  // ── Export Board Snapshot to PNG ────────────────────────────────────────────
  const handleExport = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const exportCanvas = document.createElement("canvas");
    exportCanvas.width = canvas.width;
    exportCanvas.height = canvas.height;
    const expCtx = exportCanvas.getContext("2d");
    if (!expCtx) return;

    expCtx.fillStyle = "#000000";
    expCtx.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
    expCtx.drawImage(canvas, 0, 0);

    const dataUrl = exportCanvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `whiteboard-lecture-${new Date().toISOString().slice(0, 10)}.png`;
    a.click();
  }, []);

  const getCursorStyle = () => {
    if (isPanningRef.current) return "grabbing";
    if (isSpaceHeldRef.current || mode === "pan") return "grab";
    if (isDraggingSelectionRef.current) return "move";
    if (mode === "lasso") return "crosshair";
    if (mode === "erase") return "cell";
    if (mode === "text") return "text";
    if (mode === "note") return "copy";
    if (mode === "laser") return "crosshair";
    return "crosshair";
  };

  const currentSelectionBbox = hasSelectedElements(selectedIds)
    ? computeSelectionBoundingBox(
        strokes.filter((s) => selectedIds.strokeIds.has(s.id)),
        shapes.filter((sh) => selectedIds.shapeIds.has(sh.id)),
        texts.filter((t) => selectedIds.textIds.has(t.id)),
        notes.filter((n) => selectedIds.noteIds.has(n.id)),
        images.filter((i) => selectedIds.imageIds.has(i.id))
      )
    : null;

  const currentSlide = slides[currentSlideIndex];
  const isSlideEmpty =
    (!currentSlide ||
      (currentSlide.strokes.length === 0 &&
        currentSlide.shapes.length === 0 &&
        currentSlide.texts.length === 0 &&
        currentSlide.notes.length === 0 &&
        currentSlide.images.length === 0 &&
        (!currentSlide.maths || currentSlide.maths.length === 0))) &&
    strokes.length === 0 &&
    shapes.length === 0 &&
    texts.length === 0 &&
    notes.length === 0 &&
    images.length === 0 &&
    maths.length === 0 &&
    !textEditor;

  return (
    <div
      ref={containerRef}
      className="relative w-screen h-screen overflow-hidden bg-black select-none touch-none"
      onDragOver={onDragOver}
      onDrop={onDrop}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* ── Infinite Blackboard Canvas ── */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full touch-none"
        style={{ backgroundColor: "#000000", cursor: getCursorStyle() }}
        onContextMenu={(e) => e.preventDefault()}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onPointerCancel={onPointerCancel}
      />

      {/* ── Tapboard Top Brand Header & Telemetry ── */}
      <HeaderBar
        onNewNotebook={handleNewNotebook}
        title={lectureTitle}
        onTitleChange={handleTitleChange}
        gridStyle={gridStyle}
        onGridChange={(g) => {
          setGridStyle(g);
          scheduleRedraw();
        }}
        onPdfUpload={handlePdfUpload}
        onExport={handleExport}
        onExportNotesPdf={handleExportNotesPdf}
        isExportingNotes={isExportingNotes}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        onFitToScreen={handleFitToScreen}
        isFiniteMode={isFiniteMode}
        onToggleFiniteMode={() => {
          toggleFiniteMode();
          scheduleRedraw();
        }}
        onClear={handleClear}
        onOpenShortcuts={() => setShortcutsOpen(true)}
        isPenActive={isLiveStylus}
        currentPressure={livePressure}
        onExportTapboard={handleExportTapboard}
        onImportTapboard={handleImportTapboard}
        onStartRecording={handleStartRecording}
        isRecording={recorderState.isRecording}
        isAutoSaved={true}
        currentUser={currentUser}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onOpenCloudLibrary={() => setIsCloudLibraryOpen(true)}
        onSignOut={async () => {
          await signOutUser();
          setCurrentUser(null);
          setActiveCloudDrawingId(null);
        }}
      />

      {/* ── Interactive Inline Text / Sticky Note Input Overlay ── */}
      {textEditor && (
        textEditor.isNote ? (
          /* Sticky Note modal card */
          <div
            className="fixed z-50 p-3 rounded-2xl shadow-2xl border border-amber-400/80 flex flex-col gap-2 backdrop-blur-xl bg-amber-100/95 animate-in fade-in duration-100"
            style={{
              left: textEditor.screenX,
              top: textEditor.screenY,
              minWidth: "220px",
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between text-[11px] font-mono px-1">
              <div className="flex items-center gap-1.5 font-bold text-amber-900">
                <StickyNoteIcon className="w-3.5 h-3.5" />
                <span>Sticky Note</span>
              </div>
              <span className="text-amber-800/60 text-[10px]">
                Enter to save • Esc to cancel
              </span>
            </div>
            <textarea
              ref={textEditorRef}
              autoFocus
              value={textEditor.text}
              onChange={(e) =>
                setTextEditor((prev) => (prev ? { ...prev, text: e.target.value } : null))
              }
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  commitTextEditor(textEditor.text);
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setTextEditor(null);
                }
              }}
              placeholder="Type note here..."
              rows={3}
              className="w-full outline-none font-sans rounded-lg p-1.5 resize-none bg-transparent text-amber-950 text-[15px] font-medium"
            />
            <div className="flex items-center justify-end gap-2 pt-1 border-t border-amber-300">
              <button
                onClick={() => setTextEditor(null)}
                className="px-2.5 py-1 rounded-lg text-xs font-medium text-amber-900 hover:bg-black/10 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={() => commitTextEditor(textEditor.text)}
                className="px-3 py-1 rounded-lg text-xs font-bold shadow-md bg-amber-500 hover:bg-amber-600 text-amber-950 transition-all active:scale-95"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Seamless Canvas-Direct Inline Text Input (No Box!) */
          <div
            className="fixed z-50 animate-in fade-in duration-75 flex flex-col items-start select-text"
            style={{
              left: textEditor.screenX,
              top: textEditor.screenY,
            }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            <textarea
              ref={textEditorRef}
              autoFocus
              value={textEditor.text}
              onChange={(e) =>
                setTextEditor((prev) => (prev ? { ...prev, text: e.target.value } : null))
              }
              onBlur={() => {
                commitTextEditor(textEditor.text);
              }}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  commitTextEditor(textEditor.text);
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setTextEditor(null);
                }
              }}
              placeholder="Type directly on canvas..."
              rows={Math.max(1, textEditor.text.split("\n").length)}
              className="
                outline-none bg-transparent p-0 m-0 resize-none border-b border-dashed border-sky-400/50
                focus:border-sky-400 transition-colors
              "
              style={{
                color: color,
                fontFamily:
                  fontStyle === "handwriting"
                    ? "'Caveat', cursive"
                    : "'Inter', system-ui, -apple-system, sans-serif",
                fontSize: `${(strokeWidthRef.current === "thin" ? 18 : strokeWidthRef.current === "medium" ? 26 : 36) * camera.zoom}px`,
                lineHeight: fontStyle === "handwriting" ? 1.2 : 1.3,
                fontWeight: 600,
                minWidth: "160px",
                width: `${Math.max(180, (textEditor.text.length + 3) * (strokeWidthRef.current === "thin" ? 12 : strokeWidthRef.current === "medium" ? 16 : 22) * camera.zoom)}px`,
              }}
            />
            {/* Subtle floating helper pill */}
            <div className="flex items-center gap-2 mt-1.5 px-2.5 py-0.5 rounded-full bg-zinc-950/85 backdrop-blur-md border border-white/10 text-[10px] text-zinc-400 select-none shadow-lg">
              <span className="text-zinc-300">↵ Save to board</span>
              <span>•</span>
              <span>Shift+↵ New line</span>
              <span>•</span>
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  setFontStyle((prev) => (prev === "handwriting" ? "normal" : "handwriting"));
                }}
                className="text-sky-300 hover:text-sky-200 font-semibold"
              >
                {fontStyle === "handwriting" ? "✍️ Handwriting" : "🔤 Print"}
              </button>
            </div>
          </div>
        )
      )}

      {/* ── Empty State Watermark & Quick Hotkeys ── */}
      {isSlideEmpty && (
        <div className="pointer-events-none fixed inset-0 flex flex-col items-center justify-center select-none z-10 animate-in fade-in duration-500">
          <div className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-zinc-950/40 backdrop-blur-sm border border-white/[0.04] shadow-2xl">
            {/* Logo Mark with subtle glow */}
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-sky-500/30 to-cyan-400/20 blur-md" />
              <div className="relative w-full h-full rounded-2xl bg-zinc-900/80 border border-white/10 flex items-center justify-center shadow-lg">
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                  <circle cx="13" cy="16" r="8" stroke="white" strokeWidth="1.5" opacity="0.3"/>
                  <circle cx="13" cy="16" r="4.5" stroke="white" strokeWidth="1.5" opacity="0.6"/>
                  <circle cx="13" cy="16" r="1.8" fill="#38bdf8"/>
                  <path d="M20 8 L23 11 L16 18 L13.5 18 L13.5 15.5 Z" fill="#38bdf8" opacity="0.9"/>
                </svg>
              </div>
            </div>

            <div className="flex flex-col items-center text-center">
              <span className="text-sm font-bold text-zinc-200 tracking-tight">
                Tapboard
              </span>
              <span className="text-xs text-zinc-400 mt-0.5">
                Draw with pen, type directly on board, or import a PDF
              </span>
            </div>

            {/* Quick shortcuts pills */}
            <div className="flex items-center gap-2 mt-1">
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] text-zinc-300 font-mono">
                <kbd className="px-1 py-0.2 rounded bg-white/10 font-bold text-white">P</kbd> Pen
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] text-zinc-300 font-mono">
                <kbd className="px-1 py-0.2 rounded bg-white/10 font-bold text-white">T</kbd> Text
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] text-zinc-300 font-mono">
                <kbd className="px-1 py-0.2 rounded bg-white/10 font-bold text-white">E</kbd> Eraser
              </span>
              <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.03] border border-white/[0.06] text-[11px] text-zinc-300 font-mono">
                <kbd className="px-1 py-0.2 rounded bg-white/10 font-bold text-white">?</kbd> Shortcuts
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Subtle Tool Context Badge (Under Header) ── */}
      <div className="fixed top-16 left-5 z-30 flex items-center gap-2 pointer-events-none">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-zinc-950/75 backdrop-blur-xl border border-white/5 text-[11px] text-zinc-400 font-mono shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
          <span>
            {mode === "lasso"
              ? "Lasso active • Circle strokes to group & move"
              : mode === "text"
              ? "Click canvas to place text"
              : mode === "note"
              ? "Click canvas to place sticky note"
              : mode === "erase"
              ? "Precision trimming eraser"
              : mode === "laser"
              ? "Laser pointer active"
              : isDrawingShapeRef.current
              ? "Hold Shift for 1:1 aspect constraint"
              : `Pigment: ${color} • ${lineStyle.toUpperCase()} • ${fillStyle === "semi" ? "TINTED" : "OUTLINE"}`}
          </span>
        </div>

        {selectedImageId && (
          <div className="pointer-events-auto flex items-center gap-2 px-2.5 py-1 rounded-full bg-sky-500/20 backdrop-blur-xl border border-sky-400/40 text-xs text-sky-200">
            <span>Image / PDF Page</span>
            <button
              onClick={() => {
                setImages((prev) => prev.filter((img) => img.id !== selectedImageId));
                setSelectedImageId(null);
                scheduleRedraw();
              }}
              title="Delete Document Page (Del)"
              className="hover:text-red-400 flex items-center gap-1 font-bold ml-1"
            >
              <Trash2 className="w-3 h-3" />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>

      {/* ── Floating Lasso Selection Action Bar ── */}
      {hasSelectedElements(selectedIds) && currentSelectionBbox && (
        <div
          className="
            fixed z-40 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5
            rounded-2xl bg-zinc-950/95 backdrop-blur-2xl border border-cyan-400/40
            shadow-2xl shadow-cyan-950/50 text-xs text-white font-medium
            transition-all duration-75
          "
          style={{
            left: Math.min(
              window.innerWidth - 170,
              Math.max(170, currentSelectionBbox.centerX * camera.zoom + camera.x)
            ),
            top: Math.max(70, currentSelectionBbox.minY * camera.zoom + camera.y - 48),
          }}
          onPointerDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-1.5 text-cyan-300 font-mono text-[11px] pr-2 border-r border-white/10">
            <LassoSelect className="w-3.5 h-3.5" />
            <span>{countSelectedElements(selectedIds)} selected</span>
          </div>

          <button
            onClick={duplicateSelection}
            title="Duplicate selection (Ctrl+D)"
            className="flex items-center gap-1.5 px-2 py-1 rounded-xl hover:bg-white/10 text-zinc-300 hover:text-white transition-all text-xs"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Duplicate</span>
            <span className="text-[9px] font-mono opacity-50">^D</span>
          </button>

          <button
            onClick={deleteSelection}
            title="Delete selection (Delete / Backspace)"
            className="flex items-center gap-1.5 px-2 py-1 rounded-xl hover:bg-red-500/20 text-red-300 hover:text-red-200 transition-all text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete</span>
            <span className="text-[9px] font-mono opacity-50">Del</span>
          </button>

          <button
            onClick={() => {
              selectedIdsRef.current = EMPTY_SELECTION;
              setSelectedIds(EMPTY_SELECTION);
              scheduleRedraw();
            }}
            title="Deselect (Escape)"
            className="p-1 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-white transition-all text-xs ml-0.5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ── Floating Obsidian Island Toolbar ── */}
      <Toolbar
        mode={mode}
        color={color}
        strokeWidth={strokeWidth}
        lineStyle={lineStyle}
        fillStyle={fillStyle}
        camera={camera}
        canUndo={undoStack.length > 0}
        canRedo={redoStack.length > 0}
        onModeChange={setMode}
        onColorChange={setColor}
        onWidthChange={setStrokeWidth}
        onLineStyleChange={setLineStyle}
        onFillStyleChange={setFillStyle}
        onResetCamera={handleResetCamera}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onUndo={handleUndo}
        onRedo={handleRedo}
        smartSnapEnabled={smartSnapEnabled}
        onToggleSmartSnap={() => setSmartSnapEnabled((p) => !p)}
        isFiniteMode={isFiniteMode}
        penStyle={penStyle}
        onPenStyleChange={setPenStyle}
        fontStyle={fontStyle}
        onFontStyleChange={setFontStyle}
      />

      {/* ── Native PDF Document Import Modal ── */}
      {pendingPdf && (
        <PdfImportModal
          pdf={pendingPdf.pdf}
          fileSize={pendingPdf.fileSize}
          onImport={handleImportPdfPages}
          onClose={() => setPendingPdf(null)}
        />
      )}

      {/* ── Keyboard Shortcuts Guide Modal ── */}
      <ShortcutsModal
        isOpen={shortcutsOpen}
        onClose={() => setShortcutsOpen(false)}
      />

      {/* ── Unacademy Slide Controller & Drawer ── */}
      <SlideTray
        slides={slides}
        currentSlideIndex={currentSlideIndex}
        onSelectSlide={handleSelectSlide}
        onAddBlankSlide={handleAddBlankSlide}
        onDuplicateSlide={() => handleDuplicateSlide(currentSlideIndex)}
        onDeleteSlide={() => handleDeleteSlide(currentSlideIndex)}
        onFitToScreen={handleFitToScreen}
      />

      {/* ── Enterprise In-Browser Lecture Video & Audio Recorder Widget ── */}
      <LectureRecorderWidget
        state={recorderState}
        onPause={() => lectureRecorder.pauseRecording()}
        onResume={() => lectureRecorder.resumeRecording()}
        onStop={() => lectureRecorder.stopRecording()}
      />

      {/* ── Interactive KaTeX LaTeX Math & Equation Modal ── */}
      <MathFormulaModal
        isOpen={isMathModalOpen}
        onClose={() => {
          setIsMathModalOpen(false);
          setPendingMathPos(null);
        }}
        onInsert={handleInsertMath}
      />

      {/* ── Supabase Authentication Modal ── */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onAuthSuccess={() => {
          getCurrentUser().then((u) => setCurrentUser(u));
        }}
      />

      {/* ── Supabase Cloud Lecture Library Drawer Modal ── */}
      <CloudLibraryModal
        isOpen={isCloudLibraryOpen}
        onClose={() => setIsCloudLibraryOpen(false)}
        onLoadDrawing={handleLoadCloudDrawing}
        onSaveCurrentToCloud={handleSaveCurrentToCloud}
        onNewNotebook={handleNewNotebook}
        isSavingCurrent={isSavingToCloud}
        activeDrawingId={activeCloudDrawingId}
      />
    </div>
  );
};
