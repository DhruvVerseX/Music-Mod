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
    <div className="flex flex-col gap-3 text-right">
      <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.3em]">
        <button
          type="button"
          onClick={() => void handleAction("/session/start")}
          disabled={isStarting}
          className="rounded-full border border-white/20 bg-gradient-to-br from-[#5fffe3]/40 via-[#54d4ff]/30 to-[#0b2c49]/30 px-5 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-[#e4ffe8] transition hover:scale-[1.02] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isStarting ? "Arming..." : "Start Deck"}
        </button>
        <button
          type="button"
          onClick={() => void handleAction("/session/stop")}
          disabled={isStopping}
          className="rounded-full border border-white/20 bg-white/5 px-5 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white transition hover:border-white/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isStopping ? "Cutting..." : "Stop Deck"}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.28em]">
        <div className="rounded-[16px] border border-white/10 bg-white/5 px-3 py-2 text-left text-white/80">
          <p className="text-[9px] text-white/60">Engine</p>
          <p className="mt-1 text-sm font-semibold uppercase text-white">{engine.backendVersion}</p>
        </div>
        <motion.div
          animate={{ opacity: engine.status === "running" ? 1 : 0.65 }}
          className="rounded-[16px] border border-[#ff5a1e]/40 bg-[linear-gradient(180deg,rgba(255,90,30,0.25),rgba(255,90,30,0.05))] px-3 py-2 text-left text-white"
        >
          <p className="text-[9px] text-[#ffe7cf]">Session</p>
          <p className="mt-1 text-sm font-semibold uppercase">{engine.status}</p>
        </motion.div>
      </div>
    </div>
  );
}
