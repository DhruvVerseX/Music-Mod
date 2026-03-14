"use client";

import { useEffect, useRef } from "react";
import { AudioEngine } from "@/lib/audio/audio-engine";
import { useAppStore } from "@/store/use-app-store";

export function useAudioEngine() {
  const engineRef = useRef<AudioEngine | null>(null);
  const {
    systemArmed,
    gesture,
    audioEffect,
    setAudioStatus,
    setMicReady,
    setMicPermission,
    setAudioError,
    setRecording,
    setAudioMetrics,
    setSessionStatus
  } = useAppStore();

  useEffect(() => {
    if (!systemArmed) {
      engineRef.current?.dispose();
      engineRef.current = null;
      setAudioStatus("idle");
      setMicReady(false);
      return;
    }

    const engine = new AudioEngine({
      onStatus: (status) => {
        setAudioStatus(status);
        setMicReady(status === "ready");
        setMicPermission(status === "error" ? "denied" : status === "ready" ? "granted" : "pending");
        if (status === "ready") {
          setAudioError(undefined);
          setSessionStatus("live");
        }
      },
      onMetrics: setAudioMetrics,
      onRecording: setRecording,
      onPermissionError: setAudioError
    });

    engineRef.current = engine;
    void engine.initialize();

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, [
    setAudioError,
    setAudioMetrics,
    setAudioStatus,
    setMicPermission,
    setMicReady,
    setRecording,
    setSessionStatus,
    systemArmed
  ]);

  useEffect(() => {
    engineRef.current?.updateFromGesture(gesture, audioEffect);
  }, [audioEffect, gesture]);
}
