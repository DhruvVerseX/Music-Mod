"use client";

import { motion } from "framer-motion";
import { GESTURE_GUIDE } from "@/lib/constants";

export function GestureLegend() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.25 }}
      className="dj-panel p-5"
    >
      <p className="text-[11px] uppercase tracking-[0.34em] text-white/45">Cue Bank</p>
      <h2 className="mt-2 font-display text-2xl text-white">Gesture Pads</h2>

      <div className="mt-5 grid gap-3">
        {GESTURE_GUIDE.map(([gesture, effect], index) => (
          <motion.div
            key={gesture}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.42, delay: 0.08 + index * 0.04 }}
            className="rounded-[24px] border border-white/10 bg-[#10131b] p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-display text-xl text-white">{gesture}</h3>
              <span className="rounded-full border border-[#62ffd9]/20 bg-[#62ffd9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-[#8effe4]">
                {effect}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-white/60">
              Trigger this pose on the camera deck to punch the corresponding vocal color into the live mix.
            </p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-white/68">
        Keep one hand in frame on the left deck. Open shapes switch cleanly, while directional movement pushes the
        more expressive FX states.
      </div>
    </motion.section>
  );
}
