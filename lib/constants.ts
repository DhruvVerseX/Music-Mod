import { AudioEffectMode, GestureType } from "@/lib/types";

export const GESTURE_TO_EFFECT: Record<GestureType, AudioEffectMode> = {
  none: "idle",
  palm: "vocoder",
  fist: "autotune",
  "two-finger": "recording",
  "love-you": "talkbox"
};

export const EFFECT_DESCRIPTIONS: Record<AudioEffectMode, string> = {
  idle: "Neutral signal path with live monitoring.",
  vocoder: "Carrier-enhanced vocal coloring with tilt pitch warp.",
  autotune: "Pitch correction response changes with fist tilt.",
  talkbox: "Formant-style synth filter for speech-like resonance.",
  recording: "Capturing the live processed microphone stream."
};
