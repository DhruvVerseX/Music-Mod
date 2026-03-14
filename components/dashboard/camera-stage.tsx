"use client";

import { RefObject } from "react";
import { motion } from "framer-motion";
import { EffectPanel } from "@/components/dashboard/effect-panel";

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>;
  canvasRef: RefObject<HTMLCanvasElement | null>;
}

export function CameraStage({ videoRef, canvasRef }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.1 }}
      className="panel relative overflow-hidden p-3 sm:p-4"
    >
      <div className="relative min-h-[460px] overflow-hidden rounded-[24px] border border-white/10 bg-slate-950">
        <video ref={videoRef} autoPlay muted playsInline className="absolute inset-0 h-full w-full object-cover opacity-0" />
        <canvas ref={canvasRef} width={1280} height={720} className="absolute inset-0 h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(125,211,252,0.22),transparent_30%),linear-gradient(180deg,transparent,rgba(3,7,17,0.6))]" />
        <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-xs uppercase tracking-[0.3em] text-mist/80 backdrop-blur-md">
          Vision Feed
        </div>
        <div className="absolute bottom-4 left-4 right-4 lg:hidden">
          <EffectPanel />
        </div>
      </div>
    </motion.section>
  );
}
