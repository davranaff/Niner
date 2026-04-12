import {
  DEFAULT_MIN_SPEECH_MS,
  DEFAULT_NOISE_THRESHOLD,
  DEFAULT_SILENCE_THRESHOLD_MS,
} from '../constants';

type SpeechRecognitionResultLike = {
  isFinal: boolean;
  0?: {
    transcript?: string;
  };
};

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: SpeechRecognitionResultLike[];
};

type SpeechRecognitionErrorEventLike = {
  error: string;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeakingAudioInputCallbacks {
  onLevel: (level: number) => void;
  onSpeechStart: () => void;
  onSpeechEnd: (text: string) => void;
  onTranscript: (text: string, isFinal: boolean) => void;
  onPermissionChange: (permission: 'prompt' | 'granted' | 'denied' | 'unsupported') => void;
  onRecognitionSupport: (supported: boolean) => void;
  onError: (message: string) => void;
}

interface ExaminerPlaybackOptions {
  interrupted?: boolean;
}

function recognitionConstructor(): SpeechRecognitionCtor | null {
  const maybeWindow = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };

  return maybeWindow.SpeechRecognition || maybeWindow.webkitSpeechRecognition || null;
}

export class SpeakingAudioInputController {
  private mediaStream?: MediaStream;

  private audioContext?: AudioContext;

  private analyser?: AnalyserNode;

  private sourceNode?: MediaStreamAudioSourceNode;

  private frameId?: number;

  private speechEndTimerId?: number;

  private recognitionRestartTimerId?: number;

  private recognition?: SpeechRecognitionLike;

  private manuallyStoppedRecognition = false;

  private recognitionSupported = false;

  private recognitionRestartAttempts = 0;

  private examinerPlaybackActive = false;

  private running = false;

  private muted = false;

  private voiceActive = false;

  private aboveThresholdSince = 0;

  private lastVoiceAt = 0;

  private lastTranscriptAt = 0;

  private speechStartedAt = 0;

  private finalTranscript = '';

  private interimTranscript = '';

  private smoothedLevel = 0;

  private ambientLevel = 0.008;

  private speechStartShieldUntil = 0;

  private transcriptShieldUntil = 0;

  private noiseThreshold = DEFAULT_NOISE_THRESHOLD;

  private silenceThresholdMs = DEFAULT_SILENCE_THRESHOLD_MS;

  private minSpeechMs = DEFAULT_MIN_SPEECH_MS;

  constructor(private callbacks: SpeakingAudioInputCallbacks) {}

  private syncTrackEnabledState() {
    const shouldEnableTrack = !this.muted && !this.examinerPlaybackActive;
    this.mediaStream?.getAudioTracks().forEach((track) => {
      track.enabled = shouldEnableTrack;
    });
  }

  async startMicrophone() {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      this.callbacks.onPermissionChange('unsupported');
      this.callbacks.onError('Microphone input is not available in this browser.');
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      this.running = true;
      this.callbacks.onPermissionChange('granted');

      const track = this.mediaStream.getAudioTracks()[0];
      this.syncTrackEnabledState();
      track.onended = () => {
        this.callbacks.onPermissionChange('denied');
        this.callbacks.onError('Microphone permission was lost.');
      };

      this.audioContext = new AudioContext();
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.analyser = this.audioContext.createAnalyser();
      this.analyser.fftSize = 2048;
      this.sourceNode.connect(this.analyser);

      this.monitorLevels();
      this.startRecognition();
    } catch {
      this.callbacks.onPermissionChange('denied');
      this.callbacks.onError('Microphone access was denied.');
    }
  }

  stopMicrophone() {
    this.running = false;
    this.voiceActive = false;
    this.aboveThresholdSince = 0;
    this.lastVoiceAt = 0;
    this.finalTranscript = '';
    this.interimTranscript = '';

    if (this.frameId) {
      window.cancelAnimationFrame(this.frameId);
      this.frameId = undefined;
    }

    if (this.speechEndTimerId) {
      window.clearTimeout(this.speechEndTimerId);
      this.speechEndTimerId = undefined;
    }

    if (this.recognitionRestartTimerId) {
      window.clearTimeout(this.recognitionRestartTimerId);
      this.recognitionRestartTimerId = undefined;
    }

    if (this.recognition) {
      this.manuallyStoppedRecognition = true;
      this.recognition.stop();
      this.recognition = undefined;
    }

    this.sourceNode?.disconnect();
    this.analyser?.disconnect();
    this.mediaStream?.getTracks().forEach((track) => track.stop());
    if (this.audioContext) {
      this.audioContext.close().catch((error) => {
        console.error('Microphone audio context close failed:', error);
      });
    }
    this.callbacks.onLevel(0);
  }

  muteMicrophone() {
    this.muted = true;
    this.syncTrackEnabledState();
  }

  unmuteMicrophone() {
    this.muted = false;
    this.syncTrackEnabledState();

    if (this.running && this.recognitionSupported && !this.examinerPlaybackActive) {
      this.scheduleRecognitionRestart(180);
    }
  }

  setNoiseThreshold(value: number) {
    this.noiseThreshold = value;
  }

  setSilenceThresholdMs(value: number) {
    this.silenceThresholdMs = value;
  }

  setExaminerPlaybackActive(active: boolean, options: ExaminerPlaybackOptions = {}) {
    if (this.examinerPlaybackActive === active) {
      return;
    }

    this.examinerPlaybackActive = active;
    this.syncTrackEnabledState();

    if (active) {
      this.clearPendingSpeechEnd();
      if (this.recognitionRestartTimerId) {
        window.clearTimeout(this.recognitionRestartTimerId);
        this.recognitionRestartTimerId = undefined;
      }
      this.voiceActive = false;
      this.aboveThresholdSince = 0;
      this.lastVoiceAt = 0;
      this.speechStartedAt = 0;
      this.finalTranscript = '';
      this.interimTranscript = '';
      this.lastTranscriptAt = 0;
      this.transcriptShieldUntil = performance.now() + 380;
      this.stopRecognitionSession();
      return;
    }

    const cooldownMs = options.interrupted ? 460 : 1700;
    const speechShieldMs = options.interrupted ? 900 : 2400;
    const now = performance.now();
    this.speechStartShieldUntil = now + speechShieldMs;
    this.transcriptShieldUntil = now + speechShieldMs;
    this.scheduleRecognitionRestart(cooldownMs);
  }

  forceCompleteSpeechTurn() {
    this.clearPendingSpeechEnd();

    if (!this.voiceActive && !this.finalTranscript && !this.interimTranscript) {
      return;
    }

    this.voiceActive = false;
    this.aboveThresholdSince = 0;
    this.callbacks.onSpeechEnd(this.composeTranscript());
  }

  private startRecognition() {
    const RecognitionCtor = recognitionConstructor();

    if (!RecognitionCtor) {
      this.recognitionSupported = false;
      this.callbacks.onRecognitionSupport(false);
      return;
    }

    this.recognitionSupported = true;
    this.callbacks.onRecognitionSupport(true);
    const recognition = new RecognitionCtor();
    this.manuallyStoppedRecognition = false;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-GB';
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const now = performance.now();
      if (this.examinerPlaybackActive || now < this.transcriptShieldUntil) {
        return;
      }

      let rollingFinal = this.finalTranscript;
      let rollingInterim = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result[0]?.transcript?.trim();

        if (text) {
          if (result.isFinal) {
            rollingFinal = `${rollingFinal} ${text}`.trim();
          } else {
            rollingInterim = `${rollingInterim} ${text}`.trim();
          }
        }
      }

      this.lastTranscriptAt = now;
      this.finalTranscript = rollingFinal;
      this.interimTranscript = rollingInterim;

      if (!this.voiceActive && !this.muted && `${rollingFinal} ${rollingInterim}`.trim().length > 4) {
        this.clearPendingSpeechEnd();
        this.voiceActive = true;
        this.aboveThresholdSince = now;
        this.speechStartedAt = now;
        this.lastVoiceAt = now;
        this.callbacks.onSpeechStart();
      }

      this.callbacks.onTranscript(`${rollingFinal} ${rollingInterim}`.trim(), rollingInterim.length === 0);
    };
    recognition.onerror = (event) => {
      if (event.error === 'no-speech' || event.error === 'aborted') {
        return;
      }

      this.callbacks.onError(`Speech recognition event: ${event.error}.`);
    };
    recognition.onend = () => {
      if (this.running && !this.manuallyStoppedRecognition && !this.examinerPlaybackActive) {
        this.scheduleRecognitionRestart(260);
      }
    };

    this.recognition = recognition;

    try {
      recognition.start();
      this.recognitionRestartAttempts = 0;
    } catch {
      this.recognition = undefined;
      this.scheduleRecognitionRestart(420);
    }
  }

  private composeTranscript() {
    const combined = `${this.finalTranscript} ${this.interimTranscript}`.trim();
    this.finalTranscript = '';
    this.interimTranscript = '';
    this.lastTranscriptAt = 0;

    return combined || 'Response captured in live session.';
  }

  private getSpeechStartThreshold() {
    const baseThreshold = Math.max(this.noiseThreshold, this.ambientLevel * 3.2, 0.018);
    if (!this.examinerPlaybackActive) {
      return baseThreshold;
    }

    return Math.max(baseThreshold * 2.3, this.ambientLevel * 6, 0.05);
  }

  private getSpeechReleaseThreshold() {
    const baseThreshold = Math.max(this.noiseThreshold * 0.58, this.ambientLevel * 1.8, 0.012);
    if (!this.examinerPlaybackActive) {
      return baseThreshold;
    }

    return Math.max(baseThreshold * 1.9, this.ambientLevel * 4.2, 0.028);
  }

  private stopRecognitionSession() {
    if (!this.recognition) {
      return;
    }

    this.manuallyStoppedRecognition = true;

    try {
      this.recognition.stop();
    } catch {
      // Ignore restart/stop races from the browser speech engine.
    }
  }

  private scheduleRecognitionRestart(delayMs: number) {
    if (!this.running || !this.recognitionSupported) {
      return;
    }

    if (this.recognitionRestartTimerId) {
      window.clearTimeout(this.recognitionRestartTimerId);
    }

    this.recognitionRestartTimerId = window.setTimeout(() => {
      if (!this.running || this.examinerPlaybackActive || this.muted) {
        return;
      }

      this.recognitionRestartTimerId = undefined;

      let started = false;

      if (this.recognition) {
        this.manuallyStoppedRecognition = false;
        try {
          this.recognition.start();
          started = true;
        } catch {
          this.recognition = undefined;
        }
      }

      if (!started) {
        this.startRecognition();
        started = Boolean(this.recognition);
      }

      if (started) {
        this.recognitionRestartAttempts = 0;
        return;
      }

      this.recognitionRestartAttempts += 1;
      if (this.recognitionRestartAttempts >= 3) {
        this.callbacks.onError('Speech recognition could not be restarted. Please press Reconnect.');
        this.recognitionRestartAttempts = 0;
      }

      this.scheduleRecognitionRestart(720);
    }, delayMs);
  }

  private clearPendingSpeechEnd() {
    if (this.speechEndTimerId) {
      window.clearTimeout(this.speechEndTimerId);
      this.speechEndTimerId = undefined;
    }
  }

  private finalizeSpeechTurn() {
    this.clearPendingSpeechEnd();

    if (!this.voiceActive) {
      return;
    }

    this.voiceActive = false;
    this.aboveThresholdSince = 0;
    this.callbacks.onSpeechEnd(this.composeTranscript());
  }

  private scheduleSpeechEnd() {
    if (this.speechEndTimerId) {
      return;
    }

    this.speechEndTimerId = window.setTimeout(() => {
      const now = performance.now();
      const transcriptRecentlyUpdated = this.lastTranscriptAt > 0 && now - this.lastTranscriptAt < 320;

      if (
        this.voiceActive &&
        now - this.lastVoiceAt >= this.silenceThresholdMs &&
        now - this.speechStartedAt >= this.minSpeechMs &&
        !transcriptRecentlyUpdated
      ) {
        this.finalizeSpeechTurn();
        return;
      }

      this.speechEndTimerId = undefined;
    }, 260);
  }

  private monitorLevels = () => {
    if (!this.analyser) {
      return;
    }

    const data = new Uint8Array(this.analyser.fftSize);
    this.analyser.getByteTimeDomainData(data);

    let sumSquares = 0;
    for (let index = 0; index < data.length; index += 1) {
      const normalized = (data[index] - 128) / 128;
      sumSquares += normalized * normalized;
    }

    const rms = Math.sqrt(sumSquares / data.length);
    this.smoothedLevel = this.smoothedLevel === 0 ? rms : this.smoothedLevel * 0.82 + rms * 0.18;
    const level = this.smoothedLevel;

    if (!this.voiceActive && !this.examinerPlaybackActive) {
      this.ambientLevel = this.ambientLevel * 0.97 + Math.min(level, this.noiseThreshold) * 0.03;
    }

    this.callbacks.onLevel(this.examinerPlaybackActive ? 0 : level);

    if (this.examinerPlaybackActive || this.muted) {
      this.clearPendingSpeechEnd();
      this.voiceActive = false;
      this.aboveThresholdSince = 0;
      this.lastVoiceAt = 0;
      this.speechStartedAt = 0;
      this.frameId = window.requestAnimationFrame(this.monitorLevels);
      return;
    }

    const now = performance.now();
    const shieldActive = now < this.speechStartShieldUntil;
    const startThreshold = shieldActive
      ? Math.max(this.getSpeechStartThreshold() * 1.95, 0.072)
      : this.getSpeechStartThreshold();
    const releaseThreshold = shieldActive
      ? Math.max(this.getSpeechReleaseThreshold() * 1.6, 0.034)
      : this.getSpeechReleaseThreshold();
    const aboveStartThreshold = level >= startThreshold;
    const aboveReleaseThreshold = level >= releaseThreshold;
    const requiredSpeechMs = shieldActive ? this.minSpeechMs + 160 : this.minSpeechMs;

    if (aboveStartThreshold) {
      this.lastVoiceAt = now;
      this.clearPendingSpeechEnd();

      if (!this.voiceActive) {
        if (this.aboveThresholdSince === 0) {
          this.aboveThresholdSince = now;
        }

        if (now - this.aboveThresholdSince >= requiredSpeechMs) {
          this.voiceActive = true;
          this.speechStartedAt = now;
          this.callbacks.onSpeechStart();
        }
      }
    } else {
      this.aboveThresholdSince = 0;

      if (this.voiceActive) {
        if (aboveReleaseThreshold) {
          this.lastVoiceAt = now;
          this.clearPendingSpeechEnd();
        } else if (
          now - this.lastVoiceAt >= this.silenceThresholdMs &&
          now - this.speechStartedAt >= this.minSpeechMs
        ) {
          this.scheduleSpeechEnd();
        }
      }
    }

    this.frameId = window.requestAnimationFrame(this.monitorLevels);
  };
}
