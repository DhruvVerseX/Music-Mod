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
      className="relative flex flex-col gap-4 rounded-[28px] border border-white/10 bg-[linear-gradient(145deg,rgba(19,28,39,0.85),rgba(8,10,15,0.9))] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
    >
      <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">System Rack</p>
      <h2 className="mt-1 font-display text-xl text-white">Patch Bay</h2>

      <div className="flex flex-1 flex-col gap-2">
        {readiness.map(([label, active]) => (
          <div key={label} className="rounded-[18px] border border-white/10 bg-[rgba(15,17,24,0.65)] px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <p className="text-xs uppercase tracking-[0.22em] text-white/55">{label}</p>
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

      <div className="rounded-[20px] border border-[#ff7a18]/20 bg-[linear-gradient(180deg,rgba(255,122,24,0.12),rgba(255,122,24,0.04))] p-3">
        <p className="text-[10px] uppercase tracking-[0.28em] text-[#ffb06b]">Runtime Notes</p>
        <div className="mt-2 space-y-1 text-[11px] leading-5 text-white/78">
          {engine.errors.map((error) => (
            <p key={error}>{error}</p>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
