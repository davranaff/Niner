import { HOST_API } from 'src/config-global';

interface SpeakingOutputCallbacks {
  onStart?: () => void;
  onEnd?: (interrupted: boolean) => void;
}

function normalizeSpeechText(text: string) {
  return text
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.;:?])/g, '$1')
    .replace(/\bGood morning\b/i, 'Good morning,')
    .replace(/\bAll right\b/i, 'All right,')
    .replace(/\bOkay\b/i, 'Okay,')
    .replace(/\bNow I'd like to ask you\b/i, "Now, I'd like to ask you")
    .replace(/\bNow I would like to ask you\b/i, 'Now, I would like to ask you')
    .trim();
}

function fallbackDuration(text: string) {
  return Math.max(1600, text.split(/\s+/).length * 280);
}

function scoreVoice(voice: SpeechSynthesisVoice) {
  const name = `${voice.name} ${voice.lang}`.toLowerCase();
  let score = 0;

  if (name.includes('en-gb')) score += 5;
  if (name.includes('grandma') || name.includes('serena') || name.includes('sonia')) score += 3;
  if (name.includes('ryan') || name.includes('libby') || name.includes('aria')) score += 2;
  if (name.includes('natural')) score += 4;
  if (name.includes('premium')) score += 4;
  if (name.includes('enhanced')) score += 3;
  if (name.includes('neural')) score += 3;
  if (name.includes('google')) score += 2;
  if (name.includes('microsoft')) score += 2;
  if (name.includes('samantha') || name.includes('libby') || name.includes('aria')) score += 2;
  if (voice.localService) score += 1;

  return score;
}

function getTtsEndpoint() {
  const base = String(HOST_API ?? '').trim().replace(/\/$/, '');
  if (base) {
    return `${base}/api/v1/speaking/tts`;
  }

  return '/api/v1/speaking/tts';
}

function browserSpeechSynthesisSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

function selectBestSpeechVoice() {
  if (!browserSpeechSynthesisSupported()) {
    return undefined;
  }

  const voices = window.speechSynthesis.getVoices();
  return [...voices].sort((left, right) => scoreVoice(right) - scoreVoice(left))[0];
}

export class SpeakingAudioOutputController {
  private utterance?: SpeechSynthesisUtterance;

  private fallbackTimerId?: number;

  private audioElement?: HTMLAudioElement;

  private objectUrl?: string;

  private abortController?: AbortController;

  private activeToken = 0;

  private enabled = true;

  setEnabled(next: boolean) {
    this.enabled = next;
    if (!next) {
      this.interrupt();
    }
  }

  private async tryBackendTts(text: string, token: number, callbacks: SpeakingOutputCallbacks) {
    try {
      this.abortController = new AbortController();
      const response = await fetch(getTtsEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: normalizeSpeechText(text),
          voice: process.env.REACT_APP_SPEAKING_TTS_VOICE,
        }),
        signal: this.abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`TTS request failed with status ${response.status}`);
      }

      const blob = await response.blob();
      if (this.activeToken !== token) {
        return true;
      }

      this.audioElement = new Audio();
      this.objectUrl = URL.createObjectURL(blob);
      this.audioElement.src = this.objectUrl;
      this.audioElement.volume = 0.66;
      this.audioElement.onended = () => {
        if (this.activeToken === token) {
          callbacks.onEnd?.(false);
        }
      };
      this.audioElement.onerror = () => {
        if (this.activeToken === token) {
          callbacks.onEnd?.(false);
        }
      };
      await this.audioElement.play();
      return true;
    } catch (error) {
      if (!(error instanceof DOMException && error.name === 'AbortError')) {
        console.error('Backend TTS playback failed:', error);
      }
      return false;
    }
  }

  private speakWithBrowserVoices(text: string, token: number, callbacks: SpeakingOutputCallbacks) {
    if (!browserSpeechSynthesisSupported()) {
      this.fallbackTimerId = window.setTimeout(() => {
        if (this.activeToken === token) {
          callbacks.onEnd?.(false);
        }
      }, fallbackDuration(text));
      return;
    }

    const utterance = new SpeechSynthesisUtterance(normalizeSpeechText(text));
    const voice = selectBestSpeechVoice();
    this.utterance = utterance;
    utterance.lang = voice?.lang || 'en-GB';
    utterance.voice = voice ?? null;
    utterance.rate = voice?.lang.toLowerCase().includes('en-gb') ? 0.9 : 0.93;
    utterance.pitch = 0.94;
    utterance.volume = 0.76;
    utterance.onend = () => {
      if (this.activeToken === token) {
        callbacks.onEnd?.(false);
      }
    };
    utterance.onerror = () => {
      if (this.activeToken === token) {
        callbacks.onEnd?.(false);
      }
    };

    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  }

  async speak(text: string, callbacks: SpeakingOutputCallbacks = {}) {
    this.interrupt();

    const token = Date.now();
    this.activeToken = token;
    callbacks.onStart?.();

    if (!this.enabled) {
      callbacks.onEnd?.(false);
      return;
    }

    const playedByBackend = await this.tryBackendTts(text, token, callbacks);
    if (this.activeToken !== token) {
      return;
    }

    if (playedByBackend) {
      return;
    }

    this.speakWithBrowserVoices(text, token, callbacks);
  }

  interrupt() {
    if (this.fallbackTimerId) {
      window.clearTimeout(this.fallbackTimerId);
      this.fallbackTimerId = undefined;
    }

    if (this.abortController) {
      this.abortController.abort();
      this.abortController = undefined;
    }

    if (this.audioElement) {
      this.audioElement.pause();
      this.audioElement.src = '';
      this.audioElement = undefined;
    }

    if (this.objectUrl) {
      URL.revokeObjectURL(this.objectUrl);
      this.objectUrl = undefined;
    }

    if (browserSpeechSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }

    this.activeToken += 1;
    this.utterance = undefined;
  }

  destroy() {
    this.interrupt();
  }
}
