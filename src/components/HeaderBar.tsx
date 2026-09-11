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
  Video,
  Save,
  FolderOpen,
  Cloud,
  User,
  LogOut,
  ChevronDown,
  Layers,
  Plus,
  Grid,
  AlignJustify,
  Columns,
  Box,
  Music,
  Square,
  Palette,
} from "lucide-react";
import type { GridStyle, BoardTheme } from "../types/whiteboard";

interface HeaderBarProps {
  onNewNotebook?: () => void;
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
  boardTheme?: BoardTheme;
  onThemeChange?: (theme: BoardTheme) => void;
}

type DropdownMenu = "file" | "export" | "profile" | "template" | null;

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onNewNotebook,
  title,
  onTitleChange,
  gridStyle,
  onGridChange,
  boardTheme = "dark",
  onThemeChange,
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
  const [openMenu, setOpenMenu] = useState<DropdownMenu>(null);

  const titleInputRef = useRef<HTMLInputElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const tapboardInputRef = useRef<HTMLInputElement>(null);

  // Close menus when clicking outside
  useEffect(() => {
    const handlePointerDownOutside = (e: PointerEvent) => {
      if (headerRef.current && !headerRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDownOutside);
    return () => document.removeEventListener("pointerdown", handlePointerDownOutside);
  }, []);

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

const TEMPLATE_OPTIONS: {
  value: GridStyle;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  { value: "dots", label: "Dot Grid", desc: "Fine subtle dots for freehand diagrams", icon: Grid3X3 },
  { value: "grid", label: "Math Graph", desc: "Cartesian minor & major grid rules", icon: Grid },
  { value: "ruled", label: "Ruled Notebook", desc: "Horizontal notebook lines with left margin", icon: AlignJustify },
  { value: "cornell", label: "Cornell Notes", desc: "Recall column, lecture notes, & summary", icon: Columns },
  { value: "isometric", label: "Isometric 3D", desc: "30°/90°/150° grid for 3D & physics", icon: Box },
  { value: "music", label: "Music Staff", desc: "5-line staves with barlines", icon: Music },
  { value: "none", label: "Blank Board", desc: "Pure unobstructed teaching canvas", icon: Square },
];

const THEME_OPTIONS: {
  value: BoardTheme;
  label: string;
  desc: string;
  dotColor: string;
}[] = [
  { value: "dark", label: "Dark Chalkboard", desc: "Classic obsidian with neon chalks", dotColor: "bg-zinc-800 border-zinc-600" },
  { value: "light", label: "White Studio", desc: "Clean paper with rich inks", dotColor: "bg-white border-zinc-300" },
  { value: "blueprint", label: "Blueprint Blue", desc: "Architectural navy with cyan rules", dotColor: "bg-sky-800 border-sky-400" },
];

  const getGridLabel = () => {
    switch (gridStyle) {
      case "dots":
        return "Dot Grid";
      case "grid":
        return "Math Graph";
      case "ruled":
        return "Ruled Paper";
      case "cornell":
        return "Cornell";
      case "isometric":
        return "Isometric 3D";
      case "music":
        return "Music Staff";
      case "none":
        return "Blank";
      default:
        return "Template";
    }
  };

  return (
    <header
      ref={headerRef}
      className="
        fixed top-3 inset-x-3 z-40
        flex items-center justify-between
        px-3.5 py-1.5
        rounded-2xl
        bg-zinc-950/90 backdrop-blur-2xl
        border border-white/[0.08]
        shadow-[0_8px_32px_rgba(0,0,0,0.7)]
        select-none
        transition-all duration-200
      "
      onPointerDown={(e) => e.stopPropagation()}
    >
      {/* ── Hidden File Inputs ── */}
      <input
        ref={pdfInputRef}
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
      <input
        ref={tapboardInputRef}
        type="file"
        accept=".tapboard,application/json"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            onImportTapboard?.(e.target.files[0]);
            e.target.value = "";
          }
        }}
      />

      {/* ── Left Group: Brand & Document Identity ── */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5 pr-3 border-r border-white/[0.08] shrink-0">
          <div className="relative w-8 h-8 shrink-0">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-sky-500 to-cyan-400 shadow-md shadow-cyan-500/25" />
            <svg viewBox="0 0 32 32" className="absolute inset-0 w-full h-full p-1.5" fill="none">
              <circle cx="13" cy="16" r="8" stroke="white" strokeWidth="1.5" opacity="0.25"/>
              <circle cx="13" cy="16" r="4.5" stroke="white" strokeWidth="1.5" opacity="0.5"/>
              <circle cx="13" cy="16" r="1.8" fill="white"/>
              <path d="M20 8 L23 11 L16 18 L13.5 18 L13.5 15.5 Z" fill="white" opacity="0.9"/>
              <path d="M23 8 L24.5 9.5 L22 11 L20 8 Z" fill="white" opacity="0.55"/>
            </svg>
          </div>
          <span className="text-[15px] font-bold tracking-tight text-white hidden sm:inline" style={{fontFamily:"'Inter', sans-serif"}}>
            Tapboard
          </span>
        </div>

        {/* Editable Lecture Title */}
        <div className="flex items-center gap-2 min-w-0 max-w-[160px] sm:max-w-xs md:max-w-sm">
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
                  outline-none ring-1 ring-cyan-500/30 w-40 sm:w-56 font-sans
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

          {/* Subtle Saved Pill */}
          {isAutoSaved && (
            <span
              title="All changes auto-saved to offline storage & cloud"
              className="hidden lg:flex items-center gap-1 text-[10px] font-mono text-emerald-400/80 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0"
            >
              <Check className="w-2.5 h-2.5" />
              <span>Saved</span>
            </span>
          )}
        </div>
      </div>

      {/* ── Center Group: Organized Menus & Canvas Controls ── */}
      <div className="flex items-center gap-1.5">
        {/* 1. FILE & PROJECT MENU */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === "file" ? null : "file")}
            className={`
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold
              transition-all duration-150 active:scale-95
              ${
                openMenu === "file"
                  ? "bg-white/15 text-white"
                  : "text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08]"
              }
            `}
          >
            <FolderOpen className="w-3.5 h-3.5 text-zinc-400" />
            <span>File</span>
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          </button>

          {openMenu === "file" && (
            <div
              className="
                absolute left-0 top-full mt-2 w-56 p-1.5 rounded-2xl
                bg-zinc-950/95 backdrop-blur-2xl border border-white/10
                shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 flex flex-col gap-0.5 text-xs
                animate-in fade-in zoom-in-95 duration-100
              "
            >
              {/* New Blank Notebook */}
              {onNewNotebook && (
                <button
                  onClick={() => {
                    setOpenMenu(null);
                    onNewNotebook();
                  }}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-emerald-300 hover:text-white hover:bg-emerald-500/15 transition-colors font-medium"
                >
                  <div className="flex items-center gap-2">
                    <Plus className="w-4 h-4 text-emerald-400" />
                    <span>New Notebook</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400 bg-white/5 px-1.5 py-0.5 rounded">Ctrl+N</span>
                </button>
              )}

              {/* Cloud Notebooks Library */}
              {onOpenCloudLibrary && currentUser && (
                <button
                  onClick={() => {
                    setOpenMenu(null);
                    onOpenCloudLibrary();
                  }}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-zinc-200 hover:text-white hover:bg-white/[0.08] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-sky-400" />
                    <span className="font-medium">My Notebooks</span>
                  </div>
                  <span className="text-[10px] text-sky-400/80 font-mono">Cloud</span>
                </button>
              )}

              <div className="my-1 border-t border-white/5" />

              {/* Import PDF */}
              <button
                onClick={() => {
                  setOpenMenu(null);
                  pdfInputRef.current?.click();
                }}
                className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-zinc-200 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <FileUp className="w-4 h-4 text-cyan-400" />
                  <span className="font-medium">Import PDF Slides</span>
                </div>
                <span className="text-[10px] text-zinc-500">Document</span>
              </button>

              <div className="my-1 border-t border-white/5" />

              {/* Save .tapboard File */}
              {onExportTapboard && (
                <button
                  onClick={() => {
                    setOpenMenu(null);
                    onExportTapboard();
                  }}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-zinc-200 hover:text-white hover:bg-white/[0.08] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Save className="w-4 h-4 text-emerald-400" />
                    <span className="font-medium">Save Project File</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">.tapboard</span>
                </button>
              )}

              {/* Open .tapboard File */}
              {onImportTapboard && (
                <button
                  onClick={() => {
                    setOpenMenu(null);
                    tapboardInputRef.current?.click();
                  }}
                  className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-zinc-200 hover:text-white hover:bg-white/[0.08] transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FolderOpen className="w-4 h-4 text-amber-400" />
                    <span className="font-medium">Open Project File</span>
                  </div>
                  <span className="text-[10px] font-mono text-zinc-500">.tapboard</span>
                </button>
              )}

              <div className="my-1 border-t border-white/5" />

              {/* Clear Canvas */}
              <button
                onClick={() => {
                  if (confirmClear) {
                    onClear();
                    setConfirmClear(false);
                    setOpenMenu(null);
                  } else {
                    setConfirmClear(true);
                  }
                }}
                className={`
                  flex items-center justify-between w-full px-2.5 py-2 rounded-xl transition-colors
                  ${
                    confirmClear
                      ? "bg-rose-500 text-white font-bold"
                      : "text-rose-400 hover:bg-rose-500/15"
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <Trash2 className="w-4 h-4" />
                  <span>{confirmClear ? "Click again to confirm" : "Clear Blackboard"}</span>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* 1.5. NOTEBOOKS DASHBOARD QUICK ACCESS */}
        {currentUser && onOpenCloudLibrary && (
          <button
            onClick={onOpenCloudLibrary}
            title="Open Educator Notebooks Dashboard"
            className="
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold
              text-sky-300 hover:text-white bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20
              transition-all duration-150 active:scale-95
            "
          >
            <BookOpen className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Notebooks</span>
          </button>
        )}

        {/* 2. EXPORT MENU */}
        <div className="relative">
          <button
            onClick={() => setOpenMenu(openMenu === "export" ? null : "export")}
            className={`
              flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold
              transition-all duration-150 active:scale-95
              ${
                openMenu === "export"
                  ? "bg-white/15 text-white"
                  : "text-zinc-300 hover:text-white bg-white/[0.04] hover:bg-white/[0.08]"
              }
            `}
          >
            <Download className="w-3.5 h-3.5 text-zinc-400" />
            <span>Export</span>
            <ChevronDown className="w-3 h-3 text-zinc-500" />
          </button>

          {openMenu === "export" && (
            <div
              className="
                absolute left-0 top-full mt-2 w-60 p-1.5 rounded-2xl
                bg-zinc-950/95 backdrop-blur-2xl border border-white/10
                shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 flex flex-col gap-0.5 text-xs
                animate-in fade-in zoom-in-95 duration-100
              "
            >
              {/* PNG Slide Export */}
              <button
                onClick={() => {
                  setOpenMenu(null);
                  onExport();
                }}
                className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-zinc-200 hover:text-white hover:bg-white/[0.08] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-400" />
                  <div className="flex flex-col text-left">
                    <span className="font-medium">Export Current Slide</span>
                    <span className="text-[10px] text-zinc-500">High-resolution PNG image</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">PNG</span>
              </button>

              {/* Multi-Page Class Notes PDF Export */}
              <button
                onClick={() => {
                  setOpenMenu(null);
                  onExportNotesPdf();
                }}
                disabled={isExportingNotes}
                className="flex items-center justify-between w-full px-2.5 py-2 rounded-xl text-zinc-200 hover:text-white hover:bg-white/[0.08] transition-colors disabled:opacity-50"
              >
                <div className="flex items-center gap-2">
                  {isExportingNotes ? (
                    <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                  ) : (
                    <BookOpen className="w-4 h-4 text-amber-400" />
                  )}
                  <div className="flex flex-col text-left">
                    <span className="font-medium">Export Class Notes</span>
                    <span className="text-[10px] text-zinc-500">Multi-page PDF of all slides</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono text-zinc-500">PDF</span>
              </button>
            </div>
          )}
        </div>

        {/* ── Segmented Control: Canvas Display & View Modes ── */}
        <div className="flex items-center p-0.5 rounded-xl bg-white/[0.03] border border-white/5">
          {/* Template & Board Theme Dropdown */}
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === "template" ? null : "template")}
              title="Change Template Paper Style & Board Theme"
              className={`
                flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors
                ${
                  openMenu === "template"
                    ? "text-white bg-white/15 shadow-sm"
                    : "text-zinc-300 hover:text-white hover:bg-white/[0.06]"
                }
              `}
            >
              <Palette className="w-3.5 h-3.5 text-sky-400" />
              <span className="text-[11px] font-mono hidden md:inline">{getGridLabel()}</span>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {openMenu === "template" && (
              <div
                className="
                  absolute left-0 top-full mt-2 w-72 p-2.5 rounded-2xl
                  bg-zinc-950/95 backdrop-blur-2xl border border-white/10
                  shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 flex flex-col gap-3 text-xs
                  animate-in fade-in zoom-in-95 duration-100
                "
              >
                {/* 1. Paper Templates */}
                <div>
                  <div className="flex items-center justify-between mb-1.5 px-1">
                    <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                      Paper Templates
                    </span>
                    <span className="text-[9px] font-mono text-zinc-500">Hotkey: G</span>
                  </div>
                  <div className="grid grid-cols-1 gap-1">
                    {TEMPLATE_OPTIONS.map((item) => {
                      const Icon = item.icon;
                      const isSelected = gridStyle === item.value;
                      return (
                        <button
                          key={item.value}
                          onClick={() => {
                            onGridChange(item.value);
                            setOpenMenu(null);
                          }}
                          className={`
                            flex items-center justify-between px-2.5 py-1.5 rounded-xl text-left transition-all
                            ${
                              isSelected
                                ? "bg-sky-500/20 text-white border border-sky-500/30"
                                : "text-zinc-300 hover:text-white hover:bg-white/[0.06] border border-transparent"
                            }
                          `}
                        >
                          <div className="flex items-center gap-2">
                            <Icon className={`w-3.5 h-3.5 ${isSelected ? "text-sky-400" : "text-zinc-400"}`} />
                            <div>
                              <div className="font-semibold text-xs leading-none">{item.label}</div>
                              <div className="text-[10px] text-zinc-500 leading-tight mt-0.5">{item.desc}</div>
                            </div>
                          </div>
                          {isSelected && <Check className="w-3.5 h-3.5 text-sky-400 shrink-0" />}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Board Themes */}
                {onThemeChange && (
                  <div className="pt-2 border-t border-white/10">
                    <div className="mb-1.5 px-1">
                      <span className="text-[10px] font-bold tracking-wider text-zinc-400 uppercase">
                        Board Themes
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {THEME_OPTIONS.map((item) => {
                        const isSelected = (boardTheme || "dark") === item.value;
                        return (
                          <button
                            key={item.value}
                            onClick={() => {
                              onThemeChange(item.value);
                              setOpenMenu(null);
                            }}
                            className={`
                              flex flex-col items-center gap-1.5 p-2 rounded-xl text-center transition-all
                              ${
                                isSelected
                                  ? "bg-white/15 border border-sky-400/50 text-white shadow-sm"
                                  : "bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 text-zinc-400 hover:text-zinc-200"
                              }
                            `}
                          >
                            <span className={`w-4 h-4 rounded-full border shadow-sm ${item.dotColor}`} />
                            <span className="text-[10px] font-semibold leading-tight">{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Finite Sheet vs Infinite Toggle */}
          {onToggleFiniteMode && (
            <button
              onClick={onToggleFiniteMode}
              title={isFiniteMode ? "Switch to Infinite Canvas" : "Switch to 16:9 Presentation Sheet"}
              className={`
                flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors
                ${
                  isFiniteMode
                    ? "text-sky-300 bg-sky-500/15"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                }
              `}
            >
              <Layers className="w-3.5 h-3.5" />
              <span className="text-[11px] font-mono hidden md:inline">
                {isFiniteMode ? "16:9 Sheet" : "Infinite"}
              </span>
            </button>
          )}

          {/* Fit to Screen */}
          {onFitToScreen && (
            <button
              onClick={onFitToScreen}
              title="Fit Slide to Screen (0)"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <Maximize2 className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Fullscreen Mode */}
          {onToggleFullscreen && (
            <button
              onClick={onToggleFullscreen}
              title={isFullscreen ? "Exit Fullscreen (F / Esc)" : "Enter Fullscreen (F)"}
              className={`
                p-1.5 rounded-lg transition-colors
                ${
                  isFullscreen
                    ? "text-purple-300 bg-purple-500/20"
                    : "text-zinc-400 hover:text-white hover:bg-white/[0.06]"
                }
              `}
            >
              {isFullscreen ? <Minimize className="w-3.5 h-3.5" /> : <Maximize className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* ── Right Group: Recording, Telemetry & Educator Profile ── */}
      <div className="flex items-center gap-2">
        {/* Record Lecture Quick-Action Button */}
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
                  ? "bg-rose-500/25 text-rose-300 border border-rose-500/40 animate-pulse shadow-md shadow-rose-500/20"
                  : "bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/25 shadow-sm"
              }
            `}
          >
            <Video className="w-3.5 h-3.5 text-rose-400" />
            <span className="hidden sm:inline">{isRecording ? "Recording..." : "Record"}</span>
          </button>
        )}

        {/* Stylus / Tablet Telemetry Badge */}
        <div
          title={
            isPenActive || currentPressure > 0
              ? `Active Stylus: ${Math.round(currentPressure * 8192)} / 8192 pressure levels`
              : "Tablet & Stylus ready"
          }
          className="hidden xl:flex items-center gap-1.5 px-2 py-1 rounded-full bg-white/[0.04] border border-white/5 text-[11px] font-mono text-zinc-400"
        >
          {isPenActive || currentPressure > 0 ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <PenTool className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300 text-[10px]">Stylus</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" />
              <MousePointer2 className="w-3 h-3 text-zinc-400" />
            </>
          )}
        </div>

        {/* Supabase Cloud Account / Sync */}
        {currentUser ? (
          <div className="relative">
            <button
              onClick={() => setOpenMenu(openMenu === "profile" ? null : "profile")}
              className="
                flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-xl
                bg-white/[0.05] hover:bg-white/[0.1] border border-white/10
                text-xs transition-colors active:scale-95
              "
            >
              <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-[10px]">
                {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : <User className="w-3 h-3" />}
              </div>
              <span className="text-[11px] text-zinc-200 font-mono hidden md:inline max-w-[80px] truncate">
                {currentUser.email?.split("@")[0]}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-400" />
            </button>

            {openMenu === "profile" && (
              <div
                className="
                  absolute right-0 top-full mt-2 w-52 p-1.5 rounded-2xl
                  bg-zinc-950/95 backdrop-blur-2xl border border-white/10
                  shadow-[0_20px_50px_rgba(0,0,0,0.85)] z-50 flex flex-col gap-0.5 text-xs
                  animate-in fade-in zoom-in-95 duration-100
                "
              >
                <div className="px-3 py-1.5 border-b border-white/5 mb-1">
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Educator Profile</span>
                  <span className="text-xs text-zinc-200 font-medium truncate block">{currentUser.email}</span>
                </div>

                {onOpenCloudLibrary && (
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      onOpenCloudLibrary();
                    }}
                    className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-zinc-200 hover:text-white hover:bg-white/[0.08] transition-colors"
                  >
                    <BookOpen className="w-4 h-4 text-sky-400" />
                    <span>My Notebooks</span>
                  </button>
                )}

                {onSignOut && (
                  <button
                    onClick={() => {
                      setOpenMenu(null);
                      onSignOut();
                    }}
                    className="flex items-center gap-2 w-full px-2.5 py-2 rounded-xl text-rose-400 hover:bg-rose-500/10 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          onOpenAuth && (
            <button
              onClick={onOpenAuth}
              title="Sign in or create account to sync lectures to Supabase Cloud"
              className="
                flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold
                text-emerald-950 bg-gradient-to-r from-emerald-400 to-teal-400
                hover:opacity-90 shadow-md shadow-emerald-500/20
                transition-all duration-150 active:scale-95 shrink-0
              "
            >
              <Cloud className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign In</span>
            </button>
          )
        )}

        <div className="w-px h-4 bg-white/10 shrink-0 mx-0.5" />

        {/* Shortcuts Help Modal Trigger */}
        <button
          onClick={onOpenShortcuts}
          title="Keyboard Shortcuts & Gestures (?)"
          className="
            flex items-center justify-center w-7 h-7 rounded-xl
            text-zinc-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.1]
            border border-white/5 transition-all active:scale-95
          "
        >
          <HelpCircle className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
