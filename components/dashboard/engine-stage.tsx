"use client";

import { motion } from "framer-motion";
import { EFFECT_DESCRIPTIONS } from "@/lib/constants";
import { useAppStore } from "@/store/use-app-store";

export function EngineStage() {
  const engine = useAppStore((state) => state.engine);

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.1 }}
      className="panel overflow-hidden p-4"
    >
      <div className="relative min-h-[420px] rounded-[28px] border border-white/10 bg-[linear-gradient(140deg,rgba(8,18,35,0.95),rgba(14,23,45,0.82)),radial-gradient(circle_at_top,rgba(110,231,183,0.18),transparent_36%)] p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-mist/70">Live Engine</p>
            <h2 className="mt-2 font-display text-4xl capitalize text-white">{engine.effect}</h2>
          </div>
          <div className="rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs uppercase tracking-[0.3em] text-flare">
            {engine.gesture.label}
          </div>
        </div>

        <p className="mt-4 max-w-2xl text-sm leading-7 text-mist/75">{EFFECT_DESCRIPTIONS[engine.effect]}</p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <EngineCard label="Gesture" value={engine.gesture.gesture} />
          <EngineCard label="Movement" value={engine.gesture.movement} />
          <EngineCard label="Hand Zone" value={`${engine.gesture.position.horizontal}-${engine.gesture.position.vertical}`} />
          <EngineCard label="Confidence" value={`${Math.round(engine.gesture.confidence * 100)}%`} />
        </div>

        <div className="mt-10 rounded-[26px] border border-white/10 bg-black/25 p-5">
          <div className="flex items-center justify-between gap-4">
            <p className="text-xs uppercase tracking-[0.3em] text-mist/60">Audio Path</p>
            <span className="text-xs uppercase tracking-[0.28em] text-signal">Mic → Python DSP → Earpiece</span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-5">
            {["Mic", "Pitch", engine.effect, "Spatial FX", "Output"].map((item) => (
              <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-center text-sm text-white">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.section>
  );
}

function EngineCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
      <p className="text-[11px] uppercase tracking-[0.28em] text-mist/55">{label}</p>
      <p className="mt-3 text-xl font-semibold capitalize text-white">{value}</p>
    </div>
  );
}
