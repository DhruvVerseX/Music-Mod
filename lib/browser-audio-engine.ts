"use client";

import { saveRecording } from "@/lib/browser-recording-store";
import { AudioEffectMode } from "@/lib/types";
import { useAppStore } from "@/store/use-app-store";

class BrowserAudioEngine {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private recordDestination: MediaStreamAudioDestinationNode | null = null;
  private recorder: MediaRecorder | null = null;
  private recordingChunks: Blob[] = [];
  private currentEffectInput: AudioNode | null = null;
  private currentEffectOutput: AudioNode | null = null;
  private inputGainNode: GainNode | null = null;
  private compressorNode: DynamicsCompressorNode | null = null;
  private masterGainNode: GainNode | null = null;
  private rafId = 0;
  private latencyMs = 0;
  private recordingStartedAt = 0;

  async start() {
    if (this.context) {
      if (this.context.state === "suspended") {
        await this.context.resume();
      }
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: { ideal: false },
        noiseSuppression: { ideal: false },
        autoGainControl: { ideal: true }
      },
      video: false
    }).catch(async () => {
      // Fallback to basic audio if ideal constraints fail
      return await navigator.mediaDevices.getUserMedia({ audio: true });
    });

    const context = new AudioContext({ latencyHint: "interactive" });
    const source = context.createMediaStreamSource(stream);
    this.inputAnalyser = context.createAnalyser();
    this.outputAnalyser = context.createAnalyser();
    this.recordDestination = context.createMediaStreamDestination();
    
    this.inputAnalyser.fftSize = 1024; // Faster FFT for lower latency
    this.inputAnalyser.smoothingTimeConstant = 0.2;
    this.outputAnalyser.fftSize = 1024;
    this.outputAnalyser.smoothingTimeConstant = 0.2;

    const inputGainNode = context.createGain();
    inputGainNode.gain.value = 3.2; // Aggressive Pre-Amp boost
    this.inputGainNode = inputGainNode;

    const compressor = context.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-24, context.currentTime);
    compressor.knee.setValueAtTime(30, context.currentTime);
    compressor.ratio.setValueAtTime(12, context.currentTime);
    compressor.attack.setValueAtTime(0.003, context.currentTime);
    compressor.release.setValueAtTime(0.25, context.currentTime);
    this.compressorNode = compressor;

    const masterGainNode = context.createGain();
    masterGainNode.gain.value = 1.5; 
    this.masterGainNode = masterGainNode;

    this.context = context;
    this.stream = stream;
    this.source = source;
    this.latencyMs = Math.round((context.baseLatency || 0.01) * 1000);

    // Patch the path: Source -> inputGain -> inputAnalyser
    source.connect(this.inputGainNode);
    this.inputGainNode.connect(this.inputAnalyser);

    this.rebuildGraph(useAppStore.getState().engine.effect);
    this.setMonitoring(true);
    
    // Final check for context state
    if (context.state === "suspended") {
      await context.resume();
    }

    this.startTelemetry();
  }

  async stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }

    if (this.recorder && this.recorder.state !== "inactive") {
      await this.stopRecording();
    }

    this.inputGainNode?.disconnect();
    this.masterGainNode?.disconnect();
    this.recordDestination?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    await this.context?.close();

    this.context = null;
    this.stream = null;
    this.source = null;
    this.inputAnalyser = null;
    this.outputAnalyser = null;
    this.recordDestination = null;
    this.inputGainNode = null;
    this.masterGainNode = null;
    this.recorder = null;
    this.recordingChunks = [];
    this.recordingStartedAt = 0;
    this.currentEffectInput = null;
    this.currentEffectOutput = null;
  }

  setEffect(effect: AudioEffectMode) {
    if (!this.context || !this.source || !this.inputAnalyser) {
      return;
    }

    this.rebuildGraph(effect);
  }

  private rebuildGraph(effect: AudioEffectMode) {
    if (!this.context || !this.source || !this.inputAnalyser || !this.outputAnalyser) {
      return;
    }
    const recordDestination = this.recordDestination;
    if (!recordDestination) {
      return;
    }

    this.currentEffectInput?.disconnect();
    this.currentEffectOutput?.disconnect();
    this.inputAnalyser.disconnect();
    this.outputAnalyser.disconnect();

    const { input, output } = this.createEffectChain(effect);
    this.currentEffectInput = input;
    this.currentEffectOutput = output;

    this.inputAnalyser.connect(input);
    output.connect(this.outputAnalyser);
    
    // Connect to compressor for signal leveling
    if (this.compressorNode) {
      this.outputAnalyser.connect(this.compressorNode);
      
      // Connect compressor to master gain for monitoring
      if (this.masterGainNode) {
        this.compressorNode.connect(this.masterGainNode);
        this.masterGainNode.connect(this.context.destination);
        
        // Sync monitoring state
        const monitorEnabled = useAppStore.getState().engine.isMonitoring;
        this.masterGainNode.gain.setValueAtTime(monitorEnabled ? 1.5 : 0, this.context.currentTime);
      } else {
        this.compressorNode.connect(this.context.destination);
      }
      
      // Send raw output to recorder to keep it clean but affected
      this.outputAnalyser.connect(recordDestination);
    } else {
      // Fallback if no compressor
      if (this.masterGainNode) {
        this.outputAnalyser.connect(this.masterGainNode);
        this.masterGainNode.connect(this.context.destination);
      } else {
        this.outputAnalyser.connect(this.context.destination);
      }
      this.outputAnalyser.connect(recordDestination);
    }
  }

  async syncRecording(shouldRecord: boolean) {
    // Ensure context is alive before any state change
    if (this.context?.state === "suspended") {
      await this.context.resume();
    }

    if (shouldRecord) {
      return this.startRecording();
    }

    return this.stopRecording();
  }

  setInputGain(value: number) {
    if (this.inputGainNode) {
      this.inputGainNode.gain.setTargetAtTime(value, this.context?.currentTime ?? 0, 0.05);
    }
  }

  setOutputGain(value: number) {
    if (this.masterGainNode) {
      this.masterGainNode.gain.setTargetAtTime(value, this.context?.currentTime ?? 0, 0.05);
    }
  }

  async setInputDevice(deviceId: string) {
    if (!this.context) return;
    
    // Stop old tracks
    this.stream?.getTracks().forEach(t => t.stop());
    
    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: { exact: deviceId },
          echoCancellation: { ideal: false },
          noiseSuppression: { ideal: false },
          autoGainControl: { ideal: true }
        }
      });
      
      this.stream = newStream;
      this.source?.disconnect();
      this.source = this.context.createMediaStreamSource(newStream);
      
      // Re-patch to input gain and rebuild the whole chain
      if (this.inputGainNode) {
        this.source.connect(this.inputGainNode);
        this.rebuildGraph(useAppStore.getState().engine.effect);
      }
      
      console.log("Switched to input device:", deviceId);
    } catch (err) {
      console.error("Failed to switch input device:", err);
      // Fallback
      await this.start();
    }
  }

  playTestTone() {
    if (!this.context) return;
    const osc = this.context.createOscillator();
    const g = this.context.createGain();
    osc.connect(g);
    g.connect(this.context.destination);
    
    g.gain.setValueAtTime(0.25, this.context.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, this.context.currentTime + 0.5);
    
    osc.frequency.setValueAtTime(440, this.context.currentTime);
    osc.start();
    osc.stop(this.context.currentTime + 0.5);
  }

  setMonitoring(enabled: boolean) {
    if (this.masterGainNode) {
      this.masterGainNode.gain.setTargetAtTime(enabled ? 1.5 : 0, this.context?.currentTime ?? 0, 0.1);
    }
  }

  async setOutputDevice(deviceId: string) {
    if (this.context && (this.context as any).setSinkId) {
      try {
        await (this.context as any).setSinkId(deviceId);
      } catch (error) {
        console.error("Failed to set output device:", error);
      }
    }
  }

  async rescue() {
    if (this.context) {
      await this.context.resume();
      this.rebuildGraph(useAppStore.getState().engine.effect);
    } else {
      await this.start();
    }
  }

  async refreshDevices() {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.enumerateDevices) {
      return;
    }

    const devices = await navigator.mediaDevices.enumerateDevices();
    const inputs = devices.filter((d) => d.kind === "audioinput");
    const outputs = devices.filter((d) => d.kind === "audiooutput");

    useAppStore.getState().mergeEngine({
      metrics: {
        ...useAppStore.getState().engine.metrics,
        availableDevices: { inputs, outputs }
      }
    });
  }

  private async startRecording() {
    if (!this.context) {
      throw new Error("Start the deck before recording from the camera gesture.");
    }

    if (!this.recordDestination) {
      throw new Error("Recording bus is unavailable in this browser session.");
    }

    if (typeof MediaRecorder === "undefined") {
      throw new Error("This browser does not support MediaRecorder for voice capture.");
    }

    if (this.recorder?.state === "recording") {
      return true;
    }

    const mimeType = pickSupportedMimeType();
    this.recordingChunks = [];
    this.recorder = mimeType
      ? new MediaRecorder(this.recordDestination.stream, { mimeType })
      : new MediaRecorder(this.recordDestination.stream);

    this.recorder.addEventListener("dataavailable", (event) => {
      if (event.data.size > 0) {
        this.recordingChunks.push(event.data);
      }
    });

    this.recordingStartedAt = Date.now();
    this.recorder.start();
    return true;
  }

  private stopRecording() {
    if (!this.recorder || this.recorder.state === "inactive") {
      return Promise.resolve(false);
    }

    return new Promise<boolean>((resolve) => {
      const recorder = this.recorder!;
      recorder.addEventListener(
        "stop",
        () => {
          const blob = new Blob(this.recordingChunks, {
            type: recorder.mimeType || "audio/webm"
          });
          const durationMs = Math.max(0, Date.now() - this.recordingStartedAt);
          this.recordingChunks = [];
          this.recordingStartedAt = 0;
          this.recorder = null;
          void saveRecording(blob, durationMs).finally(() => resolve(false));
        },
        { once: true }
      );
      recorder.stop();
    });
  }

   private createEffectChain(effect: AudioEffectMode) {
    const context = this.context!;

    if (effect === "idle") {
      const gain = context.createGain();
      gain.gain.value = 1;
      return { input: gain, output: gain };
    }

    if (effect === "vocoder") {
      // "Pro" Robot Bank: Detuned Osc Bank + Ring Mod
      const inputGain = context.createGain();
      inputGain.gain.value = 1.3;

      const osc1 = context.createOscillator();
      const osc2 = context.createOscillator();
      const osc3 = context.createOscillator();
      
      osc1.type = "sawtooth";
      osc2.type = "square";
      osc3.type = "sawtooth";
      
      osc1.frequency.value = 110; // A2
      osc2.frequency.value = 112; // Detuned
      osc3.frequency.value = 55;  // Sub
      
      const oscGain = context.createGain();
      oscGain.gain.value = 0.8;
      
      osc1.connect(oscGain);
      osc2.connect(oscGain);
      osc3.connect(oscGain);
      
      osc1.start();
      osc2.start();
      osc3.start();

      const modulator = context.createGain();
      modulator.gain.value = 0;
      oscGain.connect(modulator.gain);

      const filter = context.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 1400;
      filter.Q.value = 1.2;

      inputGain.connect(modulator);
      modulator.connect(filter);
      
      return { input: inputGain, output: filter };
    }

    if (effect === "autotune") {
      // Metallic Resonator: Comb Filter style autotuning
      const inputGain = context.createGain();
      
      const merger = context.createGain();
      
      // Parallel tuned resonance paths (C Maj triad approximation)
      [0.0038, 0.0048, 0.0057].forEach(dt => {
        const delay = context.createDelay();
        delay.delayTime.value = dt;
        const feedback = context.createGain();
        feedback.gain.value = 0.82; // High resonance
        
        inputGain.connect(delay);
        delay.connect(feedback);
        feedback.connect(delay);
        delay.connect(merger);
      });

      const highpass = context.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 220;
      
      merger.connect(highpass);

      const drive = context.createWaveShaper();
      drive.curve = makeDistortionCurve(20);
      
      highpass.connect(drive);

      return { input: inputGain, output: drive };
    }

    if (effect === "talkbox") {
      // Formant synthesis (vocal peaks)
      const inputGain = context.createGain();
      inputGain.gain.value = 1.4;

      const f1 = context.createBiquadFilter();
      f1.type = "bandpass";
      f1.frequency.value = 730; // 'a' formant
      f1.Q.value = 4.5;

      const f2 = context.createBiquadFilter();
      f2.type = "bandpass";
      f2.frequency.value = 1090; // 'e' formant
      f2.Q.value = 5.2;

      const drive = context.createWaveShaper();
      drive.curve = makeDistortionCurve(100);
      drive.oversample = "4x";

      const combiner = context.createGain();
      inputGain.connect(f1);
      inputGain.connect(f2);
      f1.connect(combiner);
      f2.connect(combiner);
      
      combiner.connect(drive);

      return { input: inputGain, output: drive };
    }

    // Default "Phone" effect
    const bandpass = context.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 1100;
    bandpass.Q.value = 4.0;

    const gain = context.createGain();
    gain.gain.value = 1.5;

    bandpass.connect(gain);
    return { input: bandpass, output: gain };
  }

  private startTelemetry() {
    const inputBuffer = new Float32Array(2048);
    const outputBuffer = new Float32Array(2048);
    const fftBuffer = new Uint8Array(256); // Smaller FFT for visualization

    const tick = () => {
      if (!this.inputAnalyser || !this.outputAnalyser) {
        return;
      }

      // Check for suspended context (some browsers need periodic checks)
      if (this.context?.state === "suspended") {
        void this.context.resume();
      }

      this.inputAnalyser.getFloatTimeDomainData(inputBuffer);
      this.outputAnalyser.getFloatTimeDomainData(outputBuffer);
      this.outputAnalyser.getByteFrequencyData(fftBuffer);

      const inputLevel = rms(inputBuffer);
      const outputLevel = rms(outputBuffer);
      const pitchHz = estimatePitch(inputBuffer, this.context?.sampleRate ?? 48000);
      
      const tracks = this.stream?.getAudioTracks() ?? [];
      const isMuted = tracks.length > 0 && !tracks[0].enabled;
      const isEnded = tracks.length > 0 && tracks[0].readyState === "ended";

      // Periodically refresh devices (every 500 frames approx)
      if (Math.random() < 0.002) {
        void this.refreshDevices();
      }

      // Convert ByteFrequencyData to a simple percentage array for the UI
      const frequencyData = Array.from(fftBuffer).map(v => v / 255);

      useAppStore.getState().mergeEngine({
        micReady: tracks.length > 0 && !isEnded,
        outputReady: true,
        errors: isMuted ? ["Warning: Browser microphone is muted."] : isEnded ? ["Error: Microphone connection lost."] : [],
        metrics: {
          ...useAppStore.getState().engine.metrics,
          inputLevel,
          outputLevel,
          pitchHz,
          latencyMs: this.latencyMs,
          frequencyData
        }
      });

      this.rafId = requestAnimationFrame(tick);
    };

    this.rafId = requestAnimationFrame(tick);
  }
}

export const browserAudioEngine = new BrowserAudioEngine();

function makeDistortionCurve(amount: number) {
  const samples = 2048;
  const curve = new Float32Array(samples);
  const k = typeof amount === "number" ? amount : 50;

  for (let i = 0; i < samples; i += 1) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + k) * x * 20 * (Math.PI / 180)) / (Math.PI + k * Math.abs(x));
  }

  return curve;
}

function rms(buffer: Float32Array) {
  let sum = 0;
  for (let i = 0; i < buffer.length; i += 1) {
    sum += Math.abs(buffer[i]);
  }
  const avg = sum / buffer.length;
  // Use a non-linear curve to make small sounds more visible on the meter
  return Math.min(1, Math.pow(avg * 15.0, 0.75));
}

function estimatePitch(buffer: Float32Array, sampleRate: number) {
  let bestLag = 0;
  let best = 0;
  const minLag = Math.floor(sampleRate / 500);
  const maxLag = Math.floor(sampleRate / 70);

  for (let lag = minLag; lag <= maxLag; lag += 1) {
    let correlation = 0;
    for (let i = 0; i < buffer.length - lag; i += 1) {
      correlation += buffer[i] * buffer[i + lag];
    }
    if (correlation > best) {
      best = correlation;
      bestLag = lag;
    }
  }

  if (!bestLag || best < 0.005) {
    return 0;
  }

  return Math.round(sampleRate / bestLag);
}

function pickSupportedMimeType() {
  if (typeof MediaRecorder === "undefined") {
    return "";
  }

  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/ogg;codecs=opus"];
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate)) ?? "";
}
