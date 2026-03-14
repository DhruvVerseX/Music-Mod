import { GestureSnapshot } from "@/lib/types";
import { Landmark, LandmarkFrame } from "@/lib/gesture/gesture-classifier";

interface PythonInferencePayload {
  frames: Array<{
    timestamp: number;
    landmarks: Landmark[];
  }>;
  model_order: ["pose", "motion", "sequence"] | ["motion", "pose", "sequence"];
}

export async function analyzeWithPython(
  endpoint: string,
  history: LandmarkFrame[]
): Promise<GestureSnapshot | null> {
  const payload: PythonInferencePayload = {
    frames: history.map((frame) => ({
      timestamp: frame.timestamp,
      landmarks: frame.landmarks
    })),
    model_order: ["pose", "motion", "sequence"]
  };

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`Python inference failed with ${response.status}`);
  }

  const result = (await response.json()) as GestureSnapshot;
  return {
    ...result,
    source: "python-live"
  };
}
