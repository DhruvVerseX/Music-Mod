from __future__ import annotations

import math
from typing import Annotated, Literal

from pydantic import BaseModel, Field, field_validator

# Float32 safe range — any value beyond this overflows IEEE 754 single precision.
_FLOAT32_MAX = 3.4028234663852886e38


def _clamp_float(v: float) -> float:
    """Clamp a float to float32-safe range, replacing NaN/Inf with 0."""
    if not math.isfinite(v):
        return 0.0
    return max(-_FLOAT32_MAX, min(_FLOAT32_MAX, v))


class Landmark(BaseModel):
    x: float
    y: float
    z: float

    @field_validator("x", "y", "z", mode="before")
    @classmethod
    def clamp_landmark_values(cls, v: float) -> float:
        return _clamp_float(float(v))


class Frame(BaseModel):
    timestamp: int
    landmarks: list[Landmark]


class InferenceRequest(BaseModel):
    frames: list[Frame] = Field(default_factory=list)
    model_order: list[Literal["pose", "motion", "sequence"]] = Field(
        default_factory=lambda: ["pose", "motion", "sequence"]
    )


class PoseFeatures(BaseModel):
    openness: float
    tilt: float
    horizontal: Literal["left", "center", "right"]
    vertical: Literal["high", "mid", "low"]


class MotionFeatures(BaseModel):
    direction: Literal["still", "left", "right", "up", "down"]
    speed: float


class InferenceResponse(BaseModel):
    gesture: Literal["none", "palm", "fist", "two-finger", "love-you"]
    confidence: float
    tilt: float
    label: str
    movement: Literal["still", "left", "right", "up", "down"]
    position: dict[str, str]
    source: Literal["python-live"]
