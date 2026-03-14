"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/store/use-app-store";

export function SignalPanel() {
  const engine = useAppStore((state) => state.engine);

  const readiness = [
    ["Camera", engine.cameraReady],
    ["Microphone", engine.micReady],
    ["Output", engine.outputReady],
    ["Recorder", engine.isRecording]
  ] as const;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.15 }}
      className="panel p-5"
    >
      <p className="text-xs uppercase tracking-[0.3em] text-mist/70">Engine Signals</p>
      <h2 className="mt-2 font-display text-3xl text-white">Backend readiness</h2>

      <div className="mt-6 space-y-3">
        {readiness.map(([label, active]) => (
          <div key={label} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm uppercase tracking-[0.24em] text-mist/65">{label}</p>
              <span className={`rounded-full px-3 py-1 text-xs uppercase tracking-[0.24em] ${active ? "bg-signal/10 text-signal" : "bg-white/8 text-mist/70"}`}>
                {active ? "ready" : "idle"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[24px] border border-red-400/20 bg-red-500/8 p-4">
        <p className="text-xs uppercase tracking-[0.28em] text-red-100/70">Runtime Notes</p>
        <div className="mt-3 space-y-2 text-sm leading-6 text-red-50">
          {engine.errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
