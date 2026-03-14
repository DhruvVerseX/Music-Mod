export type GestureType =
  | "none"
  | "palm"
  | "fist"
  | "two-finger"
  | "love-you";

export type AudioEffectMode =
  | "idle"
  | "vocoder"
  | "autotune"
  | "talkbox"
  | "recording";

export type AudioEngineStatus = "idle" | "initializing" | "ready" | "error";

export type PermissionState = "idle" | "pending" | "granted" | "denied" | "unsupported";

export type SessionStatus = "idle" | "arming" | "live" | "error";

export type InferenceProvider = "browser" | "python-fallback" | "python-live";

export type MovementDirection = "still" | "left" | "right" | "up" | "down";

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
  source: InferenceProvider;
}

export interface AudioMetrics {
  inputLevel: number;
  spectralCentroid: number;
  pitch: number;
}
