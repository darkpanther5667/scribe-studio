/**
 * In-browser lecture video + educator microphone audio recorder.
 * Composites the whiteboard canvas and live educator facecam PiP into
 * high-definition MP4 (H.264 / AAC) with zero layout thrashing,
 * strict 30 FPS timing, and optimized hardware encoding.
 */

export interface FacecamOverlayState {
  videoElement: HTMLVideoElement | null;
  shape: "circle" | "rect";
  isMirrored: boolean;
  getScreenBounds: () => { left: number; top: number; width: number; height: number } | null;
}

export type RecorderQuality = "1080p" | "720p";

export interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  seconds: number;
  format?: string;
  quality?: RecorderQuality;
}

class LectureRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private timerInterval: any = null;
  private elapsedSeconds = 0;
  private lectureTitle = "Lecture";
  private selectedMime = "";
  private formatLabel = "MP4 1080p";
  private qualityPreset: RecorderQuality = "1080p";

  // Compositor canvas & animation frame loop
  private animFrameId: number | null = null;
  private isCompositorRunning = false;
  private facecamProvider: (() => FacecamOverlayState | null) | null = null;
  private windowResizeCleanup: (() => void) | null = null;

  private onStateChangeCallback: ((state: RecorderState) => void) | null = null;

  constructor() {
    const saved = localStorage.getItem("scribe_recorder_quality");
    if (saved === "720p" || saved === "1080p") {
      this.qualityPreset = saved;
    }
  }

  public subscribe(callback: (state: RecorderState) => void) {
    this.onStateChangeCallback = callback;
    this.emitState();
  }

  public getQuality(): RecorderQuality {
    return this.qualityPreset;
  }

  public setQuality(quality: RecorderQuality) {
    this.qualityPreset = quality;
    localStorage.setItem("scribe_recorder_quality", quality);
    const isMp4 = this.selectedMime ? this.selectedMime.includes("mp4") : true;
    this.formatLabel = `${isMp4 ? "MP4" : "WebM"} ${quality === "720p" ? "720p" : "1080p"}`;
    this.emitState();
  }

  private emitState() {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback({
        isRecording: Boolean(this.mediaRecorder && this.mediaRecorder.state !== "inactive"),
        isPaused: Boolean(this.mediaRecorder && this.mediaRecorder.state === "paused"),
        seconds: this.elapsedSeconds,
        format: this.formatLabel,
        quality: this.qualityPreset,
      });
    }
  }

  public async startRecording(
    canvas: HTMLCanvasElement,
    title: string,
    facecamProvider?: () => FacecamOverlayState | null
  ): Promise<boolean> {
    try {
      this.lectureTitle = title || "Lecture";
      this.recordedChunks = [];
      this.elapsedSeconds = 0;
      this.facecamProvider = facecamProvider || null;

      // 1. Determine target resolution
      // 1080p: max width 1920
      // 720p: max width 1280 (butter-smooth on any CPU/GPU)
      const maxDim = this.qualityPreset === "720p" ? 1280 : 1920;
      const srcW = canvas.width || 1920;
      const srcH = canvas.height || 1080;
      let targetWidth = srcW;
      let targetHeight = srcH;

      if (targetWidth > maxDim || targetHeight > maxDim) {
        const scale = Math.min(maxDim / targetWidth, maxDim / targetHeight);
        targetWidth = Math.round(targetWidth * scale);
        targetHeight = Math.round(targetHeight * scale);
      }
      // H.264 / AVC encoders strictly require even dimensions
      targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth - 1;
      targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight - 1;

      // 2. Create offscreen compositor canvas with desynchronized low-latency GPU pipeline
      const compCanvas = document.createElement("canvas");
      compCanvas.width = targetWidth;
      compCanvas.height = targetHeight;

      const compCtx = compCanvas.getContext("2d", {
        alpha: false,
        desynchronized: true,
      });
      if (!compCtx) {
        throw new Error("Could not initialize 2D context for lecture compositor.");
      }
      compCtx.imageSmoothingEnabled = true;
      compCtx.imageSmoothingQuality = "low"; // Fast bilinear blitting

      // 3. Cache canvas viewport bounds to completely eliminate layout thrashing
      let cachedCanvasBounds = {
        left: 0,
        top: 0,
        width: canvas.offsetWidth || window.innerWidth,
        height: canvas.offsetHeight || window.innerHeight,
      };
      const handleResize = () => {
        cachedCanvasBounds = {
          left: 0,
          top: 0,
          width: canvas.offsetWidth || window.innerWidth,
          height: canvas.offsetHeight || window.innerHeight,
        };
      };
      window.addEventListener("resize", handleResize);
      this.windowResizeCleanup = () => window.removeEventListener("resize", handleResize);

      // 4. Render synchronous initial frame so stream has immediate content at t=0
      compCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);

      // 5. Strict 30 FPS compositor loop with delta-time throttling
      const TARGET_FPS = 30;
      const FRAME_INTERVAL = 1000 / TARGET_FPS; // 33.33ms
      let lastFrameTimestamp = 0;

      this.isCompositorRunning = true;
      const renderCompositorFrame = (timestamp: number) => {
        if (!this.isCompositorRunning) return;

        this.animFrameId = requestAnimationFrame(renderCompositorFrame);

        const elapsed = timestamp - lastFrameTimestamp;
        if (elapsed < FRAME_INTERVAL - 1.5) {
          return; // Drop excessive frames on 60/120/144Hz monitors
        }
        lastFrameTimestamp = timestamp - (elapsed % FRAME_INTERVAL);

        // A. Draw whiteboard canvas
        try {
          compCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
        } catch {
          // ignore transient canvas blit errors
        }

        // B. Draw educator facecam overlay if active
        try {
          const facecam = this.facecamProvider ? this.facecamProvider() : null;
          if (
            facecam &&
            facecam.videoElement &&
            !facecam.videoElement.paused &&
            !facecam.videoElement.ended &&
            facecam.videoElement.readyState >= 2
          ) {
            const pipBounds = facecam.getScreenBounds();
            if (pipBounds && cachedCanvasBounds.width > 0 && cachedCanvasBounds.height > 0) {
              const scaleX = targetWidth / cachedCanvasBounds.width;
              const scaleY = targetHeight / cachedCanvasBounds.height;

              const destX = (pipBounds.left - cachedCanvasBounds.left) * scaleX;
              const destY = (pipBounds.top - cachedCanvasBounds.top) * scaleY;
              const destW = pipBounds.width * scaleX;
              const destH = pipBounds.height * scaleY;

              if (destW > 10 && destH > 10) {
                // Clip region (circle or rounded rect)
                compCtx.save();
                compCtx.beginPath();
                if (facecam.shape === "circle") {
                  const radius = Math.min(destW, destH) / 2;
                  const centerX = destX + destW / 2;
                  const centerY = destY + destH / 2;
                  compCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                } else {
                  const cornerRadius = Math.min(16 * scaleX, destW / 4, destH / 4);
                  if (typeof compCtx.roundRect === "function") {
                    compCtx.roundRect(destX, destY, destW, destH, cornerRadius);
                  } else {
                    compCtx.rect(destX, destY, destW, destH);
                  }
                }
                compCtx.closePath();
                compCtx.clip();

                // Object-cover aspect crop calculation
                const vW = facecam.videoElement.videoWidth;
                const vH = facecam.videoElement.videoHeight;
                if (vW > 0 && vH > 0) {
                  const vAspect = vW / vH;
                  const dAspect = destW / destH;
                  let sX = 0;
                  let sY = 0;
                  let sW = vW;
                  let sH = vH;

                  if (vAspect > dAspect) {
                    sW = vH * dAspect;
                    sX = (vW - sW) / 2;
                  } else {
                    sH = vW / dAspect;
                    sY = (vH - sH) / 2;
                  }

                  if (facecam.isMirrored) {
                    compCtx.save();
                    compCtx.translate(destX + destW, destY);
                    compCtx.scale(-1, 1);
                    compCtx.drawImage(facecam.videoElement, sX, sY, sW, sH, 0, 0, destW, destH);
                    compCtx.restore();
                  } else {
                    compCtx.drawImage(facecam.videoElement, sX, sY, sW, sH, destX, destY, destW, destH);
                  }
                }
                compCtx.restore();

                // Crisp border without expensive Gaussian shadowBlur
                compCtx.save();
                compCtx.beginPath();
                if (facecam.shape === "circle") {
                  const radius = Math.min(destW, destH) / 2;
                  const centerX = destX + destW / 2;
                  const centerY = destY + destH / 2;
                  compCtx.arc(centerX, centerY, radius, 0, Math.PI * 2);
                } else {
                  const cornerRadius = Math.min(16 * scaleX, destW / 4, destH / 4);
                  if (typeof compCtx.roundRect === "function") {
                    compCtx.roundRect(destX, destY, destW, destH, cornerRadius);
                  } else {
                    compCtx.rect(destX, destY, destW, destH);
                  }
                }
                compCtx.strokeStyle = "#38bdf8"; // sky-400
                compCtx.lineWidth = Math.max(2, 2.5 * scaleX);
                compCtx.stroke();
                compCtx.restore();
              }
            }
          }
        } catch {
          // ignore facecam rendering errors to keep recording intact
        }
      };

      this.animFrameId = requestAnimationFrame(renderCompositorFrame);

      // 6. Capture 30 FPS stream from compositor canvas
      const videoStream = compCanvas.captureStream(30);

      // 7. Capture microphone stream from educator
      let audioTrack: MediaStreamTrack | null = null;
      try {
        this.audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 2,
            sampleRate: 48000,
          },
        });
        audioTrack = this.audioStream.getAudioTracks()[0] || null;
      } catch (err) {
        console.warn("[Scribe Recorder] Microphone not allowed or unavailable. Recording video without mic.", err);
      }

      // 8. Combine audio and video tracks into unified stream
      const combinedStream = new MediaStream();
      videoStream.getVideoTracks().forEach((vt) => combinedStream.addTrack(vt));
      if (audioTrack) {
        combinedStream.addTrack(audioTrack);
      }

      // 9. Select best supported container mimeType (Prioritize MP4 over WebM)
      const candidateMimeTypes = [
        "video/mp4;codecs=avc1,mp4a.40.2",
        "video/mp4;codecs=avc1",
        "video/mp4",
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ];

      this.selectedMime = "";
      for (const m of candidateMimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          this.selectedMime = m;
          break;
        }
      }

      const isMp4 = this.selectedMime.toLowerCase().includes("mp4");
      this.formatLabel = `${isMp4 ? "MP4" : "WebM"} ${this.qualityPreset === "720p" ? "720p" : "1080p"}`;

      // Smooth encoding bitrates: 2.5 Mbps for 1080p, 1.5 Mbps for 720p
      const videoBitrate = this.qualityPreset === "720p" ? 1_500_000 : 2_500_000;
      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: videoBitrate,
        audioBitsPerSecond: 128_000,
      };
      if (this.selectedMime) {
        recorderOptions.mimeType = this.selectedMime;
      }

      this.mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);

      this.mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          this.recordedChunks.push(e.data);
        }
      };

      this.mediaRecorder.onstop = () => {
        this.finishAndDownload();
      };

      // Start recording: omit timeslice to avoid 1-second fragmented chunk playback stutter
      this.mediaRecorder.start();

      // Start elapsed timer
      this.timerInterval = setInterval(() => {
        this.elapsedSeconds += 1;
        this.emitState();
      }, 1000);

      this.emitState();
      return true;
    } catch (err) {
      console.error("[Scribe Recorder] Failed to start lecture recording:", err);
      this.cleanupCompositor();
      alert("Could not start recording. Please ensure screen and microphone permissions are granted.");
      return false;
    }
  }

  public pauseRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      try {
        this.mediaRecorder.requestData();
      } catch {
        // ignore
      }
      this.mediaRecorder.pause();
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.emitState();
    }
  }

  public resumeRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state === "paused") {
      this.mediaRecorder.resume();
      this.timerInterval = setInterval(() => {
        this.elapsedSeconds += 1;
        this.emitState();
      }, 1000);
      this.emitState();
    }
  }

  public stopRecording() {
    this.cleanupCompositor();

    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      if (this.timerInterval) clearInterval(this.timerInterval);
      try {
        this.mediaRecorder.requestData();
      } catch {
        // ignore
      }
      this.mediaRecorder.stop();
      if (this.audioStream) {
        this.audioStream.getTracks().forEach((t) => t.stop());
        this.audioStream = null;
      }
    }
  }

  private cleanupCompositor() {
    this.isCompositorRunning = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
    if (this.windowResizeCleanup) {
      this.windowResizeCleanup();
      this.windowResizeCleanup = null;
    }
    this.facecamProvider = null;
  }

  private finishAndDownload() {
    if (this.recordedChunks.length === 0) return;

    const isMp4 = this.selectedMime.toLowerCase().includes("mp4");
    const ext = isMp4 ? "mp4" : "webm";
    const blobType = this.selectedMime || (isMp4 ? "video/mp4" : "video/webm");

    const blob = new Blob(this.recordedChunks, { type: blobType });
    const url = URL.createObjectURL(blob);

    const safeTitle = this.lectureTitle.replace(/[^a-z0-9_-]/gi, "_").toLowerCase() || "lecture";
    const dateStr = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ScribeStudio_${safeTitle}_${dateStr}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    this.recordedChunks = [];
    this.elapsedSeconds = 0;
    this.emitState();
  }
}

export const lectureRecorder = new LectureRecorderService();
