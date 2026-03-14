"use client";

import { create } from "zustand";
import { EngineState } from "@/lib/types";

const initialState: EngineState = {
  status: "offline",
  cameraReady: false,
  micReady: false,
  outputReady: false,
  isRecording: false,
  effect: "idle",
  gesture: {
    gesture: "none",
    confidence: 0,
    tilt: 0,
    label: "Python engine offline",
    movement: "still",
    position: {
      horizontal: "center",
      vertical: "mid"
    }
  },
  metrics: {
    inputLevel: 0,
    outputLevel: 0,
    pitchHz: 0,
    latencyMs: 0
  },
  errors: ["Start the Python engine to enable camera, mic, and speaker output."],
  backendVersion: "unavailable"
};

interface AppStore {
  engine: EngineState;
  setEngine: (engine: EngineState) => void;
  mergeEngine: (partial: Partial<EngineState>) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  engine: initialState,
  setEngine: (engine) => set({ engine }),
  mergeEngine: (partial) =>
    set((state) => ({
      engine: {
        ...state.engine,
        ...partial
      }
    }))
}));
