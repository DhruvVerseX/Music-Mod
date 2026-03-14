"use client";

import * as Tone from "tone";
import Meyda from "meyda";
import type { MeydaAnalyzer, MeydaFeaturesObject } from "meyda/dist/esm/meyda-wa";
import { AudioEffectMode, GestureSnapshot } from "@/lib/types";

interface AudioEngineCallbacks {
  onStatus: (status: "idle" | "initializing" | "ready" | "error") => void;
  onMetrics: (metrics: { inputLevel: number; spectralCentroid: number; pitch: number }) => void;
  onRecording: (recording: boolean) => void;
  onPermissionError: (message?: string) => void;
}

export class AudioEngine {
  private context?: AudioContext;
  private inputStream?: MediaStream;
  private source?: MediaStreamAudioSourceNode;
  private inputGain?: GainNode;
  private pitchNode?: DelayNode;
  private vocoderFilter?: BiquadFilterNode;
  private talkboxFilter?: BiquadFilterNode;
  private convolver?: ConvolverNode;
  private delay?: DelayNode;
  private feedbackGain?: GainNode;
  private effectMix?: GainNode;
  private outputGain?: GainNode;
  private analyser?: AnalyserNode;
  private workletNode?: AudioWorkletNode;
  private modulationLfo?: Tone.LFO;
  private destination?: MediaStreamAudioDestinationNode;
  private mediaRecorder?: MediaRecorder;
  private recorderChunks: Blob[] = [];
  private meydaAnalyzer?: MeydaAnalyzer;

  constructor(private callbacks: AudioEngineCallbacks) {}

  async initialize() {
    try {
      this.callbacks.onStatus("initializing");

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: false
        }
      });

      this.inputStream = stream;
      this.context = new AudioContext({ latencyHint: "interactive" });
      await this.context.audioWorklet.addModule("/audio/processor.worklet.js");
      await Tone.start();

      Tone.setContext(new Tone.Context(this.context));

      this.source = this.context.createMediaStreamSource(stream);
      this.inputGain = this.context.createGain();
      this.pitchNode = this.context.createDelay(0.05);
      this.vocoderFilter = this.context.createBiquadFilter();
      this.talkboxFilter = this.context.createBiquadFilter();
      this.convolver = this.context.createConvolver();
      this.delay = this.context.createDelay(0.4);
      this.feedbackGain = this.context.createGain();
      this.effectMix = this.context.createGain();
      this.outputGain = this.context.createGain();
      this.analyser = this.context.createAnalyser();
      this.workletNode = new AudioWorkletNode(this.context, "vocal-processor");
      this.destination = this.context.createMediaStreamDestination();

      this.inputGain.gain.value = 1;
      this.pitchNode.delayTime.value = 0.012;
      this.vocoderFilter.type = "bandpass";
      this.vocoderFilter.frequency.value = 1100;
      this.vocoderFilter.Q.value = 2.8;
      this.talkboxFilter.type = "bandpass";
      this.talkboxFilter.frequency.value = 1450;
      this.talkboxFilter.Q.value = 8;
      this.delay.delayTime.value = 0.16;
      this.feedbackGain.gain.value = 0.24;
      this.effectMix.gain.value = 0.18;
      this.outputGain.gain.value = 0.8;
      this.analyser.fftSize = 1024;
      this.convolver.buffer = this.createImpulseResponse(this.context, 1.8);

      this.modulationLfo = new Tone.LFO({
        frequency: 0.35,
        min: 900,
        max: 1900
      }).start();
      this.modulationLfo.connect(Tone.getDestination().volume);

      this.source.connect(this.inputGain);
      this.inputGain.connect(this.workletNode);

      this.workletNode.connect(this.outputGain);
      this.workletNode.connect(this.pitchNode);
      this.pitchNode.connect(this.vocoderFilter);
      this.vocoderFilter.connect(this.talkboxFilter);
      this.talkboxFilter.connect(this.delay);
      this.delay.connect(this.feedbackGain);
      this.feedbackGain.connect(this.delay);
      this.talkboxFilter.connect(this.convolver);
      this.delay.connect(this.effectMix);
      this.convolver.connect(this.effectMix);
      this.effectMix.connect(this.outputGain);
      this.outputGain.connect(this.analyser);
      this.outputGain.connect(this.context.destination);
      this.outputGain.connect(this.destination);

      this.mediaRecorder = new MediaRecorder(this.destination.stream);
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recorderChunks.push(event.data);
        }
      };
      this.mediaRecorder.onstop = () => {
        this.callbacks.onRecording(false);
        this.recorderChunks = [];
      };

      this.meydaAnalyzer = Meyda.createMeydaAnalyzer({
        audioContext: this.context,
        source: this.source,
        bufferSize: 512,
        featureExtractors: ["rms", "spectralCentroid"],
        callback: (features: Partial<MeydaFeaturesObject>) => {
          this.callbacks.onMetrics({
            inputLevel: Number(features.rms?.toFixed(3) ?? 0),
            spectralCentroid: Number(((features.spectralCentroid ?? 0) / 1000).toFixed(2)),
            pitch: 0
          });
        }
      });
      this.meydaAnalyzer.start();

      this.callbacks.onStatus("ready");
    } catch (error) {
      this.callbacks.onPermissionError(error instanceof Error ? error.message : "Microphone access failed");
      this.callbacks.onStatus("error");
    }
  }

  updateFromGesture(snapshot: GestureSnapshot, mode: AudioEffectMode) {
    if (!this.pitchNode || !this.vocoderFilter || !this.talkboxFilter || !this.delay || !this.effectMix) {
      return;
    }

    const normalizedTilt = Math.max(-1, Math.min(1, snapshot.tilt * 12));

    switch (mode) {
      case "vocoder":
        this.pitchNode.delayTime.value = 0.008 + Math.abs(normalizedTilt) * 0.012;
        this.vocoderFilter.frequency.value = 900 + (normalizedTilt + 1) * 550;
        this.vocoderFilter.Q.value = 4.5;
        this.talkboxFilter.frequency.value = 1300;
        this.delay.delayTime.value = 0.12;
        this.effectMix.gain.value = 0.45;
        break;
      case "autotune":
        this.pitchNode.delayTime.value = 0.003 + Math.abs(Math.round(normalizedTilt * 4)) * 0.0015;
        this.vocoderFilter.frequency.value = 1800;
        this.vocoderFilter.Q.value = 2.2 + Math.abs(normalizedTilt) * 2;
        this.talkboxFilter.frequency.value = 2000;
        this.delay.delayTime.value = 0.08;
        this.effectMix.gain.value = 0.16;
        break;
      case "talkbox":
        this.pitchNode.delayTime.value = 0.014;
        this.vocoderFilter.frequency.value = 1200;
        this.vocoderFilter.Q.value = 5.4;
        this.talkboxFilter.frequency.value = 1600 + normalizedTilt * 240;
        this.talkboxFilter.Q.value = 9.5;
        this.delay.delayTime.value = 0.11;
        this.effectMix.gain.value = 0.32;
        break;
      case "recording":
        this.pitchNode.delayTime.value = 0.01;
        this.vocoderFilter.frequency.value = 1500;
        this.talkboxFilter.frequency.value = 1700;
        this.delay.delayTime.value = 0.09;
        this.effectMix.gain.value = 0.2;
        this.startRecording();
        break;
      default:
        this.pitchNode.delayTime.value = 0.008;
        this.vocoderFilter.frequency.value = 1000;
        this.vocoderFilter.Q.value = 2.2;
        this.talkboxFilter.frequency.value = 1450;
        this.talkboxFilter.Q.value = 7;
        this.delay.delayTime.value = 0.08;
        this.effectMix.gain.value = 0.1;
    }

    if (mode !== "recording") {
      this.stopRecording();
    }
  }

  private startRecording() {
    if (!this.mediaRecorder || this.mediaRecorder.state === "recording") {
      return;
    }

    this.mediaRecorder.start();
    this.callbacks.onRecording(true);
  }

  private stopRecording() {
    if (!this.mediaRecorder || this.mediaRecorder.state !== "recording") {
      return;
    }

    this.mediaRecorder.stop();
  }

  dispose() {
    this.stopRecording();
    this.meydaAnalyzer?.stop();
    this.inputStream?.getTracks().forEach((track) => track.stop());
    this.modulationLfo?.dispose();
    this.workletNode?.disconnect();
    this.source?.disconnect();
    this.context?.close();
  }

  private createImpulseResponse(context: AudioContext, seconds: number) {
    const rate = context.sampleRate;
    const length = rate * seconds;
    const impulse = context.createBuffer(2, length, rate);

    for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
      const data = impulse.getChannelData(channel);
      for (let i = 0; i < length; i += 1) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.4);
      }
    }

    return impulse;
  }
}
