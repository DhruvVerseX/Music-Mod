"use client";

import { motion } from "framer-motion";
import { PROVIDER_LABELS } from "@/lib/constants";
import { useAppStore } from "@/store/use-app-store";

export function LiveStats() {
  const {
    cameraReady,
    micReady,
    cameraPermission,
    micPermission,
    gesture,
    audioMetrics,
    cameraError,
    audioError,
    pythonError,
    pythonProvider,
    isRecording
  } = useAppStore();

  const stats = [
    { label: "Camera", value: cameraReady ? "Live" : cameraPermission },
    { label: "Mic", value: micReady ? "Live" : micPermission },
    { label: "Tilt", value: `${gesture.tilt > 0 ? "+" : ""}${gesture.tilt.toFixed(2)}` },
    { label: "Input", value: `${Math.round(audioMetrics.inputLevel * 100)}%` },
    { label: "Spectral", value: `${audioMetrics.spectralCentroid.toFixed(2)}kHz` },
    { label: "Record", value: isRecording ? "Active" : "Standby" },
    { label: "Move", value: gesture.movement },
    { label: "Zone", value: `${gesture.position.horizontal}-${gesture.position.vertical}` },
    { label: "AI", value: PROVIDER_LABELS[pythonProvider] }
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 22 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.15 }}
      className="panel p-5"
    >
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-mist/70">Live Telemetry</p>
          <h2 className="mt-2 font-display text-3xl text-white">Performance Deck</h2>
        </div>
        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.3em] text-flare">
          {gesture.label}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-mist/55">{stat.label}</p>
            <p className="mt-3 text-xl font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </div>

      {[cameraError, audioError, pythonError].filter(Boolean).map((message) => (
        <div key={message} className="mt-4 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 text-sm text-red-100">
          {message}
        </div>
      ))}
    </motion.section>
  );
}
