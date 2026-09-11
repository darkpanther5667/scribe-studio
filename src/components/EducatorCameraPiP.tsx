import React, { useEffect, useRef, useState } from "react";
import {
  CameraOff,
  FlipHorizontal,
  Square,
  Circle as CircleIcon,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface EducatorCameraPiPProps {
  isOpen: boolean;
  onClose: () => void;
}

type CornerPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";
type ShapeMode = "circle" | "rect";
type SizePreset = "sm" | "md" | "lg";

export const EducatorCameraPiP: React.FC<EducatorCameraPiPProps> = ({
  isOpen,
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isMirrored, setIsMirrored] = useState(true);
  const [shape, setShape] = useState<ShapeMode>("circle");
  const [size, setSize] = useState<SizePreset>("md");
  const [corner, setCorner] = useState<CornerPosition>("bottom-right");
  const [isDragging, setIsDragging] = useState(false);
  const [customPos, setCustomPos] = useState<{ x: number; y: number } | null>(null);
  const dragStartRef = useRef<{ mouseX: number; mouseY: number; startX: number; startY: number }>({
    mouseX: 0,
    mouseY: 0,
    startX: 0,
    startY: 0,
  });

  // ── Camera Media Stream Lifecycle ──────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      return;
    }

    let isCancelled = false;

    async function initCamera() {
      try {
        setErrorMsg(null);
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: false,
        });

        if (isCancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        setStream(mediaStream);
        setHasPermission(true);

        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play().catch(() => {});
        }
      } catch (err: any) {
        if (!isCancelled) {
          console.error("Camera access error:", err);
          setHasPermission(false);
          setErrorMsg(err.name === "NotAllowedError" ? "Camera access denied by browser" : "Could not start camera");
        }
      }
    }

    initCamera();

    return () => {
      isCancelled = true;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
    };
  }, [isOpen]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  if (!isOpen) return null;

  // ── Dragging Handler ───────────────────────────────────────────────────────
  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    const target = e.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    setIsDragging(true);
    dragStartRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startX: rect.left,
      startY: rect.top,
    };
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    const dx = e.clientX - dragStartRef.current.mouseX;
    const dy = e.clientY - dragStartRef.current.mouseY;
    const newX = Math.max(16, Math.min(window.innerWidth - 180, dragStartRef.current.startX + dx));
    const newY = Math.max(16, Math.min(window.innerHeight - 180, dragStartRef.current.startY + dy));
    setCustomPos({ x: newX, y: newY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setIsDragging(false);

    // Magnetic snap to nearest corner
    const curX = customPos ? customPos.x : e.clientX;
    const curY = customPos ? customPos.y : e.clientY;
    const midX = window.innerWidth / 2;
    const midY = window.innerHeight / 2;

    if (curX > midX && curY > midY) setCorner("bottom-right");
    else if (curX <= midX && curY > midY) setCorner("bottom-left");
    else if (curX > midX && curY <= midY) setCorner("top-right");
    else setCorner("top-left");

    setCustomPos(null);
  };

  // Dimensions based on shape & size preset
  const getDimensions = () => {
    if (shape === "circle") {
      switch (size) {
        case "sm": return "w-32 h-32";
        case "lg": return "w-56 h-56";
        default:   return "w-44 h-44";
      }
    } else {
      switch (size) {
        case "sm": return "w-44 h-28";
        case "lg": return "w-72 h-44";
        default:   return "w-56 h-36";
      }
    }
  };

  // Corner style fallback when not dragging
  const getCornerPositionClass = () => {
    if (customPos) return "";
    switch (corner) {
      case "bottom-left":
        return "bottom-6 left-6";
      case "top-right":
        return "top-20 right-6";
      case "top-left":
        return "top-20 left-6";
      default:
        return "bottom-6 right-6";
    }
  };

  return (
    <div
      className={`
        fixed z-40 select-none group
        ${getCornerPositionClass()}
        ${isDragging ? "cursor-grabbing" : "cursor-grab"}
        transition-shadow duration-200
      `}
      style={
        customPos
          ? {
              left: `${customPos.x}px`,
              top: `${customPos.y}px`,
            }
          : undefined
      }
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* ── Outer Glowing Frame Container ── */}
      <div
        className={`
          relative overflow-hidden
          ${getDimensions()}
          ${shape === "circle" ? "rounded-full" : "rounded-2xl"}
          bg-zinc-950 border-2 border-sky-400/60
          shadow-[0_16px_40px_rgba(0,0,0,0.85)]
          ring-2 ring-white/10 ring-offset-2 ring-offset-black/50
        `}
      >
        {/* Live Video Feed */}
        {hasPermission ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`
              w-full h-full object-cover
              ${isMirrored ? "scale-x-[-1]" : ""}
            `}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-3 text-center bg-zinc-900 text-zinc-400">
            <CameraOff className="w-6 h-6 text-red-400 mb-1 animate-pulse" />
            <span className="text-[10px] font-mono leading-tight text-zinc-300">
              {errorMsg || "Camera Disabled"}
            </span>
          </div>
        )}

        {/* Live Indicator Dot */}
        <div className="absolute top-2.5 right-2.5 flex items-center gap-1 bg-black/60 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-white/10 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="text-[9px] font-mono font-bold text-white uppercase tracking-wider">LIVE</span>
        </div>

        {/* ── Hover Controls Overlay Bar ── */}
        <div
          className="
            absolute inset-x-0 bottom-0 p-1.5
            bg-gradient-to-t from-black/90 via-black/60 to-transparent
            opacity-0 group-hover:opacity-100 transition-opacity duration-150
            flex items-center justify-center gap-1.5 z-10
          "
          onPointerDown={(e) => e.stopPropagation()}
        >
          {/* Mirror Toggle */}
          <button
            onClick={() => setIsMirrored((m) => !m)}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
            title="Mirror Camera Flip"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Shape Toggle (Circle vs Rect) */}
          <button
            onClick={() => setShape((s) => (s === "circle" ? "rect" : "circle"))}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
            title="Toggle Shape (Circle / 16:9)"
          >
            {shape === "circle" ? <Square className="w-3.5 h-3.5" /> : <CircleIcon className="w-3.5 h-3.5" />}
          </button>

          {/* Size Preset Cycle */}
          <button
            onClick={() => setSize((s) => (s === "sm" ? "md" : s === "md" ? "lg" : "sm"))}
            className="p-1 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-all active:scale-95"
            title={`Size: ${size.toUpperCase()} (Click to toggle)`}
          >
            {size === "lg" ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>

          {/* Close Camera */}
          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-red-500/80 hover:bg-red-500 text-white transition-all active:scale-95 ml-1"
            title="Turn Off Camera"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
