from __future__ import annotations

from schemas import Frame, MotionFeatures


class MotionModel:
    def predict(self, frames: list[Frame]) -> MotionFeatures:
        if len(frames) < 2:
            return MotionFeatures(direction="still", speed=0.0)

        first = frames[0].landmarks[0]
        last = frames[-1].landmarks[0]

        delta_x = last.x - first.x
        delta_y = last.y - first.y
        speed = round(abs(delta_x) + abs(delta_y), 3)

        if speed < 0.03:
            return MotionFeatures(direction="still", speed=speed)

        if abs(delta_x) > abs(delta_y):
            return MotionFeatures(direction="right" if delta_x > 0 else "left", speed=speed)

        return MotionFeatures(direction="down" if delta_y > 0 else "up", speed=speed)
