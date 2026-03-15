"use client";

import { motion } from "framer-motion";
import { ControlPanel } from "@/components/dashboard/control-panel";
import { EngineStage } from "@/components/dashboard/engine-stage";
import { GestureLegend } from "@/components/dashboard/gesture-legend";
import { LiveStats } from "@/components/dashboard/live-stats";
import { SignalPanel } from "@/components/dashboard/signal-panel";
import { useEngineSession } from "@/hooks/use-engine-session";
import { useAppStore } from "@/store/use-app-store";

export function DashboardShell() {
  useEngineSession();
  const engine = useAppStore((state) => state.engine);

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#08090d] text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,101,36,0.14),transparent_24%),radial-gradient(circle_at_bottom_left,rgba(98,255,217,0.1),transparent_30%),linear-gradient(180deg,#090a0f_0%,#11131a_52%,#07080d_100%)]" />
      <div className="dj-grid absolute inset-0 opacity-35" />

      <div className="relative mx-auto flex min-h-screen max-w-[1500px] flex-col gap-6 px-4 py-5 sm:px-6 xl:px-8">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="dj-panel overflow-hidden px-5 py-4"
        >
          <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <span className="rounded-full border border-[#ff7a18]/30 bg-[#ff7a18]/10 px-3 py-1 text-[10px] uppercase tracking-[0.34em] text-[#ffb06b]">
                  Live DJ Rig
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.32em] text-white/60">
                  {engine.status}
                </span>
              </div>
              <div>
                <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-5xl">
                  Gesture Deck
                </h1>
                <p className="mt-2 max-w-3xl text-sm leading-7 text-white/65 sm:text-base">
                  Left deck tracks your hand and camera. Right deck reacts to your microphone like a live vocal rack.
                  Move between palm, fist, and motion cues to switch the sound while you monitor the waveform in real time.
                </p>
              </div>
            </div>
            <ControlPanel />
          </div>
        </motion.header>

        <section className="grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
          <EngineStage />
          <LiveStats />
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.74fr_0.56fr_0.7fr]">
          <SignalPanel />
          <GestureLegend />
          <MixerStrip />
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
      className="dj-panel p-5"
    >
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">Mixer Strip</p>
          <h2 className="mt-2 font-display text-2xl text-white">Deck Meters</h2>
        </div>
        <div className="rounded-full border border-[#62ffd9]/20 bg-[#62ffd9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.28em] text-[#8fffe4]">
          {engine.effect}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-4 gap-4">
        {strips.map((strip) => (
          <div key={strip.label} className="rounded-[24px] border border-white/10 bg-[#0f1118] p-3">
            <div className="flex h-44 items-end justify-center rounded-[20px] border border-white/8 bg-[linear-gradient(180deg,#141824_0%,#090b11_100%)] p-2">
              <div className="meter-rail h-full w-10 rounded-full bg-black/50 p-1">
                <div
                  className="w-full rounded-full bg-[linear-gradient(180deg,#62ffd9_0%,#ff7a18_100%)] transition-all duration-150"
                  style={{ height: `${Math.max(10, strip.height * 100)}%`, marginTop: "auto" }}
                />
              </div>
            </div>
            <p className="mt-3 text-[11px] uppercase tracking-[0.26em] text-white/45">{strip.label}</p>
            <p className="mt-2 text-sm font-semibold uppercase text-white">{strip.value}</p>
          </div>
        ))}
      </div>
    </motion.section>
  );
}
