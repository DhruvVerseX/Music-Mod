from __future__ import annotations

from schemas import GestureSnapshot


class SequenceModel:
    def predict(
        self,
        openness: float,
        tilt: float,
        movement: str,
        position,
    ) -> tuple[str, GestureSnapshot]:
        gesture = "none"
        confidence = 0.52
        label = "Transitional gesture"
        effect = "idle"

        if openness > 0.44:
            gesture = "palm"
            confidence = 0.91
            label = "Palm detected"
            effect = "vocoder"
        elif openness < 0.22:
            gesture = "fist"
            confidence = 0.86
            label = "Fist detected"
            effect = "autotune"
        elif 0.22 <= openness <= 0.34 and movement in {"up", "down"}:
            gesture = "two-finger"
            confidence = 0.79
            label = "Recording gesture"
            effect = "recording"
        elif openness > 0.30 and movement in {"left", "right"}:
            gesture = "love-you"
            confidence = 0.75
            label = "Talkbox sign"
            effect = "talkbox"

        return effect, GestureSnapshot(
            gesture=gesture,
            confidence=confidence,
            tilt=tilt,
            label=label,
            movement=movement,
            position=position,
        )
