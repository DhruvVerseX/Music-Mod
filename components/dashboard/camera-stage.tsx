"use client";

import { RefObject } from "react";
import { motion } from "framer-motion";
import { EffectPanel } from "@/components/dashboard/effect-panel";
import { PROVIDER_LABELS } from "@/lib/constants";
import { useAppStore } from "@/store/use-app-store";

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export function CameraStage({ videoRef, canvasRef }: Props) {
  const { systemArmed, cameraReady, cameraError, gesture, pythonProvider } = useAppStore();

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.1 }}
      className="panel relative overflow-hidden p-3 sm:p-4"
    >
      <div className="relative min-h-[460px] overflow-hidden rounded-[24px] border border-white/10 bg-slate-950">
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className={`absolute inset-0 h-full w-full object-cover ${cameraReady ? "opacity-0" : "opacity-10"}`}
        />
        <canvas ref={canvasRef} width={1280} height={720} className="absolute inset-0 h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.22),transparent_30%),linear-gradient(180deg,transparent,rgba(3,7,17,0.6))]" />
        <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs uppercase tracking-[0.3em] text-mist/80 backdrop-blur-md">
          Vision Feed
        </div>
        <div className="absolute right-4 top-4 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs uppercase tracking-[0.3em] text-mist/80 backdrop-blur-md">
          {PROVIDER_LABELS[pythonProvider]}
        </div>
        {!systemArmed || !cameraReady ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="max-w-md rounded-[28px] border border-white/10 bg-black/45 p-6 text-center backdrop-blur-xl">
              <p className="text-xs uppercase tracking-[0.32em] text-aurora/80">Camera Stage</p>
              <h3 className="mt-3 font-display text-3xl text-white">
                {!systemArmed ? "Arm the system to start the camera." : "Waiting for camera permission."}
              </h3>
              <p className="mt-3 text-sm leading-6 text-mist/75">
                {!systemArmed
                  ? "The browser will not reliably open camera and microphone until you trigger them from a user action."
                  : cameraError ?? "Allow camera access in the browser prompt, then hold your hand in frame."}
              </p>
            </div>
          </div>
        ) : null}
        <div className="absolute bottom-24 left-4 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs uppercase tracking-[0.3em] text-signal backdrop-blur-md">
          {gesture.label}
        </div>
        <div className="absolute bottom-4 left-4 right-4 lg:hidden">
          <EffectPanel />
        </div>
      </div>
    </motion.section>
  );
}
