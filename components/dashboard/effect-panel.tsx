"use client";

import { motion } from "framer-motion";
import { EFFECT_DESCRIPTIONS, PROVIDER_LABELS } from "@/lib/constants";
import { useAppStore } from "@/store/use-app-store";

interface Props {
  compact?: boolean;
}

export function EffectPanel({ compact = false }: Props) {
  const { audioEffect, gesture, isRecording, audioStatus, pythonProvider, sessionStatus } = useAppStore();

  return (
    <div className={`panel ${compact ? "p-4 lg:max-w-sm" : "hidden p-5 lg:block"}`}>
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-mist/70">Current Mode</p>
          <h2 className="mt-2 font-display text-2xl capitalize text-white">{audioEffect}</h2>
        </div>
        <motion.div
          animate={{
            scale: isRecording ? [1, 1.08, 1] : 1,
            opacity: isRecording ? [0.6, 1, 0.6] : 0.8
          }}
          transition={{ repeat: isRecording ? Number.POSITIVE_INFINITY : 0, duration: 1.1 }}
          className={`h-4 w-4 rounded-full ${isRecording ? "bg-red-400" : "bg-signal"}`}
        />
      </div>
      <p className="mt-3 text-sm leading-6 text-mist/75">{EFFECT_DESCRIPTIONS[audioEffect]}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatusCard label="Gesture" value={gesture.gesture} />
        <StatusCard label="Confidence" value={`${Math.round(gesture.confidence * 100)}%`} />
        <StatusCard label="Engine" value={audioStatus} />
        <StatusCard label="Session" value={sessionStatus} />
        <StatusCard label="Motion" value={gesture.movement} />
        <StatusCard label="Provider" value={PROVIDER_LABELS[pythonProvider]} />
      </div>
    </div>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
      <p className="text-[11px] uppercase tracking-[0.3em] text-mist/55">{label}</p>
      <p className="mt-2 text-sm font-medium capitalize text-white">{value}</p>
    </div>
  );
}
