from __future__ import annotations

from typing import Literal

from pydantic import BaseModel


GestureType = Literal["none", "palm", "fist", "two-finger", "love-you"]
EffectType = Literal["idle", "vocoder", "autotune", "talkbox", "recording"]
EngineStatus = Literal["offline", "connecting", "idle", "running", "error"]
MovementDirection = Literal["still", "left", "right", "up", "down"]


class HandPosition(BaseModel):
    horizontal: Literal["left", "center", "right"]
    vertical: Literal["high", "mid", "low"]


class GestureSnapshot(BaseModel):
    gesture: GestureType
    confidence: float
    tilt: float
    label: str
    movement: MovementDirection
    position: HandPosition


class AudioMetrics(BaseModel):
    inputLevel: float
    outputLevel: float
    pitchHz: float
    latencyMs: float


class EngineState(BaseModel):
    status: EngineStatus
    cameraReady: bool
    micReady: bool
    outputReady: bool
    isRecording: bool
    effect: EffectType
    gesture: GestureSnapshot
    metrics: AudioMetrics
    errors: list[str]
    backendVersion: str
