import { GestureSnapshot, GestureType, MovementDirection } from "@/lib/types";

export type Landmark = { x: number; y: number; z: number };

export interface LandmarkFrame {
  timestamp: number;
  landmarks: Landmark[];
}

function fingerExtended(landmarks: Landmark[], tip: number, pip: number) {
  return landmarks[tip].y < landmarks[pip].y;
}

function thumbExtended(landmarks: Landmark[]) {
  return Math.abs(landmarks[4].x - landmarks[3].x) > 0.04;
}

function estimateTilt(landmarks: Landmark[]) {
  return Number(((landmarks[5].x + landmarks[17].x) / 2 - landmarks[0].x).toFixed(3));
}

function estimateMovement(history: LandmarkFrame[]): MovementDirection {
  if (history.length < 2) {
    return "still";
  }

  const first = history[0]?.landmarks[0];
  const last = history[history.length - 1]?.landmarks[0];

  if (!first || !last) {
    return "still";
  }

  const deltaX = last.x - first.x;
  const deltaY = last.y - first.y;

  if (Math.abs(deltaX) < 0.03 && Math.abs(deltaY) < 0.03) {
    return "still";
  }

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    return deltaX > 0 ? "right" : "left";
  }

  return deltaY > 0 ? "down" : "up";
}

function estimatePosition(landmarks: Landmark[]) {
  const wrist = landmarks[0];
  const horizontal = wrist.x < 0.38 ? "left" : wrist.x > 0.62 ? "right" : "center";
  const vertical = wrist.y < 0.33 ? "high" : wrist.y > 0.68 ? "low" : "mid";

  return { horizontal, vertical } as const;
}

export function analyzeLocalGesture(landmarks: Landmark[] | undefined, history: LandmarkFrame[]): GestureSnapshot {
  if (!landmarks || landmarks.length < 21) {
    return {
      gesture: "none",
      confidence: 0,
      tilt: 0,
      label: "No hand detected",
      movement: "still",
      position: {
        horizontal: "center",
        vertical: "mid"
      },
      source: "browser"
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
    label,
    movement: estimateMovement(history),
    position: estimatePosition(landmarks),
    source: "browser"
  };
}
