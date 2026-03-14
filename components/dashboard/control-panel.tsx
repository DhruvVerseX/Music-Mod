"use client";

import { motion } from "framer-motion";
import { useAppStore } from "@/store/use-app-store";

export function ControlPanel() {
  const {
    systemArmed,
    sessionStatus,
    cameraPermission,
    micPermission,
    cameraReady,
    micReady,
    armSystem,
    disarmSystem
  } = useAppStore();

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.12 }}
      className="panel p-5"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <p className="text-xs uppercase tracking-[0.3em] text-mist/70">Session Control</p>
          <h2 className="mt-2 font-display text-3xl text-white">Start the rig deliberately</h2>
          <p className="mt-3 text-sm leading-6 text-mist/75">
            Browsers usually block camera, mic, and audio output until you trigger them from a click. Arm the system,
            accept the permission prompts, then use your gestures in frame.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={systemArmed ? disarmSystem : armSystem}
            className="rounded-full border border-signal/30 bg-signal/10 px-5 py-3 text-sm font-medium text-signal transition hover:bg-signal/20"
          >
            {systemArmed ? "Disarm system" : "Enable camera + mic"}
          </button>
        </div>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-4">
        <Card label="Session" value={sessionStatus} />
        <Card label="Camera" value={cameraReady ? "live" : cameraPermission} />
        <Card label="Microphone" value={micReady ? "live" : micPermission} />
        <Card label="Ready" value={cameraReady && micReady ? "perform" : "awaiting"} />
      </div>
    </motion.section>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
      <p className="text-[11px] uppercase tracking-[0.28em] text-mist/55">{label}</p>
      <p className="mt-3 text-xl font-semibold capitalize text-white">{value}</p>
    </div>
  );
}
