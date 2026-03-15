"use client";

import { motion } from "framer-motion";
import { browserAudioEngine } from "@/lib/browser-audio-engine";
import { useAppStore } from "@/store/use-app-store";
import { useState, useEffect } from "react";

export function HardwareRack() {
  const engine = useAppStore((state) => state.engine);
  const [inputGain, setInputGain] = useState(2.4);
  const [outputGain, setOutputGain] = useState(1.35);

  useEffect(() => {
    browserAudioEngine.refreshDevices();
  }, []);

  const handleInputGain = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setInputGain(val);
    browserAudioEngine.setInputGain(val);
  };

  const handleOutputGain = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setOutputGain(val);
    browserAudioEngine.setOutputGain(val);
  };

  const handleOutputDevice = (e: React.ChangeEvent<HTMLSelectElement>) => {
    browserAudioEngine.setOutputDevice(e.target.value);
  };

  const handleInputDevice = (e: React.ChangeEvent<HTMLSelectElement>) => {
    browserAudioEngine.setInputDevice(e.target.value);
  };

  const handleRescue = async () => {
    await browserAudioEngine.rescue();
  };

  const handleMonitorToggle = () => {
    const next = !engine.isMonitoring;
    useAppStore.getState().mergeEngine({ isMonitoring: next });
    browserAudioEngine.setMonitoring(next);
  };

  const devices = engine.metrics.availableDevices;

  return (
    <motion.section
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      className="dj-panel flex flex-col gap-4 p-4"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.34em] text-white/45">Fader Rack</p>
          <h2 className="mt-1 font-display text-xl text-white">Hardware Calibration</h2>
        </div>
        <div className="flex items-center gap-4">
           {/* Monitor Toggle */}
           <div className="flex items-center gap-2 rounded-full border border-white/10 bg-black/40 px-3 py-1.5">
             <span className="text-[10px] uppercase tracking-[0.15em] text-white/60">Live Monitor</span>
             <button
               onClick={handleMonitorToggle}
               className={`relative h-5 w-9 rounded-full transition-colors duration-200 ${engine.isMonitoring ? 'bg-[#5fffe3]' : 'bg-white/10'}`}
             >
               <div className={`absolute top-1 h-3 w-3 rounded-full bg-white transition-all duration-200 ${engine.isMonitoring ? 'left-5' : 'left-1'}`} />
             </button>
           </div>

           <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/5">
              <svg className="h-4 w-4 text-white/60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
           </div>
           <button 
             onClick={handleRescue}
             className="rounded-full bg-red-500/10 border border-red-500/20 px-3 py-1.5 text-[9px] uppercase tracking-[0.2em] text-red-400 hover:bg-red-500/20 transition-all font-semibold"
           >
             Emergency Restart
           </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Input Calibration */}
        <div className="rounded-[22px] border border-white/10 bg-black/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.24em] text-white/60">Mic Pre-Amp</span>
            <span className="font-mono text-xs text-[#5fffe3]">{(inputGain * 10).toFixed(1)} dB</span>
          </div>
          <input
            type="range"
            min="0"
            max="10"
            step="0.1"
            value={inputGain}
            onChange={handleInputGain}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#5fffe3]"
          />
          <div className="mt-4">
             <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Active Input</p>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-black/40 border border-white/5">
                   <motion.div 
                     className="h-full bg-[#5fffe3]" 
                     style={{ width: `${engine.metrics.inputLevel * 100}%` }}
                     transition={{ duration: 0.1 }}
                   />
                </div>
             </div>
             <select 
               onChange={handleInputDevice}
               className="mt-1 w-full rounded-lg border border-white/5 bg-[#12141c] px-2 py-1.5 text-[11px] text-white/80 outline-none"
             >
               {devices?.inputs.map((d) => (
                 <option key={d.deviceId} value={d.deviceId}>{d.label || `Mic ${d.deviceId.slice(0, 4)}`}</option>
               ))}
               {!devices?.inputs.length && <option>Waiting for engine...</option>}
             </select>
          </div>
        </div>

        {/* Output Calibration */}
        <div className="rounded-[22px] border border-white/10 bg-black/40 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-[0.24em] text-white/60">Monitor Gain</span>
            <span className="font-mono text-xs text-[#ff5a1e]">{(outputGain * 10).toFixed(1)} dB</span>
          </div>
          <input
            type="range"
            min="0"
            max="5"
            step="0.1"
            value={outputGain}
            onChange={handleOutputGain}
            className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-[#ff5a1e]"
          />
          <div className="mt-4">
             <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase tracking-[0.2em] text-white/40">Active Output</p>
                <div className="h-1.5 w-16 overflow-hidden rounded-full bg-black/40 border border-white/5">
                   <motion.div 
                     className="h-full bg-[#ff5a1e]" 
                     style={{ width: `${engine.metrics.outputLevel * 100}%` }}
                     transition={{ duration: 0.1 }}
                   />
                </div>
             </div>
             <div className="mt-1 flex gap-2">
               <select 
                 onChange={handleOutputDevice}
                 className="flex-1 rounded-lg border border-white/5 bg-[#12141c] px-2 py-1.5 text-[11px] text-white/80 outline-none"
               >
                  {devices?.outputs.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>{d.label || "System Default Out"}</option>
                  ))}
                  {!devices?.outputs.length && <option>Waiting for engine...</option>}
               </select>
               <button 
                 onClick={() => browserAudioEngine.playTestTone()}
                 className="rounded-lg border border-white/10 bg-white/5 px-2 text-[9px] uppercase tracking-wider text-white/60 hover:bg-white/10"
               >
                 Ping
               </button>
             </div>
          </div>
        </div>
      </div>

      <div className="rounded-[18px] border border-[#5fffe3]/20 bg-[#5fffe3]/5 p-3">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#a7ffee]/80">
          Tip: Use headphones to prevent audio feedback from your speakers. Adjust "Monitor Gain" to hear your modulated voice.
        </p>
      </div>
    </motion.section>
  );
}
