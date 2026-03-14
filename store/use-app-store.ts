"use client";

import { create } from "zustand";
import {
  AudioEffectMode,
  AudioEngineStatus,
  AudioMetrics,
  GestureSnapshot,
  InferenceProvider,
  PermissionState,
  SessionStatus
} from "@/lib/types";
import { GESTURE_TO_EFFECT } from "@/lib/constants";

interface AppState {
  sessionStatus: SessionStatus;
  systemArmed: boolean;
  cameraReady: boolean;
  micReady: boolean;
  cameraPermission: PermissionState;
  micPermission: PermissionState;
  audioStatus: AudioEngineStatus;
  audioEffect: AudioEffectMode;
  gesture: GestureSnapshot;
  isRecording: boolean;
  pythonProvider: InferenceProvider;
  pythonEndpoint: string;
  cameraError?: string;
  audioError?: string;
  pythonError?: string;
  audioMetrics: AudioMetrics;
  armSystem: () => void;
  disarmSystem: () => void;
  setSessionStatus: (status: SessionStatus) => void;
  setCameraReady: (cameraReady: boolean) => void;
  setMicReady: (micReady: boolean) => void;
  setCameraPermission: (status: PermissionState) => void;
  setMicPermission: (status: PermissionState) => void;
  setAudioStatus: (status: AudioEngineStatus) => void;
  setGesture: (gesture: GestureSnapshot) => void;
  setRecording: (recording: boolean) => void;
  setAudioMetrics: (metrics: Partial<AudioMetrics>) => void;
  setCameraError: (message?: string) => void;
  setAudioError: (message?: string) => void;
  setPythonError: (message?: string) => void;
  setPythonProvider: (provider: InferenceProvider) => void;
}

const initialGesture: GestureSnapshot = {
  gesture: "none",
  confidence: 0,
  tilt: 0,
  label: "Arm the system to start tracking",
  movement: "still",
  position: {
    horizontal: "center",
    vertical: "mid"
  },
  source: "browser"
};

export const useAppStore = create<AppState>((set) => ({
  sessionStatus: "idle",
  systemArmed: false,
  cameraReady: false,
  micReady: false,
  cameraPermission: "idle",
  micPermission: "idle",
  audioStatus: "idle",
  audioEffect: "idle",
  gesture: initialGesture,
  isRecording: false,
  pythonProvider: "python-fallback",
  pythonEndpoint: process.env.NEXT_PUBLIC_GESTURE_MODEL_URL ?? "http://127.0.0.1:8001/infer",
  cameraError: undefined,
  audioError: undefined,
  pythonError: undefined,
  audioMetrics: {
    inputLevel: 0,
    spectralCentroid: 0,
    pitch: 0
  },
  armSystem: () =>
    set({
      systemArmed: true,
      sessionStatus: "arming",
      cameraPermission: "pending",
      micPermission: "pending",
      cameraError: undefined,
      audioError: undefined
    }),
  disarmSystem: () =>
    set({
      systemArmed: false,
      sessionStatus: "idle",
      cameraReady: false,
      micReady: false,
      cameraPermission: "idle",
      micPermission: "idle",
      audioStatus: "idle",
      audioEffect: "idle",
      gesture: initialGesture,
      isRecording: false,
      audioMetrics: {
        inputLevel: 0,
        spectralCentroid: 0,
        pitch: 0
      }
    }),
  setSessionStatus: (sessionStatus) => set({ sessionStatus }),
  setCameraReady: (cameraReady) => set({ cameraReady }),
  setMicReady: (micReady) => set({ micReady }),
  setCameraPermission: (cameraPermission) => set({ cameraPermission }),
  setMicPermission: (micPermission) => set({ micPermission }),
  setAudioStatus: (audioStatus) => set({ audioStatus }),
  setGesture: (gesture) =>
    set((state) => ({
      gesture,
      audioEffect: GESTURE_TO_EFFECT[gesture.gesture],
      isRecording: gesture.gesture === "two-finger",
      pythonProvider:
        gesture.source === "python-live" ? "python-live" : state.pythonProvider === "python-live" ? "python-live" : "browser"
    })),
  setRecording: (isRecording) => set({ isRecording }),
  setAudioMetrics: (audioMetrics) =>
    set((state) => ({
      audioMetrics: {
        ...state.audioMetrics,
        ...audioMetrics
      }
    })),
  setCameraError: (cameraError) =>
    set((state) => ({
      cameraError,
      sessionStatus: cameraError && !state.micReady ? "error" : state.sessionStatus
    })),
  setAudioError: (audioError) =>
    set((state) => ({
      audioError,
      sessionStatus: audioError && !state.cameraReady ? "error" : state.sessionStatus
    })),
  setPythonError: (pythonError) => set({ pythonError }),
  setPythonProvider: (pythonProvider) => set({ pythonProvider })
}));
