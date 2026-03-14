from __future__ import annotations

from schemas import InferenceResponse, MotionFeatures, PoseFeatures


class SequenceModel:
    def predict(self, pose: PoseFeatures, motion: MotionFeatures) -> InferenceResponse:
        gesture = "none"
        confidence = 0.52
        label = "Transitional gesture"

        if pose.openness > 0.44:
            gesture = "palm"
            confidence = 0.91
            label = "Palm detected"
        elif pose.openness < 0.22:
            gesture = "fist"
            confidence = 0.86
            label = "Fist detected"
        elif motion.direction in {"up", "down"} and 0.22 <= pose.openness <= 0.34:
            gesture = "two-finger"
            confidence = 0.79
            label = "Recording gesture"
        elif pose.openness > 0.3 and motion.direction in {"left", "right"}:
            gesture = "love-you"
            confidence = 0.75
            label = "Talkbox sign"

        return InferenceResponse(
            gesture=gesture,
            confidence=confidence,
            tilt=pose.tilt,
            label=label,
            movement=motion.direction,
            position={
                "horizontal": pose.horizontal,
                "vertical": pose.vertical,
            },
            source="python-live",
        )
