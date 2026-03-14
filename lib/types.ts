export type GestureType = "none" | "palm" | "fist" | "two-finger" | "love-you";

export type AudioEffectMode = "idle" | "vocoder" | "autotune" | "talkbox" | "recording";

export type MovementDirection = "still" | "left" | "right" | "up" | "down";

export type EngineStatus = "offline" | "connecting" | "idle" | "running" | "error";

export interface HandPosition {
  horizontal: "left" | "center" | "right";
  vertical: "high" | "mid" | "low";
}

export interface GestureSnapshot {
  gesture: GestureType;
  confidence: number;
  tilt: number;
  label: string;
  movement: MovementDirection;
  position: HandPosition;
}

export interface AudioMetrics {
  inputLevel: number;
  outputLevel: number;
  pitchHz: number;
  latencyMs: number;
}

export interface EngineState {
  status: EngineStatus;
  cameraReady: boolean;
  micReady: boolean;
  outputReady: boolean;
  isRecording: boolean;
  effect: AudioEffectMode;
  gesture: GestureSnapshot;
  metrics: AudioMetrics;
  errors: string[];
  backendVersion: string;
}
