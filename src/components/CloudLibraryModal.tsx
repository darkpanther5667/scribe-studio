import React, { useEffect, useState } from "react";
import {
  X,
  Cloud,
  Trash2,
  FolderOpen,
  Plus,
  Loader2,
  Calendar,
  Layers,
  AlertCircle,
} from "lucide-react";
import {
  fetchUserDrawings,
  deleteUserDrawing,
  type CloudDrawingRecord,
} from "../lib/supabase";

interface CloudLibraryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadDrawing: (drawing: CloudDrawingRecord) => void;
  onSaveCurrentToCloud: () => Promise<void>;
  isSavingCurrent: boolean;
}

export const CloudLibraryModal: React.FC<CloudLibraryModalProps> = ({
  isOpen,
  onClose,
  onLoadDrawing,
  onSaveCurrentToCloud,
  isSavingCurrent,
}) => {
  const [drawings, setDrawings] = useState<CloudDrawingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDrawings = async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await fetchUserDrawings();
      setDrawings(list);
    } catch (err: any) {
      setError(err?.message || "Failed to load drawings from Supabase.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadDrawings();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this lecture from your cloud library?")) return;
    try {
      await deleteUserDrawing(id);
      setDrawings((prev) => prev.filter((d) => d.id !== id));
    } catch (err: any) {
      alert("Failed to delete: " + (err?.message || "Unknown error"));
    }
  };

  const formatDate = (iso: string) => {
    try {
      return new Date(iso).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md animate-in fade-in duration-150 p-4"
      onClick={onClose}
    >
      <div
        className="
          relative w-full max-w-2xl rounded-3xl bg-zinc-950/95
          border border-white/15 shadow-[0_25px_60px_rgba(0,0,0,0.9)]
          p-6 flex flex-col gap-4 text-white max-h-[85vh]
        "
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-sky-500 to-cyan-400 flex items-center justify-center shadow-md shadow-sky-500/25">
              <Cloud className="w-4 h-4 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold tracking-tight">Cloud Lecture Library</h3>
              <p className="text-xs text-zinc-400">Your cloud-saved Tapboard decks and class notes</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={async () => {
                await onSaveCurrentToCloud();
                await loadDrawings();
              }}
              disabled={isSavingCurrent}
              className="
                flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold
                bg-gradient-to-r from-sky-400 to-cyan-400 text-zinc-950
                hover:opacity-90 shadow-md shadow-cyan-500/20 transition-all active:scale-95
                disabled:opacity-50
              "
            >
              {isSavingCurrent ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
              <span>Save Current to Cloud</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Error alert */}
        {error && (
          <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Drawings Grid */}
        <div className="flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-zinc-400 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-sky-400" />
              <span className="text-xs">Loading lectures from Supabase...</span>
            </div>
          ) : drawings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center gap-2 border border-dashed border-white/10 rounded-2xl p-6">
              <Cloud className="w-10 h-10 text-zinc-600 mb-1" />
              <span className="text-sm font-semibold text-zinc-300">No Cloud Lectures Yet</span>
              <p className="text-xs text-zinc-500 max-w-sm">
                Click "Save Current to Cloud" above to back up your current drawings and lecture deck to Supabase.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {drawings.map((doc) => {
                const slideCount = doc.slides?.length || 1;
                return (
                  <div
                    key={doc.id}
                    onClick={() => {
                      onLoadDrawing(doc);
                      onClose();
                    }}
                    className="
                      group relative flex flex-col justify-between p-3.5 rounded-2xl
                      bg-white/[0.03] hover:bg-sky-500/10 border border-white/10 hover:border-sky-400/40
                      cursor-pointer transition-all duration-150 shadow-md hover:shadow-sky-500/10
                    "
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-col min-w-0">
                        <span className="text-sm font-bold text-white truncate group-hover:text-sky-300 transition-colors">
                          {doc.title}
                        </span>
                        <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-1 font-mono">
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3 text-cyan-400" />
                            {slideCount} slide{slideCount > 1 ? "s" : ""}
                          </span>
                          <span>•</span>
                          <span className="capitalize">{doc.grid_style}</span>
                        </div>
                      </div>

                      <button
                        onClick={(e) => handleDelete(doc.id, e)}
                        title="Delete Lecture"
                        className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-2 border-t border-white/5 text-[10px] text-zinc-500">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(doc.updated_at)}
                      </span>
                      <span className="flex items-center gap-1 font-semibold text-sky-400 group-hover:translate-x-0.5 transition-transform">
                        <FolderOpen className="w-3 h-3" /> Open
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
