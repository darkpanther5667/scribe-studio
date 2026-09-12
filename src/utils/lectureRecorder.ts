/**
 * In-browser lecture video + educator microphone audio recorder.
 * Composites the whiteboard canvas and live educator facecam PiP into
 * high-definition MP4 (H.264 / AAC) at 5 Mbps (with graceful WebM fallback).
 */

export interface FacecamOverlayState {
  videoElement: HTMLVideoElement | null;
  shape: "circle" | "rect";
  isMirrored: boolean;
  getScreenBounds: () => DOMRect | null;
}

export interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  seconds: number;
  format?: string;
}

class LectureRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private timerInterval: any = null;
  private elapsedSeconds = 0;
  private lectureTitle = "Lecture";
  private selectedMime = "";
  private formatLabel = "MP4 HD";

  // Compositor canvas & animation frame loop
  private animFrameId: number | null = null;
  private isCompositorRunning = false;
  private facecamProvider: (() => FacecamOverlayState | null) | null = null;

  private onStateChangeCallback: ((state: RecorderState) => void) | null = null;

  public subscribe(callback: (state: RecorderState) => void) {
    this.onStateChangeCallback = callback;
    this.emitState();
  }

  private emitState() {
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback({
        isRecording: Boolean(this.mediaRecorder && this.mediaRecorder.state !== "inactive"),
        isPaused: Boolean(this.mediaRecorder && this.mediaRecorder.state === "paused"),
        seconds: this.elapsedSeconds,
        format: this.formatLabel,
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

      // 1. Setup offscreen compositor canvas to composite whiteboard + facecam
      const compCanvas = document.createElement("canvas");
      let targetWidth = canvas.width || 1920;
      let targetHeight = canvas.height || 1080;

      // Cap at 1920x1080 for buttery 30 FPS hardware encoding without thermal throttling
      const maxDim = 1920;
      if (targetWidth > maxDim || targetHeight > maxDim) {
        const scale = Math.min(maxDim / targetWidth, maxDim / targetHeight);
        targetWidth = Math.round(targetWidth * scale);
        targetHeight = Math.round(targetHeight * scale);
      }
      // H.264/AVC encoders strictly require even pixel dimensions
      targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth - 1;
      targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight - 1;

      compCanvas.width = targetWidth;
      compCanvas.height = targetHeight;

      const compCtx = compCanvas.getContext("2d", { alpha: false });
      if (!compCtx) {
        throw new Error("Could not initialize 2D context for lecture compositor.");
      }

      // Start continuous rendering loop
      this.isCompositorRunning = true;
      const renderCompositorFrame = () => {
        if (!this.isCompositorRunning) return;

        // A. Render whiteboard canvas
        try {
          compCtx.drawImage(canvas, 0, 0, targetWidth, targetHeight);
        } catch (e) {
          // ignore transient canvas read errors
        }

        // B. Render educator facecam overlay if active
        try {
          const facecam = this.facecamProvider ? this.facecamProvider() : null;
          if (
            facecam &&
            facecam.videoElement &&
            !facecam.videoElement.paused &&
            !facecam.videoElement.ended &&
            facecam.videoElement.readyState >= 2
          ) {
            const canvasBounds = canvas.getBoundingClientRect();
            const pipBounds = facecam.getScreenBounds();

            if (pipBounds && canvasBounds.width > 0 && canvasBounds.height > 0) {
              const scaleX = targetWidth / canvasBounds.width;
              const scaleY = targetHeight / canvasBounds.height;

              const destX = (pipBounds.left - canvasBounds.left) * scaleX;
              const destY = (pipBounds.top - canvasBounds.top) * scaleY;
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

                // Object-cover aspect crop calculation for camera video
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

                // Draw glowing cyan educator frame border matching UI
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
                compCtx.lineWidth = Math.max(2.5, 3 * scaleX);
                compCtx.shadowColor = "rgba(56, 189, 248, 0.7)";
                compCtx.shadowBlur = 10 * scaleX;
                compCtx.stroke();
                compCtx.restore();
              }
            }
          }
        } catch (e) {
          // ignore facecam rendering errors to keep recording intact
        }

        this.animFrameId = requestAnimationFrame(renderCompositorFrame);
      };

      // Kick off first compositor render
      renderCompositorFrame();

      // 2. Capture high-framerate 30 FPS stream from compositor canvas
      const videoStream = compCanvas.captureStream(30);

      // 3. Capture high-fidelity microphone stream from educator
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
        console.warn("[Scribe Recorder] Microphone not allowed or unavailable. Recording canvas without mic.", err);
      }

      // 4. Combine audio and video tracks into unified stream
      const combinedStream = new MediaStream();
      videoStream.getVideoTracks().forEach((vt) => combinedStream.addTrack(vt));
      if (audioTrack) {
        combinedStream.addTrack(audioTrack);
      }

      // 5. Select best supported container mimeType (Prioritize MP4 over WebM)
      const candidateMimeTypes = [
        "video/mp4;codecs=avc1,mp4a.40.2",
        "video/mp4;codecs=avc1,opus",
        "video/mp4;codecs=avc1",
        "video/mp4",
        "video/webm;codecs=h264,opus",
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
      this.formatLabel = isMp4 ? "MP4 HD" : "WebM HD";

      const recorderOptions: MediaRecorderOptions = {
        videoBitsPerSecond: 5_000_000, // 5 Mbps: razor-sharp presentation text, graphs, and facecam
        audioBitsPerSecond: 128_000,   // 128 kbps: studio clarity microphone voice
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

      this.mediaRecorder.start(1000); // 1-second chunks

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
