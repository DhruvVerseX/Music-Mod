"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { EFFECT_DESCRIPTIONS } from "@/lib/constants";
import { postGestureUpdate } from "@/hooks/use-engine-session";
import { EngineState } from "@/lib/types";
import { useAppStore } from "@/store/use-app-store";
import type { Hands as MediaPipeHands, Results as MediaPipeHandsResults } from "@mediapipe/hands";

type Landmark = { x: number; y: number; z?: number };
type HandsCtor = new (config: { locateFile: (file: string) => string }) => MediaPipeHands;

declare global {
  interface Window {
    Hands?: HandsCtor;
  }
}

export function EngineStage() {
  const engine = useAppStore((state) => state.engine);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const historyRef = useRef<Array<{ x: number; y: number }>>([]);
  const smoothedLandmarksRef = useRef<Landmark[] | null>(null);
  const missingFramesRef = useRef(0);
  const lastSentRef = useRef(0);
  const [hasMounted, setHasMounted] = useState(false);
  const [previewStatus, setPreviewStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [previewError, setPreviewError] = useState("");
  const [trackingHud, setTrackingHud] = useState({
    visible: false,
    movement: "still" as EngineState["gesture"]["movement"],
    movementAmount: 0,
    confidence: 0,
    x: 0,
    y: 0
  });

  useEffect(() => {
    setHasMounted(true);
  }, []);

  useEffect(() => {
    const shouldPreview = engine.status === "connecting" || engine.status === "running";
    if (!shouldPreview || typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return;
    }

    let cancelled = false;

    const startPreview = async () => {
      if (streamRef.current) {
        if (videoRef.current) {
          videoRef.current.srcObject = streamRef.current;
        }
        setPreviewStatus("ready");
        return;
      }

      setPreviewStatus("loading");
      setPreviewError("");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setPreviewStatus("ready");
      } catch (error) {
        if (cancelled) {
          return;
        }

        let message = "Camera preview could not start in the browser.";
        if (error instanceof DOMException) {
          if (error.name === "NotAllowedError") {
            message = "Browser camera permission is blocked. Allow camera access for this site.";
          } else if (error.name === "NotReadableError") {
            message = "Camera is already in use by another app.";
          } else if (error.name === "NotFoundError") {
            message = "No browser camera device was found.";
          }
        }

        setPreviewStatus("error");
        setPreviewError(message);
      }
    };

    void startPreview();

    return () => {
      cancelled = true;
    };
  }, [engine.status]);

  useEffect(() => {
    if (previewStatus !== "ready" || !videoRef.current) {
      return;
    }

    let cancelled = false;
    let frameHandle = 0;
    let hands: MediaPipeHands | null = null;

    const syncGesture = async (landmarks?: Landmark[]) => {
      if (cancelled || engine.status !== "running") {
        return;
      }

      const now = Date.now();
      if (now - lastSentRef.current < 120) {
        return;
      }
      lastSentRef.current = now;

      const payload = buildGesturePayload(landmarks);

      try {
        await postGestureUpdate(payload);
      } catch {
        // The session hook already surfaces engine connectivity errors.
      }
    };

    const boot = async () => {
      const mod = await import("@mediapipe/hands");
      if (cancelled || !videoRef.current) {
        return;
      }

      const HandsCtor =
        (mod as { Hands?: typeof window.Hands }).Hands ??
        (window as typeof window & { Hands?: typeof window.Hands }).Hands;

      if (!HandsCtor) {
        setPreviewStatus("error");
        setPreviewError("MediaPipe Hands failed to load in the browser.");
        return;
      }

      const instance = new HandsCtor({
        locateFile: (file) => `/mediapipe/hands/${file}`
      });
      instance.setOptions({
        selfieMode: true,
        maxNumHands: 1,
        modelComplexity: 1,
        minDetectionConfidence: 0.65,
        minTrackingConfidence: 0.6
      });
      instance.onResults((results: MediaPipeHandsResults) => {
        const rawLandmarks = results.multiHandLandmarks?.[0];
        const stableLandmarks = stabilizeLandmarks(rawLandmarks, smoothedLandmarksRef.current);

        if (stableLandmarks) {
          smoothedLandmarksRef.current = stableLandmarks;
          missingFramesRef.current = 0;
        } else {
          missingFramesRef.current += 1;
          if (missingFramesRef.current > 4) {
            smoothedLandmarksRef.current = null;
          }
        }

        const visibleLandmarks = stableLandmarks ?? smoothedLandmarksRef.current ?? undefined;
        drawHandOverlay(canvasRef.current, videoRef.current, visibleLandmarks);
        void syncGesture(visibleLandmarks);
      });
      hands = instance;

      const loop = async () => {
        if (cancelled || !hands || !videoRef.current) {
          return;
        }

        if (videoRef.current.readyState >= 2) {
          await hands.send({ image: videoRef.current });
        }

        frameHandle = window.requestAnimationFrame(() => {
          void loop();
        });
      };

      frameHandle = window.requestAnimationFrame(() => {
        void loop();
      });
    };

    void boot();

    return () => {
      cancelled = true;
      if (frameHandle) {
        window.cancelAnimationFrame(frameHandle);
      }
      smoothedLandmarksRef.current = null;
      missingFramesRef.current = 0;
      clearOverlay(canvasRef.current);
      void hands?.close();
    };
  }, [engine.status, previewStatus]);

  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, []);

    const buildGesturePayload = (landmarks?: Landmark[]): {
    cameraReady: boolean;
    effect: EngineState["effect"];
    gesture: EngineState["gesture"];
    isRecording: boolean;
  } => {
    if (!landmarks) {
      historyRef.current = [];
      setTrackingHud({
        visible: false,
        movement: "still",
        movementAmount: 0,
        confidence: 0,
        x: 0,
        y: 0
      });
      return {
        cameraReady: true,
        effect: "idle",
        gesture: {
          gesture: "none",
          confidence: 0,
          tilt: 0,
          label: "No hand detected",
          movement: "still",
          position: { horizontal: "center", vertical: "mid" }
        },
        isRecording: false
      };
    }

    const wrist = landmarks[0];
    historyRef.current = [...historyRef.current.slice(-7), { x: wrist.x, y: wrist.y }];

    const openness = estimateOpenness(landmarks);
    const tilt = round(((landmarks[5].x + landmarks[17].x) / 2) - wrist.x);
    const { movement, amount } = predictMovement(historyRef.current);
    const position = {
      horizontal: wrist.x < 0.38 ? "left" : wrist.x > 0.62 ? "right" : "center",
      vertical: wrist.y < 0.33 ? "high" : wrist.y > 0.68 ? "low" : "mid"
    } as const;

    let effect: EngineState["effect"] = "idle";
    let gesture: EngineState["gesture"]["gesture"] = "none";
    let confidence = 0.54;
    let label = "Hand detected";

    if (openness > 0.44) {
      effect = "vocoder";
      gesture = "palm";
      confidence = 0.91;
      label = "Palm detected";
    } else if (openness < 0.22) {
      effect = "autotune";
      gesture = "fist";
      confidence = 0.86;
      label = "Fist detected";
    } else if (0.22 <= openness && openness <= 0.34 && (movement === "up" || movement === "down")) {
      effect = "recording";
      gesture = "two-finger";
      confidence = 0.79;
      label = "Recording gesture";
    } else if (openness > 0.3 && (movement === "left" || movement === "right")) {
      effect = "talkbox";
      gesture = "love-you";
      confidence = 0.75;
      label = "Talkbox sign";
    }

    setTrackingHud({
      visible: true,
      movement,
      movementAmount: amount,
      confidence,
      x: wrist.x,
      y: wrist.y
    });

    return {
      cameraReady: true,
      effect,
      gesture: {
        gesture,
        confidence,
        tilt,
        label,
        movement,
        position
      },
      isRecording: effect === "recording"
    };
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.1 }}
      className="dj-panel overflow-hidden p-5"
    >
      <div className="relative min-h-[420px] rounded-[30px] border border-white/10 bg-[linear-gradient(135deg,#121621_0%,#0b0d13_55%,#17131a_100%)] p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">Camera Deck</p>
            <h2 className="mt-2 font-display text-4xl capitalize text-white">{engine.effect}</h2>
          </div>
          <div className="rounded-full border border-[#62ffd9]/20 bg-[#62ffd9]/10 px-4 py-2 text-[10px] uppercase tracking-[0.3em] text-[#9dffe9]">
            {engine.gesture.label}
          </div>
        </div>

        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">{EFFECT_DESCRIPTIONS[engine.effect]}</p>

        <div className="mt-7 grid gap-5 xl:grid-cols-[1.28fr_0.72fr]">
          <div className="overflow-hidden rounded-[30px] border border-white/10 bg-[#06070b]">
            <div className="flex items-center justify-between gap-4 border-b border-white/10 px-4 py-3">
              <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">Video Plate</p>
              <span className="text-[10px] uppercase tracking-[0.26em] text-[#62ffd9]">
                {previewStatus === "ready" ? "Tracking" : previewStatus === "loading" ? "Starting" : "Standby"}
              </span>
            </div>
            <div className="relative aspect-video min-h-[420px] bg-[radial-gradient(circle_at_top,rgba(98,255,217,0.18),transparent_30%),linear-gradient(180deg,#0b111a_0%,#05070c_100%)] xl:min-h-[560px]">
              {hasMounted ? (
                <video ref={videoRef} autoPlay muted playsInline className="h-full w-full object-cover" />
              ) : null}
              {hasMounted ? <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full" /> : null}
              <div className="pointer-events-none absolute left-4 top-4 rounded-[22px] border border-white/10 bg-black/55 px-4 py-3 backdrop-blur">
                <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">Live Tracking</p>
                <p className="mt-2 text-sm font-semibold text-white">
                  {trackingHud.visible ? trackingHud.movement : "no hand"}
                </p>
                <div className="mt-3 h-2 w-36 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#7ef7cf,#ff8f5a)] transition-[width] duration-100"
                    style={{ width: `${Math.max(6, trackingHud.movementAmount * 100)}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-white/60">
                  speed {Math.round(trackingHud.movementAmount * 100)} | x {Math.round(trackingHud.x * 100)} | y {Math.round(trackingHud.y * 100)}
                </p>
              </div>
              <div className="pointer-events-none absolute bottom-4 left-4 right-4 flex items-center justify-between rounded-[22px] border border-white/10 bg-black/45 px-4 py-3 backdrop-blur">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">Deck Cue</p>
                  <p className="mt-1 text-sm font-semibold uppercase text-white">{engine.gesture.gesture}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">Confidence</p>
                  <p className="mt-1 text-sm font-semibold uppercase text-white">{Math.round(engine.gesture.confidence * 100)}%</p>
                </div>
              </div>
              {previewStatus !== "ready" ? (
                <div className="absolute inset-0 flex items-center justify-center p-6">
                  <div className="max-w-sm text-center">
                    <p className="text-sm font-medium uppercase tracking-[0.28em] text-white/60">
                      {previewStatus === "loading" ? "Requesting Camera" : "Preview Offline"}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/65">
                      {previewError || "Click Start Engine to request browser camera access and start hand tracking here."}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-1">
            <EngineCard label="Gesture" value={engine.gesture.gesture} />
            <EngineCard label="Movement" value={engine.gesture.movement} />
            <EngineCard label="Hand Zone" value={`${engine.gesture.position.horizontal}-${engine.gesture.position.vertical}`} />
            <EngineCard label="Confidence" value={`${Math.round(engine.gesture.confidence * 100)}%`} />
          </div>
        </div>

        <div className="mt-8 rounded-[28px] border border-white/10 bg-[#0c0f16] p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-[11px] uppercase tracking-[0.32em] text-white/45">Signal Chain</p>
            <span className="text-[10px] uppercase tracking-[0.28em] text-[#ffb06b]">Mic to FX Bus to Master</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {["Mic", "Pitch", engine.effect, "Spatial FX", "Output"].map((item) => (
              <div key={item} className="rounded-[20px] border border-white/10 bg-white/[0.04] px-4 py-4 text-center text-sm uppercase tracking-[0.18em] text-white">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function EngineCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,#151922_0%,#0d1017_100%)] p-4">
      <p className="text-[11px] uppercase tracking-[0.28em] text-white/45">{label}</p>
      <p className="mt-3 text-xl font-semibold capitalize text-white">{value}</p>
    </div>
  );
}

function estimateOpenness(landmarks: Landmark[]) {
  const wrist = landmarks[0];
  const fingertipIds = [4, 8, 12, 16, 20];
  const distances = fingertipIds.map((idx) => {
    const tip = landmarks[idx];
    return Math.abs(tip.x - wrist.x) + Math.abs(tip.y - wrist.y);
  });

  return round(distances.reduce((sum, value) => sum + value, 0) / distances.length);
}

function predictMovement(history: Array<{ x: number; y: number }>): {
  movement: EngineState["gesture"]["movement"];
  amount: number;
} {
  if (history.length < 2) {
    return { movement: "still", amount: 0 };
  }

  const first = history[0];
  const last = history[history.length - 1];
  const deltaX = last.x - first.x;
  const deltaY = last.y - first.y;
  const speed = round(Math.abs(deltaX) + Math.abs(deltaY));

  if (speed < 0.03) {
    return { movement: "still", amount: speed };
  }

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return { movement: deltaX > 0 ? "right" : "left", amount: speed };
  }

  return { movement: deltaY > 0 ? "down" : "up", amount: speed };
}

function round(value: number) {
  return Math.round(value * 1000) / 1000;
}

function stabilizeLandmarks(next: Landmark[] | undefined, previous: Landmark[] | null) {
  if (!next?.length) {
    return null;
  }

  if (!previous || previous.length !== next.length) {
    return next.map((landmark) => ({ ...landmark }));
  }

  const smoothing = 0.68;
  return next.map((landmark, index) => ({
    x: round(previous[index].x * smoothing + landmark.x * (1 - smoothing)),
    y: round(previous[index].y * smoothing + landmark.y * (1 - smoothing)),
    z: landmark.z === undefined ? undefined : round((previous[index].z ?? landmark.z) * smoothing + landmark.z * (1 - smoothing))
  }));
}

const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17]
];

function clearOverlay(canvas: HTMLCanvasElement | null) {
  const context = canvas?.getContext("2d");
  if (!canvas || !context) {
    return;
  }

  context.clearRect(0, 0, canvas.width, canvas.height);
}

function drawHandOverlay(canvas: HTMLCanvasElement | null, video: HTMLVideoElement | null, landmarks?: Landmark[]) {
  const context = canvas?.getContext("2d");
  if (!canvas || !context || !video) {
    return;
  }

  const width = video.videoWidth || video.clientWidth;
  const height = video.videoHeight || video.clientHeight;
  if (!width || !height) {
    return;
  }

  if (canvas.width !== width) {
    canvas.width = width;
  }
  if (canvas.height !== height) {
    canvas.height = height;
  }

  context.clearRect(0, 0, width, height);
  if (!landmarks?.length) {
    return;
  }

  context.lineWidth = 3;
  context.strokeStyle = "#7ef7cf";
  context.fillStyle = "#ff8f5a";
  context.shadowColor = "rgba(126, 247, 207, 0.35)";
  context.shadowBlur = 8;

  for (const [fromIndex, toIndex] of HAND_CONNECTIONS) {
    const from = landmarks[fromIndex];
    const to = landmarks[toIndex];
    context.beginPath();
    context.moveTo(from.x * width, from.y * height);
    context.lineTo(to.x * width, to.y * height);
    context.stroke();
  }

  for (const landmark of landmarks) {
    context.beginPath();
    context.arc(landmark.x * width, landmark.y * height, 4, 0, Math.PI * 2);
    context.fill();
  }
}
