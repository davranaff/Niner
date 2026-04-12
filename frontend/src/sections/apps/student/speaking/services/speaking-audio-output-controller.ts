import { synthesizeSpeakingTts } from '../api/speaking-requests';

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
      const audioBuffer = await synthesizeSpeakingTts(
        {
          text: normalizeSpeechText(text),
          voice: process.env.REACT_APP_SPEAKING_TTS_VOICE,
        },
        this.abortController.signal
      );
      const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
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
      const aborted =
        (error instanceof DOMException && error.name === 'AbortError') ||
        (typeof error === 'object' &&
          error !== null &&
          'name' in error &&
          String((error as { name?: unknown }).name) === 'CanceledError');

      if (!aborted) {
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
