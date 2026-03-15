from __future__ import annotations

from engine.audio_processor import AudioProcessor
from engine.state import SharedState


class VocalEngineRuntime:
    def __init__(self) -> None:
        self.state = SharedState()
        self.audio = AudioProcessor(self.state)

    def start(self) -> None:
        self.state.clear_errors()
        with self.state.lock:
            self.state.status = "connecting"

        try:
            self.audio.start()
            with self.state.lock:
                self.state.status = "running"
                if not self.state.errors:
                    self.state.errors = ["Use headphones or an earpiece to avoid feedback.", "Browser hand tracking is active."]
        except Exception as exc:
            self.state.set_error(f"Engine start failed: {exc}")

    def stop(self) -> None:
        self.audio.stop()
        with self.state.lock:
            self.state.status = "idle"
            self.state.effect = "idle"
            self.state.camera_ready = False
            self.state.errors = ["Engine stopped."]
