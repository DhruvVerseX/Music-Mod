"use client";

import { AudioEffectMode } from "@/lib/types";
import { useAppStore } from "@/store/use-app-store";

class BrowserAudioEngine {
  private context: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private source: MediaStreamAudioSourceNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private currentEffectInput: AudioNode | null = null;
  private currentEffectOutput: AudioNode | null = null;
  private rafId = 0;
  private latencyMs = 0;

  async start() {
    if (this.context) {
      if (this.context.state === "suspended") {
        await this.context.resume();
      }
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false
      },
      video: false
    });

    const context = new AudioContext({ latencyHint: "interactive" });
    const source = context.createMediaStreamSource(stream);
    const inputAnalyser = context.createAnalyser();
    const outputAnalyser = context.createAnalyser();
    inputAnalyser.fftSize = 2048;
    outputAnalyser.fftSize = 2048;

    this.context = context;
    this.stream = stream;
    this.source = source;
    this.inputAnalyser = inputAnalyser;
    this.outputAnalyser = outputAnalyser;
    this.latencyMs = Math.round((context.baseLatency || 0.02) * 1000);

    source.connect(inputAnalyser);
    this.rebuildGraph(useAppStore.getState().engine.effect);
    this.startTelemetry();
  }

  async stop() {
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
      this.rafId = 0;
    }

    this.currentEffectInput?.disconnect();
    this.currentEffectOutput?.disconnect();
    this.source?.disconnect();
    this.inputAnalyser?.disconnect();
    this.outputAnalyser?.disconnect();
    this.stream?.getTracks().forEach((track) => track.stop());
    await this.context?.close();

    this.context = null;
    this.stream = null;
    this.source = null;
    this.inputAnalyser = null;
    this.outputAnalyser = null;
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

    this.currentEffectInput?.disconnect();
    this.currentEffectOutput?.disconnect();
    this.inputAnalyser.disconnect();
    this.outputAnalyser.disconnect();

    const { input, output } = this.createEffectChain(effect);
    this.currentEffectInput = input;
    this.currentEffectOutput = output;

    this.inputAnalyser.connect(input);
    output.connect(this.outputAnalyser);
    this.outputAnalyser.connect(this.context.destination);
  }

  private createEffectChain(effect: AudioEffectMode) {
    const context = this.context!;

    if (effect === "idle") {
      const gain = context.createGain();
      gain.gain.value = 1;
      return { input: gain, output: gain };
    }

    if (effect === "vocoder") {
      const bandpass = context.createBiquadFilter();
      bandpass.type = "bandpass";
      bandpass.frequency.value = 1400;
      bandpass.Q.value = 1.4;

      const drive = context.createWaveShaper();
      drive.curve = makeDistortionCurve(80);
      drive.oversample = "4x";

      const gain = context.createGain();
      gain.gain.value = 1.1;

      bandpass.connect(drive);
      drive.connect(gain);
      return { input: bandpass, output: gain };
    }

    if (effect === "autotune") {
      const highpass = context.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 180;

      const delay = context.createDelay(0.05);
      delay.delayTime.value = 0.018;

      const feedback = context.createGain();
      feedback.gain.value = 0.22;

      const mix = context.createGain();
      mix.gain.value = 1;

      highpass.connect(delay);
      delay.connect(feedback);
      feedback.connect(delay);
      delay.connect(mix);
      return { input: highpass, output: mix };
    }

    const bandpass = context.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = effect === "recording" ? 900 : 1200;
    bandpass.Q.value = 2.8;

    const peaking = context.createBiquadFilter();
    peaking.type = "peaking";
    peaking.frequency.value = 1800;
    peaking.Q.value = 1.2;
    peaking.gain.value = 12;

    const drive = context.createWaveShaper();
    drive.curve = makeDistortionCurve(effect === "recording" ? 45 : 30);
    drive.oversample = "4x";

    const gain = context.createGain();
    gain.gain.value = effect === "recording" ? 1.2 : 1;

    bandpass.connect(peaking);
    peaking.connect(drive);
    drive.connect(gain);
    return { input: bandpass, output: gain };
  }

  private startTelemetry() {
    const inputBuffer = new Float32Array(2048);
    const outputBuffer = new Float32Array(2048);

    const tick = () => {
      if (!this.inputAnalyser || !this.outputAnalyser) {
        return;
      }

      this.inputAnalyser.getFloatTimeDomainData(inputBuffer);
      this.outputAnalyser.getFloatTimeDomainData(outputBuffer);

      const inputLevel = rms(inputBuffer);
      const outputLevel = rms(outputBuffer);
      const pitchHz = estimatePitch(inputBuffer, this.context?.sampleRate ?? 48000);

      useAppStore.getState().mergeEngine({
        micReady: true,
        outputReady: true,
        metrics: {
          inputLevel,
          outputLevel,
          pitchHz,
          latencyMs: this.latencyMs
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
    sum += buffer[i] * buffer[i];
  }
  return Math.min(1, Math.sqrt(sum / buffer.length) * 2.2);
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

  if (!bestLag || best < 0.01) {
    return 0;
  }

  return Math.round(sampleRate / bestLag);
}
