import React, { useState, useEffect } from "react";
import {
  FileText,
  X,
  Columns,
  Rows,
  ArrowDownToLine,
  Loader2,
} from "lucide-react";
import type { LoadedPdf, RenderedPdfPage } from "../utils/pdfLoader";
import { renderPdfPage, renderPdfThumbnail } from "../utils/pdfLoader";

export type PdfLayoutMode = "vertical" | "horizontal";

interface PdfImportModalProps {
  pdf: LoadedPdf;
  fileSize: number;
  onImport: (pages: RenderedPdfPage[], layout: PdfLayoutMode) => void;
  onClose: () => void;
}

export const PdfImportModal: React.FC<PdfImportModalProps> = ({
  pdf,
  fileSize,
  onImport,
  onClose,
}) => {
  const [layout, setLayout] = useState<PdfLayoutMode>("vertical");
  const [pageSelection, setPageSelection] = useState<"all" | "first" | "custom">("all");
  const [customRange, setCustomRange] = useState("1-3");
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState<{ current: number; total: number } | null>(null);

  // Load thumbnail of Page 1
  useEffect(() => {
    let active = true;
    renderPdfThumbnail(pdf.doc, 1, 200).then((thumb) => {
      if (active) setThumbnailUrl(thumb);
    });
    return () => {
      active = false;
    };
  }, [pdf]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const parsePageNumbers = (): number[] => {
    if (pageSelection === "first") return [1];
    if (pageSelection === "all") {
      return Array.from({ length: pdf.numPages }, (_, i) => i + 1);
    }

    // Parse custom range (e.g. "1-3, 5, 8")
    const pages = new Set<number>();
    const parts = customRange.split(",");
    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes("-")) {
        const [startStr, endStr] = trimmed.split("-");
        const start = parseInt(startStr, 10);
        const end = parseInt(endStr, 10);
        if (!isNaN(start) && !isNaN(end)) {
          for (let p = Math.max(1, start); p <= Math.min(pdf.numPages, end); p++) {
            pages.add(p);
          }
        }
      } else {
        const p = parseInt(trimmed, 10);
        if (!isNaN(p) && p >= 1 && p <= pdf.numPages) {
          pages.add(p);
        }
      }
    }

    const result = Array.from(pages).sort((a, b) => a - b);
    return result.length > 0 ? result : [1];
  };

  const handleStartImport = async () => {
    setIsRendering(true);
    const pagesToRender = parsePageNumbers();
    const rendered: RenderedPdfPage[] = [];

    for (let i = 0; i < pagesToRender.length; i++) {
      const pNum = pagesToRender[i];
      setRenderProgress({ current: i + 1, total: pagesToRender.length });
      const renderedPage = await renderPdfPage(pdf.doc, pNum, 2.0);
      rendered.push(renderedPage);
    }

    setIsRendering(false);
    onImport(rendered, layout);
  };

  const pageCountToImport = parsePageNumbers().length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className="
          w-full max-w-lg rounded-3xl
          bg-zinc-950/95 border border-white/15
          shadow-[0_25px_70px_rgba(0,0,0,0.95)]
          p-6 flex flex-col gap-5 text-white select-none
        "
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight truncate max-w-[280px]">
                {pdf.fileName}
              </h2>
              <div className="flex items-center gap-2 text-xs text-zinc-400 font-mono mt-0.5">
                <span>{pdf.numPages} {pdf.numPages === 1 ? "page" : "pages"}</span>
                <span>•</span>
                <span>{formatFileSize(fileSize)}</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isRendering}
            className="w-8 h-8 rounded-xl flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex gap-5">
          {/* Page 1 Preview Thumbnail */}
          <div className="w-36 shrink-0 flex flex-col items-center gap-2">
            <div className="w-full aspect-[3/4] rounded-xl bg-zinc-900 border border-white/10 overflow-hidden flex items-center justify-center relative shadow-md">
              {thumbnailUrl ? (
                <img
                  src={thumbnailUrl}
                  alt="Page 1 Preview"
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="text-zinc-500 text-xs font-mono flex flex-col items-center gap-1.5">
                  <Loader2 className="w-4 h-4 animate-spin text-zinc-400" />
                  <span>Loading...</span>
                </div>
              )}
              <span className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-[9px] font-mono text-zinc-300">
                Page 1
              </span>
            </div>
          </div>

          {/* Configuration Options */}
          <div className="flex-1 flex flex-col gap-4">
            {/* 1. Layout Mode */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-300">Layout Arrangement</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setLayout("vertical")}
                  disabled={isRendering}
                  className={`
                    flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all
                    ${
                      layout === "vertical"
                        ? "bg-cyan-500/20 border-cyan-400/60 text-cyan-200 shadow-sm"
                        : "bg-white/[0.04] border-white/5 text-zinc-400 hover:text-white"
                    }
                  `}
                >
                  <Rows className="w-4 h-4" />
                  <span>Vertical Column</span>
                  <span className="text-[10px] opacity-60 font-mono">Worksheet / Exam</span>
                </button>

                <button
                  onClick={() => setLayout("horizontal")}
                  disabled={isRendering}
                  className={`
                    flex flex-col items-center gap-1.5 p-2.5 rounded-xl border text-xs font-medium transition-all
                    ${
                      layout === "horizontal"
                        ? "bg-cyan-500/20 border-cyan-400/60 text-cyan-200 shadow-sm"
                        : "bg-white/[0.04] border-white/5 text-zinc-400 hover:text-white"
                    }
                  `}
                >
                  <Columns className="w-4 h-4" />
                  <span>Horizontal Row</span>
                  <span className="text-[10px] opacity-60 font-mono">Slide Deck</span>
                </button>
              </div>
            </div>

            {/* 2. Page Range */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-zinc-300">Pages to Import</label>
              <div className="flex items-center gap-1.5 bg-white/[0.04] p-1 rounded-xl border border-white/5 text-xs">
                <button
                  onClick={() => setPageSelection("all")}
                  disabled={isRendering}
                  className={`
                    flex-1 py-1 rounded-lg text-center font-medium transition-all
                    ${
                      pageSelection === "all"
                        ? "bg-white text-zinc-950 font-bold shadow"
                        : "text-zinc-400 hover:text-white"
                    }
                  `}
                >
                  All ({pdf.numPages})
                </button>

                <button
                  onClick={() => setPageSelection("first")}
                  disabled={isRendering}
                  className={`
                    flex-1 py-1 rounded-lg text-center font-medium transition-all
                    ${
                      pageSelection === "first"
                        ? "bg-white text-zinc-950 font-bold shadow"
                        : "text-zinc-400 hover:text-white"
                    }
                  `}
                >
                  Page 1 Only
                </button>

                {pdf.numPages > 1 && (
                  <button
                    onClick={() => setPageSelection("custom")}
                    disabled={isRendering}
                    className={`
                      flex-1 py-1 rounded-lg text-center font-medium transition-all
                      ${
                        pageSelection === "custom"
                          ? "bg-white text-zinc-950 font-bold shadow"
                          : "text-zinc-400 hover:text-white"
                      }
                    `}
                  >
                    Custom
                  </button>
                )}
              </div>

              {pageSelection === "custom" && (
                <input
                  type="text"
                  value={customRange}
                  disabled={isRendering}
                  onChange={(e) => setCustomRange(e.target.value)}
                  placeholder="e.g. 1-3, 5"
                  className="
                    w-full px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10
                    text-xs font-mono text-white outline-none focus:border-cyan-400
                  "
                />
              )}
            </div>
          </div>
        </div>

        {/* Rendering Progress Bar */}
        {isRendering && renderProgress && (
          <div className="flex flex-col gap-2 p-3 rounded-2xl bg-cyan-500/10 border border-cyan-400/20">
            <div className="flex items-center justify-between text-xs font-mono text-cyan-300">
              <div className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Rendering PDF vector pages at 2x retina crispness...</span>
              </div>
              <span>
                {renderProgress.current} / {renderProgress.total}
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full bg-cyan-400 transition-all duration-200"
                style={{
                  width: `${(renderProgress.current / renderProgress.total) * 100}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={isRendering}
            className="px-4 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-white hover:bg-white/10 transition-all"
          >
            Cancel
          </button>

          <button
            onClick={handleStartImport}
            disabled={isRendering || pageCountToImport === 0}
            className="
              flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold
              bg-cyan-400 hover:bg-cyan-300 text-zinc-950 shadow-lg shadow-cyan-400/25
              transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            {isRendering ? (
              <span className="flex items-center gap-1.5">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Rendering...
              </span>
            ) : (
              <>
                <ArrowDownToLine className="w-3.5 h-3.5" />
                <span>
                  Import {pageCountToImport} {pageCountToImport === 1 ? "Page" : "Pages"} to Board
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
