"use client";

import { motion } from "framer-motion";
import { GESTURE_GUIDE } from "@/lib/constants";

export function GestureLegend() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.25 }}
      className="panel p-5"
    >
      <p className="text-xs uppercase tracking-[0.3em] text-mist/70">Gesture Score</p>
      <h2 className="mt-2 font-display text-3xl text-white">How the Python engine maps motion</h2>

      <div className="mt-5 space-y-3">
        {GESTURE_GUIDE.map(([gesture, effect], index) => (
          <motion.div
            key={gesture}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.08 + index * 0.05 }}
            className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-display text-xl text-white">{gesture}</h3>
              <span className="rounded-full border border-signal/30 bg-signal/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-signal">
                {effect}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-mist/75">
              The local Python tracker detects pose, movement direction, and temporal sequence before switching the
              active vocal effect.
            </p>
          </motion.div>
        ))}
      </div>

      <div className="mt-6 rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm leading-7 text-mist/75">
        Start the backend first, then click <span className="text-white">Start Engine</span>. Audio monitoring and
        hand tracking happen outside the browser, so you hear the processed voice directly in your selected output
        device.
      </div>
    </motion.section>
  );
}
