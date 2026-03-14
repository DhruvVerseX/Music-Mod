from __future__ import annotations

from engine.audio_processor import AudioProcessor
from engine.gesture_tracker import GestureTracker
from engine.state import SharedState


class VocalEngineRuntime:
    def __init__(self) -> None:
        self.state = SharedState()
        self.audio = AudioProcessor(self.state)
        self.gesture = GestureTracker(self.state)

    def start(self) -> None:
        with self.state.lock:
            self.state.status = "connecting"
            self.state.clear_errors()

        try:
            self.audio.start()
            self.gesture.start()
            with self.state.lock:
                self.state.status = "running"
                if not self.state.errors:
                    self.state.errors = ["Use headphones or an earpiece to avoid feedback."]
        except Exception as exc:
            self.state.set_error(f"Engine start failed: {exc}")

    def stop(self) -> None:
        self.gesture.stop()
        self.audio.stop()
        with self.state.lock:
            self.state.status = "idle"
            self.state.effect = "idle"
            self.state.errors = ["Engine stopped."]
