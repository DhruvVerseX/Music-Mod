"use client";

import { motion } from "framer-motion";
import { ControlPanel } from "@/components/dashboard/control-panel";
import { EngineStage } from "@/components/dashboard/engine-stage";
import { GestureLegend } from "@/components/dashboard/gesture-legend";
import { LiveStats } from "@/components/dashboard/live-stats";
import { SignalPanel } from "@/components/dashboard/signal-panel";
import { HardwareRack } from "@/components/dashboard/hardware-rack";
import { useEngineSession } from "@/hooks/use-engine-session";
import { useAppStore } from "@/store/use-app-store";

export function DashboardShell() {
  useEngineSession();
  const engine = useAppStore((state) => state.engine);

  return (
    <main className="relative min-h-screen bg-[#030507] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(98,255,217,0.15),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(255,122,24,0.18),transparent_40%),linear-gradient(180deg,#05070b_0%,#07090f_60%,#030507_100%)]" />
      <div className="absolute inset-0 bg-grid opacity-10" />

      <div className="relative mx-auto flex max-w-[1500px] flex-col gap-4 px-4 py-5 sm:px-6 xl:px-8">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(13,16,23,0.95),rgba(3,4,7,0.85))] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-3xl"
        >
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-[0.46em] text-[#62ffd9]/70">Gesture Deck</p>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">Live Deck Studio</h1>
                <span className="rounded-full border border-[#62ffd9]/30 bg-[#62ffd9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.32em] text-[#a7ffee]">
                  {engine.status}
                </span>
              </div>
              <p className="max-w-2xl text-sm leading-6 text-white/70">
                Focused camera + vocal deck. Combines your live feed, vocal monitor, and recorder without scrolling.
              </p>
            </div>
            <ControlPanel />
          </div>
        </motion.header>

        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <section className="flex flex-col rounded-[36px] border border-white/10 bg-black/60 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.45)] backdrop-blur-xl">
            <EngineStage />
          </section>
          <section className="flex flex-col rounded-[36px] border border-white/10 bg-black/55 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.4)] backdrop-blur-xl">
            <LiveStats />
          </section>
        </div>

        <div className="grid min-h-0 gap-4 lg:grid-cols-[0.7fr_0.7fr_0.6fr]">
          <SignalPanel />
          <GestureLegend />
          <MixerStrip />
        </div>

        <section className="mt-2">
          <HardwareRack />
        </section>
      </div>
    </main>
  );
}

function MixerStrip() {
  const engine = useAppStore((state) => state.engine);

  const strips = [
    { label: "Input Gain", value: `${Math.round(engine.metrics.inputLevel * 100)}%`, height: engine.metrics.inputLevel },
    { label: "Pitch Sense", value: `${Math.round(engine.metrics.pitchHz)} Hz`, height: Math.min(engine.metrics.pitchHz / 420, 1) },
    { label: "Motion", value: engine.gesture.movement, height: Math.min(engine.gesture.confidence, 1) },
    { label: "Output", value: `${Math.round(engine.metrics.outputLevel * 100)}%`, height: engine.metrics.outputLevel }
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.18 }}
      className="dj-panel p-4"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">Mixer Strip</p>
          <h2 className="mt-1 font-display text-xl text-white">Deck Meters</h2>
        </div>
        <div className="rounded-full border border-[#62ffd9]/20 bg-[#62ffd9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-[#8fffe4]">
          {engine.effect}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-3">
        {strips.map((strip) => (
          <div key={strip.label} className="rounded-[20px] border border-white/10 bg-[#0f1118] p-3">
            <div className="flex h-32 items-end justify-center rounded-[18px] border border-white/8 bg-[linear-gradient(180deg,#141824_0%,#090b11_100%)] p-2">
              <div className="meter-rail h-full w-8 rounded-full bg-black/50 p-1">
                <div
                  className="w-full rounded-full bg-[linear-gradient(180deg,#62ffd9_0%,#ff7a18_100%)] transition-all duration-150"
                  style={{ height: `${Math.max(10, strip.height * 100)}%`, marginTop: "auto" }}
                />
              </div>
            </div>
            <p className="mt-2 text-[10px] uppercase tracking-[0.22em] text-white/45">{strip.label}</p>
            <p className="mt-1 text-xs font-semibold uppercase text-white">{strip.value}</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
