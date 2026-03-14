from __future__ import annotations

from schemas import Frame, PoseFeatures


class PoseModel:
    def predict(self, frame: Frame) -> PoseFeatures:
        wrist = frame.landmarks[0]
        openness = self._estimate_openness(frame)
        tilt = round(((frame.landmarks[5].x + frame.landmarks[17].x) / 2) - wrist.x, 3)

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

        return PoseFeatures(
            openness=openness,
            tilt=tilt,
            horizontal=horizontal,
            vertical=vertical,
        )

    def _estimate_openness(self, frame: Frame) -> float:
        fingertip_ids = [4, 8, 12, 16, 20]
        distances = []
        wrist = frame.landmarks[0]
        for index in fingertip_ids:
            tip = frame.landmarks[index]
            distances.append(abs(tip.x - wrist.x) + abs(tip.y - wrist.y))
        return round(sum(distances) / len(distances), 3)
