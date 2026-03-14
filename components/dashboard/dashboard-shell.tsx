"use client";

import { motion } from "framer-motion";
import { ControlPanel } from "@/components/dashboard/control-panel";
import { EngineStage } from "@/components/dashboard/engine-stage";
import { GestureLegend } from "@/components/dashboard/gesture-legend";
import { LiveStats } from "@/components/dashboard/live-stats";
import { SignalPanel } from "@/components/dashboard/signal-panel";
import { useEngineSession } from "@/hooks/use-engine-session";

export function DashboardShell() {
  useEngineSession();

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="grid-bg absolute inset-0 opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(125,211,252,0.16),transparent_26%),radial-gradient(circle_at_bottom_right,rgba(255,138,91,0.18),transparent_28%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="panel overflow-hidden p-6"
        >
          <p className="font-display text-xs uppercase tracking-[0.35em] text-aurora/80">Python Vocal Engine</p>
          <div className="mt-4 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <h1 className="font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                Local camera, mic, gesture inference, and speaker monitoring driven by Python.
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-mist/75">
                The browser is now only a control surface. The Python engine owns microphone monitoring to your
                earpiece, hand tracking, and real-time voice modulation for vocoder, autotune, talkbox, and recording.
              </p>
            </div>
            <ControlPanel />
          </div>
        </motion.header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <EngineStage />
          <SignalPanel />
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <LiveStats />
          <GestureLegend />
        </section>
      </div>
    </main>
  );
}
