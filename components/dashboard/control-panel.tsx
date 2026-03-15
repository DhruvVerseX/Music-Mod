"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { postEngineAction, requestBrowserMediaAccess } from "@/hooks/use-engine-session";
import { useAppStore } from "@/store/use-app-store";

export function ControlPanel() {
  const engine = useAppStore((state) => state.engine);
  const mergeEngine = useAppStore((state) => state.mergeEngine);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);

  const handleAction = async (path: string) => {
    const isStart = path === "/session/start";

    try {
      if (isStart) {
        setIsStarting(true);
        mergeEngine({
          status: "connecting",
          errors: ["Requesting browser camera and microphone permission..."]
        });
        await requestBrowserMediaAccess();
        mergeEngine({
          status: "connecting",
          errors: ["Permissions granted. Arming the live browser deck..."]
        });
      } else {
        setIsStopping(true);
      }

      await postEngineAction(path);
    } catch (error) {
      mergeEngine({
        status: "error",
        errors: [error instanceof Error ? error.message : "Engine request failed."]
      });
    } finally {
      setIsStarting(false);
      setIsStopping(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 xl:items-end">
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={isStarting}
          onClick={() => void handleAction("/session/start")}
          className="rounded-full border border-[#62ffd9]/25 bg-[linear-gradient(180deg,rgba(98,255,217,0.22),rgba(98,255,217,0.08))] px-6 py-3 text-sm font-medium uppercase tracking-[0.18em] text-[#a7ffee] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isStarting ? "Arming..." : "Start Deck"}
        </button>
        <button
          type="button"
          disabled={isStopping}
          onClick={() => void handleAction("/session/stop")}
          className="rounded-full border border-white/12 bg-white/5 px-6 py-3 text-sm font-medium uppercase tracking-[0.18em] text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isStopping ? "Cutting..." : "Stop Deck"}
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[22px] border border-white/10 bg-black/20 px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/45">Engine</p>
          <p className="mt-2 text-sm font-semibold uppercase text-white">{engine.backendVersion}</p>
        </div>
        <motion.div
          animate={{ opacity: engine.status === "running" ? 1 : 0.8 }}
          className="rounded-[22px] border border-[#ff7a18]/20 bg-[linear-gradient(180deg,rgba(255,122,24,0.14),rgba(255,122,24,0.06))] px-4 py-3"
        >
          <p className="text-[10px] uppercase tracking-[0.3em] text-[#ffb06b]">Session</p>
          <p className="mt-2 text-sm font-semibold uppercase text-white">{engine.status}</p>
        </motion.div>
      </div>
    </div>
  );
}
