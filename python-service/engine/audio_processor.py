from __future__ import annotations

import threading
import wave
from collections import deque
from pathlib import Path

import numpy as np
import sounddevice as sd
from scipy.signal import butter, lfilter, lfilter_zi, resample

from engine.state import SharedState


class AudioProcessor:
    def __init__(self, state: SharedState, sample_rate: int = 48000, block_size: int = 1024) -> None:
        self.state = state
        self.sample_rate = sample_rate
        self.block_size = block_size
        self.stream: sd.Stream | None = None
        self.phase = 0.0
        self.recorded_chunks: deque[np.ndarray] = deque()
        self._record_lock = threading.Lock()
        self._bp_b, self._bp_a = butter(2, [500 / (sample_rate / 2), 2400 / (sample_rate / 2)], btype="band")
        self._bp_zi = lfilter_zi(self._bp_b, self._bp_a)

    def start(self) -> None:
        if self.stream is not None:
            return

        self.stream = sd.Stream(
            samplerate=self.sample_rate,
            blocksize=self.block_size,
            channels=1,
            dtype="float32",
            callback=self._callback,
        )
        self.stream.start()
        with self.state.lock:
            self.state.mic_ready = True
            self.state.output_ready = True

    def stop(self) -> None:
        if self.stream is not None:
            self.stream.stop()
            self.stream.close()
            self.stream = None
        self._flush_recording()
        with self.state.lock:
            self.state.mic_ready = False
            self.state.output_ready = False
            self.state.is_recording = False

    def _callback(self, indata, outdata, frames, time_info, status) -> None:
        signal = np.copy(indata[:, 0])
        processed = self._apply_effect(signal)
        outdata[:, 0] = processed.astype(np.float32)

        with self.state.lock:
            self.state.metrics.inputLevel = float(np.clip(np.sqrt(np.mean(signal ** 2)), 0.0, 1.0))
            self.state.metrics.outputLevel = float(np.clip(np.sqrt(np.mean(processed ** 2)), 0.0, 1.0))
            self.state.metrics.pitchHz = float(self._estimate_pitch(signal))
            self.state.metrics.latencyMs = round((frames / self.sample_rate) * 1000, 1)
            if self.state.is_recording:
                with self._record_lock:
                    self.recorded_chunks.append(processed.copy())

    def _apply_effect(self, signal: np.ndarray) -> np.ndarray:
        with self.state.lock:
            effect = self.state.effect
            tilt = self.state.gesture.tilt

        if effect == "vocoder":
            return self._vocoder(signal, tilt)
        if effect == "autotune":
            return self._autotune(signal, tilt)
        if effect == "talkbox":
            return self._talkbox(signal, tilt)
        if effect == "recording":
            return self._talkbox(signal, tilt * 0.5)
        return np.clip(signal * 0.9, -1.0, 1.0)

    def _vocoder(self, signal: np.ndarray, tilt: float) -> np.ndarray:
        carrier_freq = 120 + (tilt * 240)
        t = (np.arange(signal.size) + self.phase) / self.sample_rate
        carrier = np.sin(2 * np.pi * carrier_freq * t)
        self.phase = (self.phase + signal.size) % self.sample_rate
        modulated = np.tanh(signal * 3.2) * carrier
        return np.clip(0.7 * modulated + 0.25 * signal, -1.0, 1.0)

    def _autotune(self, signal: np.ndarray, tilt: float) -> np.ndarray:
        pitch = self._estimate_pitch(signal)
        if pitch <= 0:
            return signal

        target = self._nearest_scale_pitch(pitch, tilt)
        ratio = np.clip(target / pitch, 0.7, 1.4)
        shifted = self._pitch_shift(signal, ratio)
        return np.clip(0.8 * shifted + 0.2 * signal, -1.0, 1.0)

    def _talkbox(self, signal: np.ndarray, tilt: float) -> np.ndarray:
        filtered, self._bp_zi = lfilter(self._bp_b, self._bp_a, signal, zi=self._bp_zi)
        emphasis = 1.2 + abs(tilt) * 1.8
        return np.clip(np.tanh(filtered * emphasis) + 0.15 * signal, -1.0, 1.0)

    def _pitch_shift(self, signal: np.ndarray, ratio: float) -> np.ndarray:
        if np.isclose(ratio, 1.0):
            return signal
        new_length = max(8, int(len(signal) / ratio))
        shifted = resample(signal, new_length)
        restored = resample(shifted, len(signal))
        return restored.astype(np.float32)

    def _estimate_pitch(self, signal: np.ndarray) -> float:
        centered = signal - np.mean(signal)
        if np.max(np.abs(centered)) < 1e-3:
            return 0.0

        autocorr = np.correlate(centered, centered, mode="full")[len(centered) - 1 :]
        min_lag = int(self.sample_rate / 500)
        max_lag = int(self.sample_rate / 70)
        if max_lag >= autocorr.size:
            return 0.0

        lag = np.argmax(autocorr[min_lag:max_lag]) + min_lag
        return float(self.sample_rate / lag) if lag > 0 else 0.0

    def _nearest_scale_pitch(self, pitch: float, tilt: float) -> float:
        midi = 69 + 12 * np.log2(max(pitch, 1.0) / 440.0)
        scale = np.array([0, 2, 4, 5, 7, 9, 11], dtype=float)
        tonic_offset = -2 if tilt < -0.18 else 2 if tilt > 0.18 else 0
        octave = np.floor(midi / 12.0) * 12.0
        candidates = octave + tonic_offset + scale
        target = candidates[np.argmin(np.abs(candidates - midi))]
        return float(440.0 * (2 ** ((target - 69) / 12)))

    def _flush_recording(self) -> None:
        with self._record_lock:
            if not self.recorded_chunks:
                return

            output_dir = Path("recordings")
            output_dir.mkdir(exist_ok=True)
            path = output_dir / "latest_take.wav"
            full = np.concatenate(list(self.recorded_chunks))
            self.recorded_chunks.clear()

        pcm = np.clip(full * 32767, -32768, 32767).astype(np.int16)
        with wave.open(str(path), "wb") as wav_file:
            wav_file.setnchannels(1)
            wav_file.setsampwidth(2)
            wav_file.setframerate(self.sample_rate)
            wav_file.writeframes(pcm.tobytes())
