import React, { useEffect, useState } from "react";
import {
  X,
  BookOpen,
  Trash2,
  FolderOpen,
  Plus,
  Loader2,
  Calendar,
  Layers,
  AlertCircle,
  Search,
  Copy,
  Edit2,
  Check,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import {
  fetchUserDrawings,
  deleteUserDrawing,
  renameUserDrawing,
  duplicateUserDrawing,
  type CloudDrawingRecord,
} from "../lib/supabase";

interface CloudLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadDrawing: (drawing: CloudDrawingRecord) => void;
  onSaveCurrentToCloud: () => Promise<void>;
  onNewNotebook: () => void;
  isSavingCurrent: boolean;
  activeDrawingId?: string | null;
}

export const CloudLibraryModal: React.FC<CloudLibraryModalProps> = ({
  isOpen,
  onClose,
  onLoadDrawing,
  onSaveCurrentToCloud,
  onNewNotebook,
  isSavingCurrent,
  activeDrawingId,
}) => {
  const [drawings, setDrawings] = useState<CloudDrawingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const loadDrawings = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchUserDrawings();
      setDrawings(list);
    } catch (err: any) {
      setError(err?.message || "Failed to load notebooks from Supabase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDrawings();
      setSearchQuery("");
      setEditingId(null);
    }
  }, [isOpen]);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 2500);
  };

  if (!isOpen) return null;

  const handleDelete = async (id: string, title: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Are you sure you want to delete "${title}"? This cannot be undone.`)) return;
    try {
      await deleteUserDrawing(id);
      setDrawings((prev) => prev.filter((d) => d.id !== id));
      showToast("Notebook deleted.");
    } catch (err: any) {
      alert("Failed to delete: " + (err?.message || "Unknown error"));
    }
  };

  const handleDuplicate = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const copy = await duplicateUserDrawing(id);
      setDrawings((prev) => [copy, ...prev]);
      showToast("Notebook duplicated!");
    } catch (err: any) {
      alert("Failed to duplicate: " + (err?.message || "Unknown error"));
    }
  };

  const handleStartRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(id);
    setEditingTitle(currentTitle);
  };

  const handleSaveRename = async (id: string, e: React.MouseEvent | React.FormEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!editingTitle.trim()) return;
    try {
      await renameUserDrawing(id, editingTitle.trim());
      setDrawings((prev) =>
        prev.map((d) => (d.id === id ? { ...d, title: editingTitle.trim() } : d))
      );
      setEditingId(null);
      showToast("Notebook renamed!");
    } catch (err: any) {
      alert("Failed to rename: " + (err?.message || "Unknown error"));
    }
  };

  const formatDate = (iso: string) => {
    try {
      const date = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.round(diffMs / (1000 * 60));
      const diffHours = Math.round(diffMs / (1000 * 60 * 60));
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 2) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const filteredDrawings = drawings.filter((d) =>
    d.title.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-in fade-in duration-150 p-4"
      onClick={onClose}
    >
      <div
        className="
          relative w-full max-w-3xl rounded-3xl bg-zinc-950/95
          border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)]
          p-6 flex flex-col gap-4 text-white max-h-[85vh]
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center shadow-md shadow-sky-500/25">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold tracking-tight">Educator Notebooks</h3>
                {!loading && (
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/[0.06] text-zinc-400 border border-white/5">
                    {drawings.length} {drawings.length === 1 ? "notebook" : "notebooks"}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">Manage, create, and open your cloud whiteboard decks</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* New Notebook Button */}
            <button
              onClick={() => {
                onNewNotebook();
                onClose();
              }}
              title="Start a fresh blank notebook"
              className="
                flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold
                bg-gradient-to-r from-emerald-400 to-teal-400 text-zinc-950
                hover:opacity-90 shadow-md shadow-emerald-500/20 transition-all active:scale-95
              "
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Notebook</span>
            </button>

            {/* Save Current as Cloud Copy */}
            <button
              onClick={async () => {
                await onSaveCurrentToCloud();
                await loadDrawings();
                showToast("Current notebook saved to Cloud!");
              }}
              disabled={isSavingCurrent}
              title="Save or update current whiteboard in cloud"
              className="
                flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold
                bg-white/[0.05] hover:bg-white/[0.1] text-zinc-200 border border-white/10
                transition-all active:scale-95 disabled:opacity-50
              "
            >
              {isSavingCurrent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-sky-400" />}
              <span>Save Current</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors ml-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative flex items-center">
          <Search className="w-4 h-4 absolute left-3 text-zinc-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notebooks by title..."
            className="
              w-full pl-9 pr-8 py-2 rounded-xl bg-zinc-900/90 border border-white/10
              text-xs text-white placeholder:text-zinc-500 outline-none
              focus:border-sky-400 focus:ring-1 focus:ring-sky-400/30 transition-all
            "
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 text-zinc-500 hover:text-white p-0.5"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Notifications */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successToast && (
          <div className="flex items-center gap-2 p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs animate-in fade-in duration-100">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Notebooks Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 text-zinc-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
              <span className="text-xs">Loading your cloud notebooks...</span>
            </div>
          ) : drawings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-3 border border-dashed border-white/10 rounded-3xl p-8">
              <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-zinc-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-zinc-200">No notebooks saved yet</h4>
                <p className="text-xs text-zinc-500 max-w-sm mt-1">
                  Save your current whiteboard deck to Supabase, or start a new notebook to organize your lectures.
                </p>
              </div>
              <button
                onClick={async () => {
                  await onSaveCurrentToCloud();
                  await loadDrawings();
                }}
                disabled={isSavingCurrent}
                className="
                  flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold
                  bg-gradient-to-r from-sky-400 to-cyan-400 text-zinc-950
                  hover:opacity-90 transition-all active:scale-95 mt-1
                "
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Save Current Notebook</span>
              </button>
            </div>
          ) : filteredDrawings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center text-zinc-500 gap-2">
              <Search className="w-6 h-6 text-zinc-600" />
              <span className="text-xs">No notebooks matching "{searchQuery}"</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredDrawings.map((doc) => {
                const isCurrent = activeDrawingId === doc.id;
                const slideCount = doc.slides?.length || 1;
                const isEditingThis = editingId === doc.id;

                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      if (!isEditingThis) {
                        onLoadDrawing(doc);
                        onClose();
                      }
                    }}
                    className={`
                      group relative flex flex-col justify-between p-4 rounded-2xl
                      cursor-pointer transition-all duration-150 border
                      ${
                        isCurrent
                          ? "bg-sky-500/[0.08] border-sky-500/40 shadow-lg shadow-sky-500/10"
                          : "bg-white/[0.03] hover:bg-white/[0.06] border-white/10 hover:border-white/20"
                      }
                    `}
                  >
                    {/* Top Row: Title + Inline Rename */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col min-w-0 flex-1">
                        {isEditingThis ? (
                          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingTitle}
                              autoFocus
                              onChange={(e) => setEditingTitle(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveRename(doc.id, e);
                                if (e.key === "Escape") setEditingId(null);
                              }}
                              className="px-2 py-0.5 rounded-lg bg-zinc-900 border border-sky-400 text-xs text-white outline-none w-full"
                            />
                            <button
                              onClick={(e) => handleSaveRename(doc.id, e)}
                              className="p-1 rounded-lg bg-sky-500 text-white hover:opacity-90"
                              title="Save"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(null);
                              }}
                              className="p-1 rounded-lg text-zinc-400 hover:text-white"
                              title="Cancel"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-white truncate group-hover:text-sky-300 transition-colors">
                              {doc.title}
                            </span>
                            <button
                              onClick={(e) => handleStartRename(doc.id, doc.title, e)}
                              title="Rename notebook"
                              className="p-1 rounded-md text-zinc-500 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}

                        {/* Badges */}
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1 font-mono">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3 text-cyan-400" />
                            {slideCount} {slideCount === 1 ? "slide" : "slides"}
                          </span>
                          <span>•</span>
                          <span className="capitalize">{doc.grid_style}</span>
                          {isCurrent && (
                            <>
                              <span>•</span>
                              <span className="text-sky-300 font-bold">Active</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Card Actions: Duplicate & Delete */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                          onClick={(e) => handleDuplicate(doc.id, e)}
                          title="Duplicate Notebook"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => handleDelete(doc.id, doc.title, e)}
                          title="Delete Notebook"
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Bottom Row: Timestamp + Open CTA */}
                    <div className="flex items-center justify-between mt-4 pt-2.5 border-t border-white/5 text-[11px] text-zinc-500">
                      <span className="flex items-center gap-1 font-mono">
                        <Calendar className="w-3 h-3 text-zinc-600" />
                        {formatDate(doc.updated_at)}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-sky-400 group-hover:translate-x-0.5 transition-transform">
                        <FolderOpen className="w-3.5 h-3.5" />
                        <span>Open</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
