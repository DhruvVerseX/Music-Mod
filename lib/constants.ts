import { AudioEffectMode } from "@/lib/types";

export const ENGINE_HTTP_URL = process.env.NEXT_PUBLIC_ENGINE_HTTP_URL ?? "http://127.0.0.1:8001";
export const ENGINE_WS_URL = process.env.NEXT_PUBLIC_ENGINE_WS_URL ?? "ws://127.0.0.1:8001/ws";

export const EFFECT_DESCRIPTIONS: Record<AudioEffectMode, string> = {
  idle: "Dry monitoring while the Python engine is armed and waiting for gestures.",
  vocoder: "Carrier-style robotic coloration controlled by palm angle and movement.",
  autotune: "Quantized pitch correction with fist tilt steering the correction depth.",
  talkbox: "Formant-focused vocal filtering for speech-like synth articulation.",
  recording: "Processed signal is being captured by the Python engine."
};

export const GESTURE_GUIDE = [
  ["Palm", "Vocoder"],
  ["Fist", "AutoTune"],
  ["Two Finger", "Record"],
  ["Love You", "Talkbox"]
] as const;
