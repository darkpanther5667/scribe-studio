import React, { useState, useRef, useEffect } from "react";
import {
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
  Maximize,
  Minimize,
  Maximize2,
  Layers,
  Video,
  Save,
  FolderOpen,
  CheckCheck,
  Cloud,
  User,
  LogOut,
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
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  onFitToScreen?: () => void;
  isFiniteMode?: boolean;
  onToggleFiniteMode?: () => void;
  onClear: () => void;
  onOpenShortcuts: () => void;
  isPenActive: boolean;
  currentPressure: number;
  onExportTapboard?: () => void;
  onImportTapboard?: (file: File) => void;
  onStartRecording?: () => void;
  isRecording?: boolean;
  isAutoSaved?: boolean;
  currentUser?: { email?: string } | null;
  onOpenAuth?: () => void;
  onOpenCloudLibrary?: () => void;
  onSignOut?: () => void;
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
  isFullscreen = false,
  onToggleFullscreen,
  onFitToScreen,
  isFiniteMode = false,
  onToggleFiniteMode,
  onClear,
  onOpenShortcuts,
  isPenActive,
  currentPressure,
  onExportTapboard,
  onImportTapboard,
  onStartRecording,
  isRecording = false,
  isAutoSaved = true,
  currentUser = null,
  onOpenAuth,
  onOpenCloudLibrary,
  onSignOut,
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
        bg-zinc-950/90 backdrop-blur-2xl
        border border-white/[0.08]
        shadow-[0_8px_32px_rgba(0,0,0,0.7)]
        select-none
        transition-all duration-200
      "
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* ── Left: Tapboard Brand & Editable Title ── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Tapboard Logo — tap ripple + pen mark */}
        <div className="flex items-center gap-2.5 pr-3.5 border-r border-white/[0.08] shrink-0">
          <div className="relative w-8 h-8 shrink-0">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 shadow-lg shadow-cyan-500/30" />
            <svg viewBox="0 0 32 32" className="absolute inset-0 w-full h-full p-1.5" fill="none">
              <circle cx="13" cy="16" r="8" stroke="white" strokeWidth="1.5" opacity="0.25"/>
              <circle cx="13" cy="16" r="4.5" stroke="white" strokeWidth="1.5" opacity="0.5"/>
              <circle cx="13" cy="16" r="1.8" fill="white"/>
              <path d="M20 8 L23 11 L16 18 L13.5 18 L13.5 15.5 Z" fill="white" opacity="0.9"/>
              <path d="M23 8 L24.5 9.5 L22 11 L20 8 Z" fill="white" opacity="0.55"/>
            </svg>
          </div>
          <div className="flex flex-col leading-none">
            <span className="text-[15px] font-bold tracking-[-0.03em] text-white" style={{fontFamily:"'Inter', sans-serif"}}>
              Tapboard
            </span>
            <span className="text-[10px] text-zinc-500 font-medium tracking-wide mt-px">
              Teaching Whiteboard
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

      {/* ── Center: Tablet Hardware & Auto-Save Sync ── */}
      <div className="hidden md:flex items-center gap-2">
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/5 text-[11px] font-mono">
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
              <span className="text-zinc-400">Tablet Ready</span>
            </>
          )}
        </div>

        {/* Local IndexedDB Auto-Save Status */}
        <div
          title="Auto-saved to local offline storage (never lose work on refresh)"
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-300"
        >
          <CheckCheck className="w-3 h-3 text-emerald-400" />
          <span>{isAutoSaved ? "Auto-saved" : "Saving..."}</span>
        </div>
      </div>

      {/* ── Right: Canvas Controls & Actions ── */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Supabase Cloud Sync / Auth */}
        {currentUser ? (
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenCloudLibrary}
              title={`Logged in as ${currentUser.email} • Click to open Cloud Lectures`}
              className="
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold
                text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30
                transition-all duration-150 active:scale-95 shadow-sm
              "
            >
              <Cloud className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline max-w-[110px] truncate">
                {currentUser.email?.split("@")[0] || "Lectures"}
              </span>
            </button>
            {onSignOut && (
              <button
                onClick={onSignOut}
                title="Sign Out of Supabase"
                className="p-1.5 rounded-xl text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ) : (
          onOpenAuth && (
            <button
              onClick={onOpenAuth}
              title="Sign in with Supabase to save drawings to the cloud"
              className="
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold
                text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30
                transition-all duration-150 active:scale-95
              "
            >
              <User className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )
        )}

        {/* Record Lecture Video & Mic */}
        {onStartRecording && (
          <button
            onClick={onStartRecording}
            disabled={isRecording}
            title="Record Video Lecture with Educator Mic Audio"
            className={`
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold
              transition-all duration-150 active:scale-95
              ${
                isRecording
                  ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 animate-pulse"
                  : "bg-rose-500/12 hover:bg-rose-500/22 text-rose-300 border border-rose-500/25 shadow-sm"
              }
            `}
          >
            <Video className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden lg:inline">{isRecording ? "Recording..." : "Record"}</span>
          </button>
        )}

        {/* Save .tapboard Project */}
        {onExportTapboard && (
          <button
            onClick={onExportTapboard}
            title="Save Lecture Project File (.tapboard)"
            className="
              flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold
              text-zinc-300 bg-white/[0.04] hover:bg-white/[0.1] border border-white/5
              transition-all duration-150 active:scale-95
            "
          >
            <Save className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden xl:inline">Save</span>
          </button>
        )}

        {/* Open .tapboard Project */}
        {onImportTapboard && (
          <label
            title="Open Lecture Project File (.tapboard)"
            className="
              flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold
              text-zinc-300 bg-white/[0.04] hover:bg-white/[0.1] border border-white/5
              cursor-pointer transition-all duration-150 active:scale-95
            "
          >
            <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span className="hidden xl:inline">Open</span>
            <input
              type="file"
              accept=".tapboard,application/json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  onImportTapboard(e.target.files[0]);
                  e.target.value = "";
                }
              }}
            />
          </label>
        )}

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

        {/* Fit Slide to Screen (Proper Full View) */}
        {onFitToScreen && (
          <button
            onClick={onFitToScreen}
            title="Fit Slide to Full Screen (0 / Ctrl+0)"
            className="
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold
              text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30
              transition-all duration-150 active:scale-95
            "
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Fit Slide</span>
          </button>
        )}

        {/* Finite / Infinite Canvas Mode Toggle */}
        {onToggleFiniteMode && (
          <button
            onClick={onToggleFiniteMode}
            title={isFiniteMode ? "Switch to Infinite Canvas (free draw)" : "Switch to Finite Sheet Mode (bounded page)"}
            className={`
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold
              transition-all duration-150 active:scale-95
              ${
                isFiniteMode
                  ? "text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40"
                  : "text-zinc-300 bg-white/[0.05] hover:bg-white/[0.12] hover:text-white border border-white/5"
              }
            `}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{isFiniteMode ? "Sheet" : "Infinite"}</span>
          </button>
        )}

        {/* Fullscreen Presentation Mode Toggle */}
        {onToggleFullscreen && (
          <button
            onClick={onToggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen (F / Esc)" : "Enter Fullscreen Presentation Mode (F)"}
            className={`
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold
              transition-all duration-150 active:scale-95
              ${
                isFullscreen
                  ? "text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-400/40 shadow-md shadow-purple-500/20"
                  : "text-zinc-300 bg-white/[0.05] hover:bg-white/[0.12] hover:text-white border border-white/5"
              }
            `}
          >
            {isFullscreen ? (
              <Minimize className="w-3.5 h-3.5 text-purple-300" />
            ) : (
              <Maximize className="w-3.5 h-3.5 text-zinc-400" />
            )}
            <span className="hidden sm:inline">{isFullscreen ? "Exit Full" : "Fullscreen"}</span>
          </button>
        )}

        <div className="w-px h-5 bg-white/10 shrink-0 mx-0.5" />

        {/* Supabase Cloud Sync & Account Profile */}
        {currentUser ? (
          <div className="flex items-center gap-1.5">
            {onOpenCloudLibrary && (
              <button
                onClick={onOpenCloudLibrary}
                title="Open Cloud Lecture Library"
                className="
                  flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold
                  text-sky-300 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30
                  transition-all duration-150 active:scale-95 shadow-sm
                "
              >
                <Cloud className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Cloud Library</span>
              </button>
            )}
            <div className="flex items-center gap-1.5 pl-1.5 pr-1.5 py-1 rounded-xl bg-white/[0.04] border border-white/10 text-xs">
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
              </div>
              <span className="text-[11px] text-zinc-300 font-mono hidden md:inline max-w-[90px] truncate">
                {currentUser.email?.split("@")[0]}
              </span>
              {onSignOut && (
                <button
                  onClick={onSignOut}
                  title="Sign out of Supabase Cloud"
                  className="p-1 rounded-lg text-zinc-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        ) : (
          onOpenAuth && (
            <button
              onClick={onOpenAuth}
              title="Sign in or create account to sync lectures to Supabase Cloud"
              className="
                flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold
                text-emerald-300 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30
                transition-all duration-150 active:scale-95 shadow-sm
              "
            >
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Cloud Sync</span>
            </button>
          )
        )}

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
