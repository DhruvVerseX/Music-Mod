"use client";

import * as Tone from "tone";
import Meyda from "meyda";
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
  private dryGain?: GainNode;
  private outputGain?: GainNode;
  private analyser?: AnalyserNode;
  private workletNode?: AudioWorkletNode;
  private reverb?: Tone.Reverb;
  private feedbackDelay?: Tone.FeedbackDelay;
  private pitchShift?: Tone.PitchShift;
  private autoFilter?: Tone.AutoFilter;
  private destination?: MediaStreamAudioDestinationNode;
  private mediaRecorder?: MediaRecorder;
  private recorderChunks: Blob[] = [];
  private meydaAnalyzer?: Meyda.MeydaAnalyzer;

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
      this.dryGain = this.context.createGain();
      this.outputGain = this.context.createGain();
      this.analyser = this.context.createAnalyser();
      this.workletNode = new AudioWorkletNode(this.context, "vocal-processor");
      this.destination = this.context.createMediaStreamDestination();

      this.inputGain.gain.value = 1;
      this.outputGain.gain.value = 0.8;
      this.analyser.fftSize = 1024;

      this.reverb = new Tone.Reverb({
        decay: 1.8,
        wet: 0.18
      }).toDestination();
      this.feedbackDelay = new Tone.FeedbackDelay({
        delayTime: 0.12,
        feedback: 0.24,
        wet: 0.1
      }).connect(this.reverb);
      this.pitchShift = new Tone.PitchShift({
        pitch: 0,
        wet: 0.3
      }).connect(this.feedbackDelay);
      this.autoFilter = new Tone.AutoFilter({
        frequency: 0.4,
        depth: 0.7,
        wet: 0.15
      }).connect(this.pitchShift);
      this.autoFilter.start();

      const toneInput = new Tone.UserMedia();
      // Reuse the already opened media stream instead of prompting again.
      (toneInput as unknown as { _stream: MediaStream })._stream = stream;
      (toneInput as unknown as { _mediaStreamSource: MediaStreamAudioSourceNode })._mediaStreamSource = this.source;
      toneInput.connect(this.autoFilter);

      this.source.connect(this.inputGain);
      this.inputGain.connect(this.workletNode);
      this.workletNode.connect(this.dryGain);
      this.dryGain.connect(this.analyser);
      this.analyser.connect(this.outputGain);
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
        callback: (features) => {
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
    if (!this.pitchShift || !this.autoFilter || !this.feedbackDelay || !this.reverb) {
      return;
    }

    const normalizedTilt = Math.max(-1, Math.min(1, snapshot.tilt * 12));

    switch (mode) {
      case "vocoder":
        this.pitchShift.pitch = normalizedTilt * 7;
        this.autoFilter.wet.value = 0.45;
        this.feedbackDelay.wet.value = 0.18;
        this.reverb.wet.value = 0.22;
        break;
      case "autotune":
        this.pitchShift.pitch = Math.round(normalizedTilt * 4);
        this.autoFilter.wet.value = 0.14;
        this.feedbackDelay.wet.value = 0.08;
        this.reverb.wet.value = 0.1;
        break;
      case "talkbox":
        this.pitchShift.pitch = 2;
        this.autoFilter.wet.value = 0.62;
        this.feedbackDelay.wet.value = 0.12;
        this.reverb.wet.value = 0.28;
        break;
      case "recording":
        this.pitchShift.pitch = 0;
        this.autoFilter.wet.value = 0.2;
        this.feedbackDelay.wet.value = 0.08;
        this.reverb.wet.value = 0.12;
        this.startRecording();
        break;
      default:
        this.pitchShift.pitch = 0;
        this.autoFilter.wet.value = 0.12;
        this.feedbackDelay.wet.value = 0.05;
        this.reverb.wet.value = 0.08;
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
    this.autoFilter?.dispose();
    this.pitchShift?.dispose();
    this.feedbackDelay?.dispose();
    this.reverb?.dispose();
    this.workletNode?.disconnect();
    this.source?.disconnect();
    this.context?.close();
  }
}
