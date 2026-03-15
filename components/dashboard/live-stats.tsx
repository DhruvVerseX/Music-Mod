"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { readRecordingMeta, RECORDINGS_UPDATED_EVENT, StoredRecordingMeta } from "@/lib/browser-recording-store";
import { setBrowserRecording } from "@/hooks/use-engine-session";
import { useAppStore } from "@/store/use-app-store";

export function LiveStats() {
  const engine = useAppStore((state) => state.engine);
  const [takes, setTakes] = useState<StoredRecordingMeta[]>([]);
  const [isToggling, setIsToggling] = useState(false);

  useEffect(() => {
    setTakes(readRecordingMeta());

    const listener = (event: Event) => {
      const customEvent = event as CustomEvent<StoredRecordingMeta[]>;
      setTakes(customEvent.detail ?? readRecordingMeta());
    };

    window.addEventListener(RECORDINGS_UPDATED_EVENT, listener);
    return () => window.removeEventListener(RECORDINGS_UPDATED_EVENT, listener);
  }, []);

  const waveformBars = useMemo(() => {
    const data = engine.metrics.frequencyData;
    if (!data) {
      return Array.from({ length: 40 }, (_, i) => 
        Number((6 + Math.sin(i * 0.5) * 4).toFixed(3))
      );
    }

    // Map 256 frequency bins into 40 UI bars with some smoothing
    const barCount = 40;
    const binsPerBar = Math.floor(data.length / barCount);
    
    return Array.from({ length: barCount }, (_, i) => {
      let sum = 0;
      for (let j = 0; j < binsPerBar; j++) {
        sum += data[i * binsPerBar + j];
      }
      const avg = sum / binsPerBar;
      // Apply a logarithmic-like boost to lower frequencies for better look
      const boost = Math.pow(avg, 0.65);
      return Number(Math.max(8, Math.min(100, boost * 110)).toFixed(3));
    });
  }, [engine.metrics.frequencyData]);

  const handleRecordToggle = async () => {
    setIsToggling(true);
    try {
      // Auto-start engine if it's not running
      if (engine.status !== "running") {
        const { postEngineAction } = await import("@/hooks/use-engine-session");
        await postEngineAction("/session/start");
      }
      await setBrowserRecording(!engine.isRecording);
    } finally {
      setIsToggling(false);
    }
  };

  const handleDownload = async (take: StoredRecordingMeta) => {
    const { getRecordingBlob } = await import("@/lib/browser-recording-store");
    const blob = await getRecordingBlob(take.id);
    if (!blob) return;

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `take-${new Date(take.createdAt).getTime()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const latestTake = takes[0];

  return (
    <motion.section
      initial={{ opacity: 0, y: 32 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.15 }}
      className="relative flex h-full flex-col gap-5 rounded-[36px] border border-white/15 bg-[radial-gradient(circle_at_top,rgba(95,255,227,0.16),transparent_45%),rgba(7,9,18,0.9)] p-5 shadow-[0_25px_80px_rgba(0,0,0,0.5)] backdrop-blur-2xl"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.4em] text-[#a7ffee]/70">Vocal Reactor</p>
          <h2 className="font-display text-3xl font-semibold text-white">Live Voice Console</h2>
        </div>
        <button
          type="button"
          disabled={isToggling}
          onClick={handleRecordToggle}
          className={`rounded-full border px-5 py-2 text-[11px] font-semibold uppercase tracking-[0.3em] transition ${
            engine.isRecording
              ? "border-[#ff5a1e]/50 bg-[linear-gradient(180deg,rgba(255,90,30,0.3),rgba(255,90,30,0.05))] text-[#ffe7cf]"
              : "border-[#5fffe3]/60 bg-[linear-gradient(180deg,rgba(95,255,227,0.3),rgba(12,40,56,0.4))] text-[#5fffe3]"
          } disabled:cursor-not-allowed disabled:opacity-40`}
        >
          {isToggling ? "Tuning..." : engine.isRecording ? "Stop Recording" : "Record Voice"}
        </button>
      </div>

      <div className="grid flex-1 gap-4 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="flex flex-col gap-4 rounded-[28px] border border-white/5 bg-[rgba(5,6,10,0.75)] p-4">
          <div className="flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-[0.32em] text-white/60">Monitoring</p>
            <span className="rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.24em] text-white">
              {engine.isRecording ? "Capturing" : "Live Pass"}
            </span>
          </div>

          <div className="flex gap-4">
            <div className="flex-1 rounded-[22px] border border-white/10 bg-gradient-to-b from-white/5 via-white/5 to-transparent p-3">
              <div className="flex h-32 items-end gap-1">
                {waveformBars.map((height, index) => (
                  <div
                    key={index}
                    className="flex-1 rounded-full bg-[linear-gradient(180deg,#5fffe3,#0b293c)] transition-all duration-200"
                    style={{ height: `${height}%` }}
                  />
                ))}
              </div>
            </div>
            <div className="flex w-28 flex-col gap-4 text-center text-xs uppercase tracking-[0.3em]">
              <div className="rounded-[18px] border border-white/10 bg-white/5 px-2 py-3">
                <p className="text-white/70">Mic</p>
                <p className="mt-1 text-2xl font-semibold text-white">{Math.round(engine.metrics.inputLevel * 100)}%</p>
              </div>
              <div className="rounded-[18px] border border-white/10 bg-white/5 px-2 py-3">
                <p className="text-white/70">Out</p>
                <p className="mt-1 text-2xl font-semibold text-white">{Math.round(engine.metrics.outputLevel * 100)}%</p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.32em] text-white/60">
            <Badge label="Pitch" value={`${Math.round(engine.metrics.pitchHz)} Hz`} />
            <Badge label="Latency" value={`${Math.round(engine.metrics.latencyMs)} ms`} />
            <Badge label="Gesture" value={engine.gesture.label} />
          </div>
        </div>

        <div className="flex flex-col gap-3 rounded-[28px] border border-white/5 bg-[linear-gradient(135deg,rgba(255,255,255,0.08),rgba(7,9,18,0.85))] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-white/60">Local Takes</p>
              <div className="flex items-center gap-3">
                <h3 className="text-xl font-semibold text-white">{takes.length} Stored</h3>
                {takes.length > 0 && (
                  <button
                    onClick={() => {
                      if (confirm("Clear all recorded takes from this browser?")) {
                        import("@/lib/browser-recording-store").then((mod) => mod.clearAllRecordings());
                      }
                    }}
                    className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[9px] uppercase tracking-[0.2em] text-white/40 transition hover:bg-white/10 hover:text-white"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
            <span className="rounded-full border border-white/20 px-3 py-1 text-[9px] uppercase tracking-[0.3em] text-white">Offline</span>
          </div>
          <div className="space-y-3 overflow-hidden rounded-[20px] border border-white/10 bg-black/30 p-3">
            {takes.slice(0, 3).map((take) => (
              <div key={take.id} className="group flex items-center justify-between gap-3 rounded-[16px] border border-white/10 bg-white/5 px-3 py-2 text-[11px] transition hover:bg-white/10">
                <div className="flex-1">
                  <p className="font-semibold text-white">{formatDate(take.createdAt)}</p>
                  <p className="text-xs uppercase tracking-[0.28em] text-white/60">{formatDuration(take.durationMs)}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs uppercase tracking-[0.26em] text-white/40">{formatBytes(take.size)}</span>
                  <button
                    onClick={() => handleDownload(take)}
                    className="flex h-7 w-7 items-center justify-center rounded-full bg-[#5fffe3]/10 text-[#5fffe3] opacity-0 transition group-hover:opacity-100 hover:bg-[#5fffe3]/20"
                    title="Download Take"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
            {!takes.length ? (
              <p className="text-center text-xs uppercase tracking-[0.28em] text-white/50">Record to save the next take</p>
            ) : null}
          </div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-white/70">Latest take resets when you reload this window.</p>
        </div>
      </div>
    </motion.section>
  );
}

function Badge({ label, value }: { label: string; value: string }) {
  return (
    <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[9px] tracking-[0.28em] text-white">
      {label}: <strong className="text-[#5fffe3]">{value}</strong>
    </span>
  );
}

function formatDuration(durationMs: number) {
  const seconds = Math.round(durationMs / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string) {
  const date = new Date(iso);
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}
