import React, { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  Edit3,
  Check,
  HelpCircle,
  Grid3X3,
  FileUp,
  Download,
  Trash2,
  PenTool,
  MousePointer2,
  BookOpen,
  Loader2,
} from "lucide-react";
import type { GridStyle } from "../types/whiteboard";

interface HeaderBarProps {
  title: string;
  onTitleChange: (newTitle: string) => void;
  gridStyle: GridStyle;
  onGridChange: (grid: GridStyle) => void;
  onPdfUpload: (file: File) => void;
  onExport: () => void;
  onExportNotesPdf: () => void;
  isExportingNotes?: boolean;
  onClear: () => void;
  onOpenShortcuts: () => void;
  isPenActive: boolean;
  currentPressure: number;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  title,
  onTitleChange,
  gridStyle,
  onGridChange,
  onPdfUpload,
  onExport,
  onExportNotesPdf,
  isExportingNotes = false,
  onClear,
  onOpenShortcuts,
  isPenActive,
  currentPressure,
}) => {
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState(title);
  const [confirmClear, setConfirmClear] = useState(false);
  const titleInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTempTitle(title);
  }, [title]);

  useEffect(() => {
    if (isEditingTitle) {
      titleInputRef.current?.focus();
      titleInputRef.current?.select();
    }
  }, [isEditingTitle]);

  useEffect(() => {
    if (!confirmClear) return;
    const t = setTimeout(() => setConfirmClear(false), 3000);
    return () => clearTimeout(t);
  }, [confirmClear]);

  const commitTitle = () => {
    const trimmed = tempTitle.trim();
    if (trimmed) {
      onTitleChange(trimmed);
    } else {
      setTempTitle(title);
    }
    setIsEditingTitle(false);
  };

  const cycleGrid = () => {
    if (gridStyle === "dots") onGridChange("grid");
    else if (gridStyle === "grid") onGridChange("none");
    else onGridChange("dots");
  };

  const getGridLabel = () => {
    switch (gridStyle) {
      case "dots":
        return "Dot Grid";
      case "grid":
        return "Math Grid";
      case "none":
        return "Blank Slate";
    }
  };

  return (
    <header
      className="
        fixed top-3 inset-x-3 z-40
        flex items-center justify-between
        px-3.5 py-2
        rounded-2xl
        bg-zinc-950/85 backdrop-blur-2xl
        border border-white/10
        shadow-[0_16px_40px_rgba(0,0,0,0.85)]
        select-none
        transition-all duration-200
      "
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* ── Left: Brand Mark & Editable Title ── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Brand Monogram */}
        <div className="flex items-center gap-2 pr-3 border-r border-white/10 shrink-0">
          <div className="relative flex items-center justify-center w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-indigo-500 shadow-md shadow-cyan-500/25 ring-1 ring-white/20">
            <Sparkles className="w-4 h-4 text-white animate-pulse" />
          </div>
          <div className="flex flex-col leading-none">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold tracking-tight text-white font-sans">
                Scribe
              </span>
              <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                STUDIO
              </span>
            </div>
            <span className="text-[10px] text-zinc-400 font-medium tracking-wide">
              Digital Slate
            </span>
          </div>
        </div>

        {/* Editable Lecture Title */}
        <div className="flex items-center gap-1.5 min-w-0 max-w-xs md:max-w-md">
          {isEditingTitle ? (
            <div className="flex items-center gap-1">
              <input
                ref={titleInputRef}
                type="text"
                value={tempTitle}
                onChange={(e) => setTempTitle(e.target.value)}
                onBlur={commitTitle}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitTitle();
                  if (e.key === "Escape") {
                    setTempTitle(title);
                    setIsEditingTitle(false);
                  }
                }}
                className="
                  px-2 py-0.5 rounded-lg bg-zinc-900 border border-cyan-500/50 text-xs text-white font-medium
                  outline-none ring-1 ring-cyan-500/30 w-48 sm:w-64 font-sans
                "
              />
              <button
                onClick={commitTitle}
                className="p-1 rounded-lg bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30 transition-colors"
                title="Save Title (Enter)"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingTitle(true)}
              className="
                group flex items-center gap-1.5 px-2 py-1 rounded-xl
                hover:bg-white/[0.08] transition-all text-left min-w-0
              "
              title="Click to rename lecture (Enter to save)"
            >
              <span className="text-xs font-semibold text-zinc-200 truncate group-hover:text-white transition-colors">
                {title}
              </span>
              <Edit3 className="w-3 h-3 text-zinc-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}
        </div>
      </div>

      {/* ── Center: Tablet Hardware Sensor Pill ── */}
      <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/5 text-[11px] font-mono">
        {isPenActive || currentPressure > 0 ? (
          <>
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <PenTool className="w-3 h-3 text-emerald-400" />
            <span className="text-emerald-300 font-medium">Stylus Active</span>
            <span className="text-zinc-500">•</span>
            <span className="text-zinc-400">
              {Math.round(currentPressure * 8192)} / 8192 levels
            </span>
          </>
        ) : (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" />
            <MousePointer2 className="w-3 h-3 text-zinc-400" />
            <span className="text-zinc-400">Huion / Wacom Ready</span>
          </>
        )}
      </div>

      {/* ── Right: Canvas Controls & Actions ── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Background Grid Selector */}
        <button
          onClick={cycleGrid}
          title="Cycle Background Grid (G): Dot Grid / Math Grid / Blank"
          className="
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium text-zinc-300
            bg-white/[0.05] hover:bg-white/[0.12] hover:text-white border border-white/5
            transition-all duration-150 active:scale-95
          "
        >
          <Grid3X3 className="w-3.5 h-3.5 text-zinc-400" />
          <span className="hidden sm:inline font-mono text-[11px]">
            {getGridLabel()}
          </span>
        </button>

        {/* Native PDF Import */}
        <label
          title="Import PDF document (lecture notes, exam papers, slides)"
          className="
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold
            text-cyan-300 bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30
            cursor-pointer transition-all duration-150 active:scale-95
          "
        >
          <FileUp className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">PDF</span>
          <input
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                onPdfUpload(e.target.files[0]);
                e.target.value = "";
              }
            }}
          />
        </label>

        {/* Export High-Res PNG */}
        <button
          onClick={onExport}
          title="Export high-resolution lecture PNG"
          className="
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold
            text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30
            transition-all duration-150 active:scale-95
          "
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">PNG</span>
        </button>

        {/* Export Multi-Page Annotated Class Notes PDF */}
        <button
          onClick={onExportNotesPdf}
          disabled={isExportingNotes}
          title="Export Multi-Page Annotated Class Notes PDF (All Slides Combined)"
          className={`
            flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold
            text-amber-300 bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30
            transition-all duration-150 active:scale-95
            ${isExportingNotes ? "opacity-60 cursor-wait" : ""}
          `}
        >
          {isExportingNotes ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-300" />
          ) : (
            <BookOpen className="w-3.5 h-3.5" />
          )}
          <span className="hidden md:inline">
            {isExportingNotes ? "Exporting..." : "Notes PDF"}
          </span>
        </button>

        {/* Clear Canvas with Safety Confirmation */}
        <button
          onClick={() => {
            if (confirmClear) {
              onClear();
              setConfirmClear(false);
            } else {
              setConfirmClear(true);
            }
          }}
          title="Clear all blackboard ink & shapes"
          className={`
            flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold
            border transition-all duration-150 active:scale-95
            ${
              confirmClear
                ? "bg-red-500 text-white border-red-400 animate-pulse"
                : "text-red-400 bg-red-500/10 hover:bg-red-500/20 border-red-500/30"
            }
          `}
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">
            {confirmClear ? "Confirm?" : "Clear"}
          </span>
        </button>

        <div className="w-px h-5 bg-white/10 shrink-0 mx-0.5" />

        {/* Keyboard Shortcuts Help */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts & Gestures (?)"
          className="
            flex items-center justify-center w-8 h-8 rounded-xl
            text-zinc-400 hover:text-white bg-white/[0.05] hover:bg-white/[0.12]
            border border-white/5 transition-all active:scale-95
          "
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
