"use client";

import { useEffect, useRef } from "react";
import { Hands, Results } from "@mediapipe/hands";
import { Camera } from "@mediapipe/camera_utils";
import { drawConnectors, drawLandmarks } from "@mediapipe/drawing_utils";
import { classifyGesture } from "@/lib/gesture/gesture-classifier";
import { useAppStore } from "@/store/use-app-store";

interface Options {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export function useGestureTracking({ videoRef, canvasRef }: Options) {
  const cameraRef = useRef<Camera | null>(null);
  const handsRef = useRef<Hands | null>(null);
  const { setCameraReady, setGesture, setPermissionError } = useAppStore();

  useEffect(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (!video || !canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });
    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.6
    });

    hands.onResults((results: Results) => {
      context.save();
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.drawImage(results.image, 0, 0, canvas.width, canvas.height);

      const landmarks = results.multiHandLandmarks?.[0];
      if (landmarks) {
        drawConnectors(context, landmarks, Hands.HAND_CONNECTIONS, {
          color: "#7dd3fc",
          lineWidth: 3
        });
        drawLandmarks(context, landmarks, {
          color: "#6ee7b7",
          lineWidth: 1,
          radius: 3
        });
      }

      context.restore();
      setGesture(classifyGesture(landmarks));
    });

    handsRef.current = hands;

    navigator.mediaDevices
      .getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user"
        }
      })
      .then((stream) => {
        video.srcObject = stream;
        setCameraReady(true);

        const camera = new Camera(video, {
          onFrame: async () => {
            await hands.send({ image: video });
          },
          width: 1280,
          height: 720
        });

        cameraRef.current = camera;
        void camera.start();
      })
      .catch((error) => {
        setPermissionError(error instanceof Error ? error.message : "Camera access failed");
      });

    return () => {
      const stream = video.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
      cameraRef.current?.stop();
      handsRef.current?.close();
    };
  }, [canvasRef, setCameraReady, setGesture, setPermissionError, videoRef]);
}
