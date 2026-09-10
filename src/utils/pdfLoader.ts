import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

// Configure Web Worker for zero-lag background PDF parsing
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export interface LoadedPdf {
  doc: pdfjsLib.PDFDocumentProxy;
  numPages: number;
  fileName: string;
}

export interface RenderedPdfPage {
  pageNumber: number;
  dataUrl: string;
  imgElement: HTMLImageElement;
  worldWidth: number;
  worldHeight: number;
}

/**
 * Loads a PDF file into a PDFDocumentProxy instance.
 */
export async function loadPdfDocument(file: File): Promise<LoadedPdf> {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/",
    cMapPacked: true,
  });

  const doc = await loadingTask.promise;
  return {
    doc,
    numPages: doc.numPages,
    fileName: file.name,
  };
}

/**
 * Renders a PDF page to a high-DPI ImageElement suitable for placement on canvas.
 * @param doc Loaded PDF document
 * @param pageNumber 1-indexed page number
 * @param renderScale Scale factor for backing store (default 2.0 for razor-sharp text)
 */
export async function renderPdfPage(
  doc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  renderScale = 2.0
): Promise<RenderedPdfPage> {
  const page = await doc.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1.0 });
  const renderViewport = page.getViewport({ scale: renderScale });

  const offscreenCanvas = document.createElement("canvas");
  offscreenCanvas.width = renderViewport.width;
  offscreenCanvas.height = renderViewport.height;

  const ctx = offscreenCanvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Could not create canvas context for PDF rendering");

  // Paint white background (PDFs may have transparent background by default)
  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, offscreenCanvas.width, offscreenCanvas.height);

  const renderContext = {
    canvasContext: ctx,
    viewport: renderViewport,
    canvas: offscreenCanvas,
  };

  await page.render(renderContext).promise;

  const dataUrl = offscreenCanvas.toDataURL("image/png");

  // Load into an HTMLImageElement
  const imgElement = await new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = dataUrl;
  });

  return {
    pageNumber,
    dataUrl,
    imgElement,
    worldWidth: baseViewport.width,
    worldHeight: baseViewport.height,
  };
}

/**
 * Renders a small thumbnail of a page for the import dialog preview.
 */
export async function renderPdfThumbnail(
  doc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  targetWidth = 180
): Promise<string> {
  const page = await doc.getPage(pageNumber);
  const baseViewport = page.getViewport({ scale: 1.0 });
  const scale = targetWidth / baseViewport.width;
  const viewport = page.getViewport({ scale });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return "";

  ctx.fillStyle = "#FFFFFF";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas.toDataURL("image/jpeg", 0.85);
}
