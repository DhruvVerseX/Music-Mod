import { GestureSnapshot, GestureType } from "@/lib/types";

type Landmark = { x: number; y: number; z: number };

const tipIds = [4, 8, 12, 16, 20];

function fingerExtended(landmarks: Landmark[], tip: number, pip: number) {
  return landmarks[tip].y < landmarks[pip].y;
}

function thumbExtended(landmarks: Landmark[]) {
  return Math.abs(landmarks[4].x - landmarks[3].x) > 0.04;
}

function estimateTilt(landmarks: Landmark[]) {
  return Number(((landmarks[5].x + landmarks[17].x) / 2 - landmarks[0].x).toFixed(3));
}

export function classifyGesture(landmarks: Landmark[] | undefined): GestureSnapshot {
  if (!landmarks || landmarks.length < tipIds[tipIds.length - 1] + 1) {
    return {
      gesture: "none",
      confidence: 0,
      tilt: 0,
      label: "No hand detected"
    };
  }

  const indexOpen = fingerExtended(landmarks, 8, 6);
  const middleOpen = fingerExtended(landmarks, 12, 10);
  const ringOpen = fingerExtended(landmarks, 16, 14);
  const pinkyOpen = fingerExtended(landmarks, 20, 18);
  const thumbOpen = thumbExtended(landmarks);

  const openCount = [thumbOpen, indexOpen, middleOpen, ringOpen, pinkyOpen].filter(Boolean).length;
  const tilt = estimateTilt(landmarks);

  let gesture: GestureType = "none";
  let confidence = 0.65;
  let label = "Open modulation";

  if (openCount >= 4) {
    gesture = "palm";
    confidence = 0.92;
    label = "Palm detected";
  } else if (!indexOpen && !middleOpen && !ringOpen && !pinkyOpen) {
    gesture = "fist";
    confidence = 0.88;
    label = "Fist detected";
  } else if (indexOpen && middleOpen && !ringOpen && !pinkyOpen) {
    gesture = "two-finger";
    confidence = 0.9;
    label = "Recording gesture";
  } else if (thumbOpen && indexOpen && pinkyOpen && !middleOpen && !ringOpen) {
    gesture = "love-you";
    confidence = 0.94;
    label = "Talkbox sign";
  } else {
    confidence = 0.55;
    label = "Transitional gesture";
  }

  return {
    gesture,
    confidence,
    tilt,
    label
  };
}
