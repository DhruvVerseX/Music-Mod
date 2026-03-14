"use client";

import { motion } from "framer-motion";

const items = [
  {
    gesture: "Palm",
    effect: "Vocoder",
    detail: "Left/right tilt bends live pitch."
  },
  {
    gesture: "Fist",
    effect: "AutoTune",
    detail: "Tilt controls pitch correction intensity."
  },
  {
    gesture: "Two Finger",
    effect: "Recording",
    detail: "Starts processed voice capture."
  },
  {
    gesture: "Love You",
    effect: "Talkbox",
    detail: "Switches into synth-filter formants."
  }
];

export function GestureLegend() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.65, delay: 0.2 }}
      className="panel p-5"
    >
      <p className="text-xs uppercase tracking-[0.3em] text-mist/70">Gesture Map</p>
      <h2 className="mt-2 font-display text-3xl text-white">Performance Grammar</h2>
      <div className="mt-5 space-y-3">
        {items.map((item, index) => (
          <motion.div
            key={item.gesture}
            initial={{ opacity: 0, x: 18 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.1 + index * 0.06 }}
            className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4"
          >
            <div className="flex items-center justify-between gap-4">
              <h3 className="font-display text-xl text-white">{item.gesture}</h3>
              <span className="rounded-full border border-signal/30 bg-signal/10 px-3 py-1 text-xs uppercase tracking-[0.24em] text-signal">
                {item.effect}
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-mist/75">{item.detail}</p>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}
