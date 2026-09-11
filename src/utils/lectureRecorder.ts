/**
 * In-browser lecture video + educator microphone audio recorder.
 * Combines canvas drawing stream and microphone into high-quality WebM.
 */

export interface RecorderState {
  isRecording: boolean;
  isPaused: boolean;
  seconds: number;
}

class LectureRecorderService {
  private mediaRecorder: MediaRecorder | null = null;
  private audioStream: MediaStream | null = null;
  private recordedChunks: Blob[] = [];
  private timerInterval: any = null;
  private elapsedSeconds = 0;
  private lectureTitle = "Lecture";

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
      });
    }
  }

  public async startRecording(canvas: HTMLCanvasElement, title: string): Promise<boolean> {
    try {
      this.lectureTitle = title || "Lecture";
      this.recordedChunks = [];
      this.elapsedSeconds = 0;

      // 1. Capture 30 FPS stream from HTML5 whiteboard canvas
      const canvasStream = canvas.captureStream(30);

      // 2. Capture microphone stream from teacher
      let audioTrack: MediaStreamTrack | null = null;
      try {
        this.audioStream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
          },
        });
        audioTrack = this.audioStream.getAudioTracks()[0] || null;
      } catch (err) {
        console.warn("[Tapboard Recorder] Microphone not allowed or unavailable. Recording canvas without mic.", err);
      }

      // 3. Combine tracks into single stream
      const combinedStream = new MediaStream();
      canvasStream.getVideoTracks().forEach((vt) => combinedStream.addTrack(vt));
      if (audioTrack) {
        combinedStream.addTrack(audioTrack);
      }

      // 4. Select best supported container mimeType
      const mimeTypes = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
        "video/mp4",
      ];
      let selectedMime = "";
      for (const m of mimeTypes) {
        if (MediaRecorder.isTypeSupported(m)) {
          selectedMime = m;
          break;
        }
      }

      this.mediaRecorder = new MediaRecorder(combinedStream, selectedMime ? { mimeType: selectedMime } : undefined);

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
      console.error("[Tapboard Recorder] Failed to start lecture recording:", err);
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
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      if (this.timerInterval) clearInterval(this.timerInterval);
      this.mediaRecorder.stop();
      if (this.audioStream) {
        this.audioStream.getTracks().forEach((t) => t.stop());
        this.audioStream = null;
      }
    }
  }

  private finishAndDownload() {
    if (this.recordedChunks.length === 0) return;

    const blob = new Blob(this.recordedChunks, { type: "video/webm" });
    const url = URL.createObjectURL(blob);

    const safeTitle = this.lectureTitle.replace(/[^a-z0-9_-]/gi, "_").toLowerCase() || "lecture";
    const dateStr = new Date().toISOString().slice(0, 10);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Tapboard_${safeTitle}_${dateStr}.webm`;
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
