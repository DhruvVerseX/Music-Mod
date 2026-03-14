"use client";

import { create } from "zustand";
import { AudioEffectMode, AudioEngineStatus, AudioMetrics, GestureSnapshot } from "@/lib/types";
import { GESTURE_TO_EFFECT } from "@/lib/constants";

interface AppState {
  cameraReady: boolean;
  micReady: boolean;
  audioStatus: AudioEngineStatus;
  audioEffect: AudioEffectMode;
  gesture: GestureSnapshot;
  isRecording: boolean;
  permissionError?: string;
  audioMetrics: AudioMetrics;
  setCameraReady: (cameraReady: boolean) => void;
  setMicReady: (micReady: boolean) => void;
  setAudioStatus: (status: AudioEngineStatus) => void;
  setGesture: (gesture: GestureSnapshot) => void;
  setPermissionError: (message?: string) => void;
  setRecording: (recording: boolean) => void;
  setAudioMetrics: (metrics: Partial<AudioMetrics>) => void;
}

const initialGesture: GestureSnapshot = {
  gesture: "none",
  confidence: 0,
  tilt: 0,
  label: "Awaiting hand gesture"
};

export const useAppStore = create<AppState>((set) => ({
  cameraReady: false,
  micReady: false,
  audioStatus: "idle",
  audioEffect: "idle",
  gesture: initialGesture,
  isRecording: false,
  permissionError: undefined,
  audioMetrics: {
    inputLevel: 0,
    spectralCentroid: 0,
    pitch: 0
  },
  setCameraReady: (cameraReady) => set({ cameraReady }),
  setMicReady: (micReady) => set({ micReady }),
  setAudioStatus: (audioStatus) => set({ audioStatus }),
  setGesture: (gesture) =>
    set({
      gesture,
      audioEffect: GESTURE_TO_EFFECT[gesture.gesture],
      isRecording: gesture.gesture === "two-finger"
    }),
  setPermissionError: (permissionError) => set({ permissionError }),
  setRecording: (isRecording) => set({ isRecording }),
  setAudioMetrics: (audioMetrics) =>
    set((state) => ({
      audioMetrics: {
        ...state.audioMetrics,
        ...audioMetrics
      }
    }))
}));
