from __future__ import annotations

import os
import threading
import time
from collections import deque
from pathlib import Path

import cv2
import mediapipe as mp
from mediapipe.tasks.python import vision
from mediapipe.tasks.python.core.base_options import BaseOptions
from mediapipe.tasks.python.vision.core.vision_task_running_mode import VisionTaskRunningMode

from engine.state import SharedState
from engine.state import default_gesture
from models.motion_model import MotionModel
from models.pose_model import PoseModel
from models.sequence_model import SequenceModel


class GestureTracker:
    def __init__(self, state: SharedState) -> None:
        self.state = state
        self._stop = threading.Event()
        self._thread: threading.Thread | None = None
        self._history: deque[tuple[float, float]] = deque(maxlen=8)
        self._pose_model = PoseModel()
        self._motion_model = MotionModel()
        self._sequence_model = SequenceModel()

    def start(self) -> None:
        if self._thread and self._thread.is_alive():
            return
        self._stop.clear()
        self._thread = threading.Thread(target=self._run, daemon=True)
        self._thread.start()

    def stop(self) -> None:
        self._stop.set()
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=2)

    def _run(self) -> None:
        cap, selected_camera = self._open_camera()
        if cap is None or selected_camera is None:
            self.state.set_error("Python camera capture failed to open. Tried indices 0-4 on DirectShow and default backends.")
            return

        hands = self._create_hand_tracker()
        if hands is None:
            cap.release()
            return

        with self.state.lock:
            self.state.camera_ready = True
            self._replace_camera_message(f"Camera connected on index {selected_camera[0]} via {selected_camera[1]}.")

        try:
            while not self._stop.is_set():
                ok, frame = cap.read()
                if not ok:
                    time.sleep(0.02)
                    continue

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
                timestamp_ms = int(time.monotonic() * 1000)
                results = hands.detect_for_video(mp_image, timestamp_ms)
                landmarks = results.hand_landmarks[0] if results.hand_landmarks else None

                if landmarks:
                    openness, tilt, position = self._pose_model.predict(landmarks)
                    self._history.append((landmarks[0].x, landmarks[0].y))
                    movement, _speed = self._motion_model.predict(list(self._history))
                    effect, gesture = self._sequence_model.predict(openness, tilt, movement, position)
                    with self.state.lock:
                        self.state.effect = effect
                        self.state.gesture = gesture
                        self.state.is_recording = effect == "recording"
                else:
                    with self.state.lock:
                        self.state.effect = "idle"
                        self.state.gesture = default_gesture()
                        self.state.is_recording = False

                time.sleep(0.01)
        except Exception as exc:
            self.state.set_error(f"Camera processing failed: {exc}")
        finally:
            hands.close()
            cap.release()
            with self.state.lock:
                self.state.camera_ready = False

    def _open_camera(self) -> tuple[cv2.VideoCapture | None, tuple[int, str] | None]:
        configured_index = os.getenv("ENGINE_CAMERA_INDEX")
        configured_backend = os.getenv("ENGINE_CAMERA_BACKEND", "").strip().upper()

        backends: list[tuple[str, int]] = []
        if configured_backend == "DSHOW":
            backends.append(("DSHOW", cv2.CAP_DSHOW))
        elif configured_backend == "MSMF":
            backends.append(("MSMF", cv2.CAP_MSMF))
        elif configured_backend == "ANY":
            backends.append(("ANY", cv2.CAP_ANY))

        for fallback in [("DSHOW", cv2.CAP_DSHOW), ("ANY", cv2.CAP_ANY), ("MSMF", cv2.CAP_MSMF)]:
            if fallback not in backends:
                backends.append(fallback)

        indices = [int(configured_index)] if configured_index and configured_index.isdigit() else list(range(5))

        for backend_name, backend in backends:
            for index in indices:
                cap = cv2.VideoCapture(index, backend)
                if not cap.isOpened():
                    cap.release()
                    continue

                ok, _frame = cap.read()
                if ok:
                    return cap, (index, backend_name)

                cap.release()

        return None, None

    def _replace_camera_message(self, message: str) -> None:
        retained = [
            error
            for error in self.state.errors
            if not error.startswith("Python camera capture failed to open.")
            and not error.startswith("Camera connected on index ")
        ]
        retained.append(message)
        self.state.errors = retained

    def _create_hand_tracker(self):
        model_path = Path(__file__).resolve().parent.parent / "models" / "hand_landmarker.task"
        if not model_path.exists():
            self.state.set_error(f"MediaPipe hand model missing at {model_path}.")
            return None

        options = vision.HandLandmarkerOptions(
            base_options=BaseOptions(model_asset_path=str(model_path)),
            running_mode=VisionTaskRunningMode.VIDEO,
            num_hands=1,
            min_hand_detection_confidence=0.7,
            min_hand_presence_confidence=0.6,
            min_tracking_confidence=0.6,
        )
        return vision.HandLandmarker.create_from_options(options)
