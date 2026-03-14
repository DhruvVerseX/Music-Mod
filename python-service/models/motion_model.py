from __future__ import annotations

from typing import Sequence


class MotionModel:
    def predict(self, history: Sequence[tuple[float, float]]) -> tuple[str, float]:
        if len(history) < 2:
            return "still", 0.0

        first_x, first_y = history[0]
        last_x, last_y = history[-1]
        delta_x = last_x - first_x
        delta_y = last_y - first_y
        speed = round(abs(delta_x) + abs(delta_y), 3)

        if speed < 0.03:
            return "still", speed

        if abs(delta_x) > abs(delta_y):
            return ("right" if delta_x > 0 else "left"), speed

        return ("down" if delta_y > 0 else "up"), speed
