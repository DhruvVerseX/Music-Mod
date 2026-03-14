from __future__ import annotations

from typing import Sequence

from schemas import HandPosition


class PoseModel:
    def predict(
        self,
        landmarks: Sequence[object],
    ) -> tuple[float, float, HandPosition]:
        wrist = landmarks[0]
        openness = self._estimate_openness(landmarks)
        tilt = round(((landmarks[5].x + landmarks[17].x) / 2.0) - wrist.x, 3)

        horizontal = "center"
        if wrist.x < 0.38:
            horizontal = "left"
        elif wrist.x > 0.62:
            horizontal = "right"

        vertical = "mid"
        if wrist.y < 0.33:
            vertical = "high"
        elif wrist.y > 0.68:
            vertical = "low"

        return openness, tilt, HandPosition(horizontal=horizontal, vertical=vertical)

    def _estimate_openness(self, landmarks: Sequence[object]) -> float:
        fingertip_ids = [4, 8, 12, 16, 20]
        wrist = landmarks[0]
        distances: list[float] = []

        for idx in fingertip_ids:
            tip = landmarks[idx]
            distances.append(abs(tip.x - wrist.x) + abs(tip.y - wrist.y))

        return round(sum(distances) / len(distances), 3)
