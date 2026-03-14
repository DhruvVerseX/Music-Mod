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

export interface GestureSnapshot {
  gesture: GestureType;
  confidence: number;
  tilt: number;
  label: string;
}

export interface AudioMetrics {
  inputLevel: number;
  spectralCentroid: number;
  pitch: number;
}
