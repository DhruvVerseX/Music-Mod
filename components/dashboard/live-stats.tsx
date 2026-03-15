"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/store/use-app-store";

export function LiveStats() {
  const engine = useAppStore((state) => state.engine);

  const waveform = Array.from({ length: 40 }, (_, index) => {
    const seed = index % 2 === 0 ? engine.metrics.inputLevel : engine.metrics.outputLevel;
    const swing = (Math.sin(index * 0.6 + engine.metrics.pitchHz / 120) + 1) / 2;
    return Number(Math.max(0.08, Math.min(1, seed * 1.4 + swing * 0.45)).toFixed(2));
  });

  const pads = [
    { label: "Input", value: `${Math.round(engine.metrics.inputLevel * 100)}%`, tone: "border-[#62ffd9]/30 bg-[#62ffd9]/10 text-[#95ffe8]" },
    { label: "Output", value: `${Math.round(engine.metrics.outputLevel * 100)}%`, tone: "border-[#ff7a18]/30 bg-[#ff7a18]/10 text-[#ffb06b]" },
    { label: "Pitch", value: `${Math.round(engine.metrics.pitchHz)} hz`, tone: "border-white/15 bg-white/5 text-white" },
    { label: "Latency", value: `${Math.round(engine.metrics.latencyMs)} ms`, tone: "border-white/15 bg-white/5 text-white" }
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.12 }}
      className="dj-panel p-5"
    >
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">Mic Deck</p>
          <h2 className="mt-2 font-display text-3xl text-white">Wave Monitor</h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-white/60">
            This deck behaves like a vocal channel strip. Talk into the mic and watch the live bars jump while the
            active effect deck switches with your hand movement.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:min-w-[320px]">
          {pads.map((pad) => (
            <div key={pad.label} className={`rounded-[20px] border px-4 py-3 ${pad.tone}`}>
              <p className="text-[10px] uppercase tracking-[0.3em] opacity-70">{pad.label}</p>
              <p className="mt-2 text-lg font-semibold uppercase">{pad.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,#11141d_0%,#090b11_100%)] p-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-3 w-3 rounded-full bg-[#ff7a18]" />
            <span className="text-[10px] uppercase tracking-[0.34em] text-white/45">Record Bus</span>
          </div>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-white/60">
            {engine.isRecording ? "Recording Armed" : "Live Pass"}
          </span>
        </div>

        <div className="mt-6 flex h-64 items-end gap-2 rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(255,255,255,0.02),rgba(255,255,255,0.01))] px-4 py-5">
          {waveform.map((value, index) => (
            <div key={index} className="flex h-full flex-1 items-end">
              <div
                className="w-full rounded-full bg-[linear-gradient(180deg,#62ffd9_0%,#0cf3b3_35%,#ff7a18_100%)] shadow-[0_0_24px_rgba(98,255,217,0.12)] transition-[height] duration-100"
                style={{ height: `${Math.max(10, Number((value * 100).toFixed(2)))}%` }}
              />
            </div>
          ))}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <DeckReadout label="Current Effect" value={engine.effect} />
          <DeckReadout label="Gesture Gate" value={engine.gesture.label} />
          <DeckReadout label="Tracking Confidence" value={`${Math.round(engine.gesture.confidence * 100)}%`} />
        </div>
      </div>
    </motion.section>
  );
}

function DeckReadout({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3">
      <p className="text-[10px] uppercase tracking-[0.28em] text-white/45">{label}</p>
      <p className="mt-2 text-base font-semibold uppercase text-white">{value}</p>
    </div>
  );
}
