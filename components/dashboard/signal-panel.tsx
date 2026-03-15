"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/store/use-app-store";

export function SignalPanel() {
  const engine = useAppStore((state) => state.engine);

  const readiness = [
    ["Camera Deck", engine.cameraReady],
    ["Mic Channel", engine.micReady],
    ["Master Out", engine.outputReady],
    ["Record Arm", engine.isRecording]
  ] as const;

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.15 }}
      className="dj-panel p-5"
    >
      <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">System Rack</p>
      <h2 className="mt-2 font-display text-2xl text-white">Patch Bay</h2>

      <div className="mt-5 space-y-3">
        {readiness.map(([label, active]) => (
          <div key={label} className="rounded-[24px] border border-white/10 bg-[#0f1118] px-4 py-4">
            <div className="flex items-center justify-between gap-4">
              <p className="text-sm uppercase tracking-[0.24em] text-white/55">{label}</p>
              <span
                className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.26em] ${
                  active ? "border border-[#62ffd9]/30 bg-[#62ffd9]/10 text-[#9bffea]" : "border border-white/10 bg-white/5 text-white/45"
                }`}
              >
                {active ? "online" : "standby"}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-[26px] border border-[#ff7a18]/20 bg-[linear-gradient(180deg,rgba(255,122,24,0.1),rgba(255,122,24,0.04))] p-4">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#ffb06b]">Runtime Notes</p>
        <div className="mt-3 space-y-2 text-sm leading-6 text-white/78">
          {engine.errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
