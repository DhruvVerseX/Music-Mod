from __future__ import annotations

from dataclasses import dataclass, field
from threading import RLock

from schemas import AudioMetrics, EngineState, GestureSnapshot, HandPosition


def default_gesture() -> GestureSnapshot:
    return GestureSnapshot(
        gesture="none",
        confidence=0.0,
        tilt=0.0,
        label="Idle",
        movement="still",
        position=HandPosition(horizontal="center", vertical="mid"),
    )


def default_metrics() -> AudioMetrics:
    return AudioMetrics(
        inputLevel=0.0,
        outputLevel=0.0,
        pitchHz=0.0,
        latencyMs=0.0,
    )


@dataclass
class SharedState:
    status: str = "idle"
    camera_ready: bool = False
    mic_ready: bool = False
    output_ready: bool = False
    is_recording: bool = False
    effect: str = "idle"
    gesture: GestureSnapshot = field(default_factory=default_gesture)
    metrics: AudioMetrics = field(default_factory=default_metrics)
    errors: list[str] = field(default_factory=lambda: ["Engine idle. Start session from the dashboard."])
    backend_version: str = "python-engine-0.2.0"
    lock: RLock = field(default_factory=RLock)

    def snapshot(self) -> EngineState:
        with self.lock:
            return EngineState(
                status=self.status,
                cameraReady=self.camera_ready,
                micReady=self.mic_ready,
                outputReady=self.output_ready,
                isRecording=self.is_recording,
                effect=self.effect,
                gesture=self.gesture,
                metrics=self.metrics,
                errors=list(self.errors),
                backendVersion=self.backend_version,
            )

    def set_error(self, message: str) -> None:
        with self.lock:
            if message not in self.errors:
                self.errors.append(message)
            self.status = "error"

    def clear_errors(self) -> None:
        with self.lock:
            self.errors = []
