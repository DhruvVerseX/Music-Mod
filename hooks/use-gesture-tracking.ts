"use client";

import { useEffect, useRef } from "react";
import { analyzeLocalGesture, LandmarkFrame } from "@/lib/gesture/gesture-classifier";
import { analyzeWithPython } from "@/lib/gesture/python-gesture-client";
import { useAppStore } from "@/store/use-app-store";

interface Options {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

const HISTORY_SIZE = 8;
const PYTHON_SAMPLE_INTERVAL_MS = 220;

/** Inject a CDN script tag and resolve when loaded. No-ops if already present. */
function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.crossOrigin = "anonymous";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load MediaPipe script: ${src}`));
    document.head.appendChild(script);
  });
}

/** Load all three MediaPipe CDN scripts and return named exports from window. */
async function loadMediaPipeCDN() {
  await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/hands/hands.js");
  await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js");
  await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  return {
    HandsCtor: w.Hands,
    CameraCtor: w.Camera,
    drawConnectorsFn: w.drawConnectors,
    drawLandmarksFn: w.drawLandmarks,
    handConnections: w.HAND_CONNECTIONS as [number, number][],
  };
}

export function useGestureTracking({ videoRef, canvasRef }: Options) {
  const cameraRef = useRef<{ stop: () => void } | null>(null);
  const handsRef = useRef<{ close: () => void } | null>(null);
  const historyRef = useRef<LandmarkFrame[]>([]);
  const lastPythonCallRef = useRef(0);
  const sendingRef = useRef(false);
  const closedRef = useRef(false);
  const {
    systemArmed,
    pythonEndpoint,
    setCameraReady,
    setCameraPermission,
    setCameraError,
    setGesture,
    setPythonError,
    setPythonProvider,
    setSessionStatus,
  } = useAppStore();

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    let cancelled = false;
    closedRef.current = false;

    if (!systemArmed || !video || !canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    void (async () => {
      try {
        // Primary strategy: CDN script tags.
        // The @mediapipe npm packages attach globals to `window` when loaded
        // this way — the officially documented web integration approach and far
        // more reliable than dynamic `import()` whose export shape varies by
        // bundler version.
        const loaded = await loadMediaPipeCDN();
        let HandsCtor = loaded.HandsCtor;
        let CameraCtor = loaded.CameraCtor;
        let drawConnectorsFn = loaded.drawConnectorsFn;
        let drawLandmarksFn = loaded.drawLandmarksFn;
        let handConnections: [number, number][] | undefined = loaded.handConnections;

        // Secondary fallback: attempt npm dynamic imports in case the CDN was
        // blocked or the globals weren't set (e.g. strict CSP environments).
        if (!HandsCtor || !CameraCtor) {
          const [handsModule, cameraModule, drawingModule] = await Promise.all([
            import("@mediapipe/hands"),
            import("@mediapipe/camera_utils"),
            import("@mediapipe/drawing_utils"),
          ]);

          HandsCtor =
            ("Hands" in handsModule ? handsModule.Hands : undefined) ??
            (handsModule.default as { Hands?: unknown } | undefined)?.Hands;

          handConnections =
            ("HAND_CONNECTIONS" in handsModule
              ? (handsModule.HAND_CONNECTIONS as [number, number][])
              : undefined) ??
            ((handsModule.default as { HAND_CONNECTIONS?: [number, number][] } | undefined)
              ?.HAND_CONNECTIONS);

          CameraCtor =
            ("Camera" in cameraModule ? cameraModule.Camera : undefined) ??
            (cameraModule.default as { Camera?: unknown } | undefined)?.Camera;

          drawConnectorsFn =
            ("drawConnectors" in drawingModule ? drawingModule.drawConnectors : undefined) ??
            (drawingModule.default as { drawConnectors?: unknown } | undefined)?.drawConnectors;

          drawLandmarksFn =
            ("drawLandmarks" in drawingModule ? drawingModule.drawLandmarks : undefined) ??
            (drawingModule.default as { drawLandmarks?: unknown } | undefined)?.drawLandmarks;
        }

        if (cancelled) return;

        if (!HandsCtor || !CameraCtor || !drawConnectorsFn || !drawLandmarksFn || !handConnections) {
          throw new Error("MediaPipe modules failed to load correctly.");
        }

        const normalizedHandConnections = handConnections as [number, number][];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const hands = new (HandsCtor as any)({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.6,
        });

        const typedDrawConnectors = drawConnectorsFn as typeof import("@mediapipe/drawing_utils").drawConnectors;
        const typedDrawLandmarks = drawLandmarksFn as typeof import("@mediapipe/drawing_utils").drawLandmarks;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        hands.onResults((results: any) => {
          context.save();
          context.clearRect(0, 0, canvas.width, canvas.height);
          context.drawImage(results.image, 0, 0, canvas.width, canvas.height);

          const landmarks = results.multiHandLandmarks?.[0];
          if (landmarks) {
            typedDrawConnectors(context, landmarks, normalizedHandConnections, {
              color: "#7dd3fc",
              lineWidth: 3,
            });
            typedDrawLandmarks(context, landmarks, {
              color: "#6ee7b7",
              lineWidth: 1,
              radius: 3,
            });

            const frame = {
              timestamp: Date.now(),
              landmarks,
            };

            historyRef.current = [...historyRef.current.slice(-(HISTORY_SIZE - 1)), frame];
            const localGesture = analyzeLocalGesture(landmarks, historyRef.current);
            setGesture(localGesture);
            setSessionStatus("live");

            if (Date.now() - lastPythonCallRef.current > PYTHON_SAMPLE_INTERVAL_MS) {
              lastPythonCallRef.current = Date.now();
              void analyzeWithPython(pythonEndpoint, historyRef.current)
                .then((pythonGesture) => {
                  if (!pythonGesture || cancelled) return;
                  setPythonProvider("python-live");
                  setPythonError(undefined);
                  setGesture(pythonGesture);
                })
                .catch(() => {
                  setPythonProvider("python-fallback");
                  setPythonError("Python motion model offline. Using browser fallback.");
                });
            }
          } else {
            historyRef.current = [];
            setGesture(analyzeLocalGesture(undefined, []));
          }

          context.restore();
        });

        handsRef.current = hands;

        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
        });

        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        setCameraPermission("granted");
        video.srcObject = stream;
        setCameraReady(true);
        setCameraError(undefined);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const camera = new (CameraCtor as any)(video, {
          onFrame: async () => {
            if (cancelled || closedRef.current || sendingRef.current) {
              return;
            }

            try {
              sendingRef.current = true;
              await hands.send({ image: video });
            } catch {
              if (!cancelled && !closedRef.current) {
                setCameraError("Gesture engine stopped unexpectedly. Re-arm the system.");
              }
            } finally {
              sendingRef.current = false;
            }
          },
          width: 1280,
          height: 720,
        });

        cameraRef.current = camera;
        void camera.start();
      } catch (error) {
        setCameraPermission("denied");
        setCameraError(error instanceof Error ? error.message : "Camera access failed");
      }
    })();

    return () => {
      cancelled = true;
      closedRef.current = true;
      historyRef.current = [];
      const stream = video.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
      const camera = cameraRef.current;
      cameraRef.current = null;
      camera?.stop();
      const hands = handsRef.current;
      handsRef.current = null;
      try {
        hands?.close();
      } catch {
        // Ignore MediaPipe teardown races during strict-mode remounts.
      }
      setCameraReady(false);
    };
  }, [
    canvasRef,
    pythonEndpoint,
    setCameraError,
    setCameraPermission,
    setCameraReady,
    setGesture,
    setPythonError,
    setPythonProvider,
    setSessionStatus,
    systemArmed,
    videoRef,
  ]);
}
