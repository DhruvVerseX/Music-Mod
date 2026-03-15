"use client";

import { useEffect } from "react";
import { browserAudioEngine } from "@/lib/browser-audio-engine";
import { EngineState } from "@/lib/types";
import { useAppStore } from "@/store/use-app-store";

export function useEngineSession() {
  const mergeEngine = useAppStore((state) => state.mergeEngine);

  useEffect(() => {
    mergeEngine({
      status: "idle",
      backendVersion: "browser-engine-1.0.0",
      errors: ["Click Start Engine to enable live camera, mic, and browser audio modulation."]
    });
  }, [mergeEngine]);
}

export async function postEngineAction(path: string) {
  if (path === "/session/start") {
    await browserAudioEngine.start();
    useAppStore.getState().mergeEngine({
      status: "running",
      micReady: true,
      outputReady: true,
      backendVersion: "browser-engine-1.0.0",
      errors: ["Browser audio engine is running. Move your hand to switch effects in real time."]
    });
    return;
  }

  if (path === "/session/stop") {
    await browserAudioEngine.stop();
    useAppStore.getState().mergeEngine({
      status: "idle",
      cameraReady: false,
      micReady: false,
      outputReady: false,
      isRecording: false,
      effect: "idle",
      backendVersion: "browser-engine-1.0.0",
      errors: ["Engine stopped."]
    });
  }
}

export async function requestBrowserMediaAccess() {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    throw new Error("This browser cannot request camera and microphone access.");
  }

  const stream = await navigator.mediaDevices
    .getUserMedia({
      audio: true,
      video: true
    })
    .catch((error: unknown) => {
      if (error instanceof DOMException) {
        if (error.name === "NotAllowedError") {
          throw new Error("Camera and microphone permission was blocked in the browser.");
        }
        if (error.name === "NotFoundError") {
          throw new Error("No usable camera or microphone was found in the browser.");
        }
        if (error.name === "NotReadableError") {
          throw new Error("Camera or microphone is busy in another app.");
        }
      }

      throw new Error("Browser media permission request failed.");
    });

  stream.getTracks().forEach((track) => track.stop());
}

export async function postGestureUpdate(payload: {
  cameraReady: boolean;
  effect: EngineState["effect"];
  gesture: EngineState["gesture"];
  isRecording: boolean;
}) {
  browserAudioEngine.setEffect(payload.effect);
  useAppStore.getState().mergeEngine({
    cameraReady: payload.cameraReady,
    effect: payload.effect,
    gesture: payload.gesture,
    isRecording: payload.isRecording
  });
}
