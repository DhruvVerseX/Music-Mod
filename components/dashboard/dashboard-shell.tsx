"use client";

import dynamic from "next/dynamic";
import { useRef } from "react";
import { motion } from "framer-motion";
import { ControlPanel } from "@/components/dashboard/control-panel";
import { EffectPanel } from "@/components/dashboard/effect-panel";
import { LiveStats } from "@/components/dashboard/live-stats";
import { GestureLegend } from "@/components/dashboard/gesture-legend";
import { useAudioEngine } from "@/hooks/use-audio-engine";
import { useGestureTracking } from "@/hooks/use-gesture-tracking";

const CameraStage = dynamic(
  () => import("@/components/dashboard/camera-stage").then((mod) => mod.CameraStage),
  {
    ssr: false
  }
);

export function DashboardShell() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useAudioEngine();
  useGestureTracking({ videoRef, canvasRef });

  return (
    <main className="relative min-h-screen overflow-hidden">
      <div className="grid-bg absolute inset-0 opacity-25" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(110,231,183,0.08),transparent_34%)]" />

      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="panel flex flex-col gap-6 overflow-hidden p-6 lg:flex-row lg:items-end lg:justify-between"
        >
          <div className="max-w-2xl">
            <p className="mb-3 font-display text-xs uppercase tracking-[0.35em] text-aurora/80">
              Gesture Controlled Vocal Effects
            </p>
            <h1 className="font-display text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Shape voice in mid-air with live hand tracking and low-latency DSP.
            </h1>
          </div>
          <EffectPanel compact />
        </motion.header>

        <ControlPanel />

        <section className="grid flex-1 gap-6 lg:grid-cols-[1.4fr_0.95fr]">
          <CameraStage videoRef={videoRef} canvasRef={canvasRef} />
          <div className="flex flex-col gap-6">
            <LiveStats />
            <GestureLegend />
          </div>
        </section>
      </div>
    </main>
  );
}
