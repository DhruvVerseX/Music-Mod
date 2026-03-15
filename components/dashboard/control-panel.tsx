"use client";

import { motion } from "framer-motion";
import { postEngineAction } from "@/hooks/use-engine-session";
import { useAppStore } from "@/store/use-app-store";

export function ControlPanel() {
  const engine = useAppStore((state) => state.engine);
  const mergeEngine = useAppStore((state) => state.mergeEngine);

  const handleAction = async (path: string) => {
    try {
      await postEngineAction(path);
    } catch (error) {
      mergeEngine({
        status: "error",
        errors: [error instanceof Error ? error.message : "Engine request failed."]
      });
    }
  };

  return (
    <div className="flex flex-col gap-3 lg:items-end">
      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => void handleAction("/session/start")}
          className="rounded-full border border-signal/30 bg-signal/10 px-5 py-3 text-sm font-medium text-signal transition hover:bg-signal/20"
        >
          Start Engine
        </button>
        <button
          type="button"
          onClick={() => void handleAction("/session/stop")}
          className="rounded-full border border-white/15 bg-white/5 px-5 py-3 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Stop Engine
        </button>
      </div>
      <motion.div
        animate={{ opacity: engine.status === "running" ? 1 : 0.75 }}
        className="rounded-full border border-white/10 bg-black/30 px-4 py-2 text-xs uppercase tracking-[0.3em] text-mist/80"
      >
        {engine.status} · {engine.backendVersion}
      </motion.div>
    </div>
  );
}
