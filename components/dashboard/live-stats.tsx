"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/store/use-app-store";

export function LiveStats() {
  const engine = useAppStore((state) => state.engine);

  const stats = [
    { label: "Input Level", value: `${Math.round(engine.metrics.inputLevel * 100)}%` },
    { label: "Output Level", value: `${Math.round(engine.metrics.outputLevel * 100)}%` },
    { label: "Pitch", value: `${Math.round(engine.metrics.pitchHz)} Hz` },
    { label: "Latency", value: `${Math.round(engine.metrics.latencyMs)} ms` },
    { label: "Tilt", value: `${engine.gesture.tilt > 0 ? "+" : ""}${engine.gesture.tilt.toFixed(2)}` },
    { label: "Recording", value: engine.isRecording ? "Active" : "Standby" }
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.2 }}
      className="panel p-5"
    >
      <p className="text-xs uppercase tracking-[0.3em] text-mist/70">Telemetry</p>
      <h2 className="mt-2 font-display text-3xl text-white">DSP metrics</h2>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-[22px] border border-white/10 bg-black/20 p-4">
            <p className="text-[11px] uppercase tracking-[0.28em] text-mist/55">{stat.label}</p>
            <p className="mt-3 text-xl font-semibold text-white">{stat.value}</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
