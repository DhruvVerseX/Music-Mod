"use client";

import { useEffect, useRef } from "react";
import { AudioEngine } from "@/lib/audio/audio-engine";
import { useAppStore } from "@/store/use-app-store";

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const {
    gesture,
    audioEffect,
    setAudioStatus,
    setMicReady,
    setPermissionError,
    setRecording,
    setAudioMetrics
  } = useAppStore();

  useEffect(() => {
    const engine = new AudioEngine({
      onStatus: (status) => {
        setAudioStatus(status);
        setMicReady(status === "ready");
      },
      onMetrics: setAudioMetrics,
      onRecording: setRecording,
      onPermissionError: setPermissionError
    });

    engineRef.current = engine;
    void engine.initialize();

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [setAudioMetrics, setAudioStatus, setMicReady, setPermissionError, setRecording]);

  useEffect(() => {
    engineRef.current?.updateFromGesture(gesture, audioEffect);
  }, [audioEffect, gesture]);
}
