from __future__ import annotations

import threading
import time
from collections import deque

import cv2
import mediapipe as mp

from engine.state import SharedState
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
        cap = cv2.VideoCapture(0)
        if not cap.isOpened():
            self.state.set_error("Python camera capture failed to open.")
            return

        hands = mp.solutions.hands.Hands(
            static_image_mode=False,
            max_num_hands=1,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.6,
        )

        with self.state.lock:
            self.state.camera_ready = True

        try:
            while not self._stop.is_set():
                ok, frame = cap.read()
                if not ok:
                    time.sleep(0.02)
                    continue

                rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
                results = hands.process(rgb)
                landmarks = results.multi_hand_landmarks[0].landmark if results.multi_hand_landmarks else None

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

                time.sleep(0.01)
        finally:
            hands.close()
            cap.release()
            with self.state.lock:
                self.state.camera_ready = False
