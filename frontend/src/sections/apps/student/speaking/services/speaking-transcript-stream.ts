interface TranscriptStreamCallbacks {
  onUpdate: (text: string) => void;
  onComplete?: (text: string) => void;
}

export class SpeakingTranscriptStream {
  private timerId?: number;

  private currentText = '';

  start(text: string, callbacks: TranscriptStreamCallbacks) {
    this.cancel();

    const words = text.split(/\s+/).filter(Boolean);
    let index = 0;

    const tick = () => {
      this.currentText = words.slice(0, index + 1).join(' ');
      callbacks.onUpdate(this.currentText);
      index += 1;

      if (index >= words.length) {
        callbacks.onComplete?.(text);
        return;
      }

      const previousWord = words[index - 1] ?? '';
      let punctuationDelay = 0;
      if (/[.?!]$/.test(previousWord)) {
        punctuationDelay = 240;
      } else if (/[,;:]$/.test(previousWord)) {
        punctuationDelay = 130;
      }
      this.timerId = window.setTimeout(
        tick,
        105 + Math.min(150, (words[index] ?? '').length * 11) + punctuationDelay
      );
    };

    this.timerId = window.setTimeout(tick, 80);
  }

  cancel() {
    if (this.timerId) {
      window.clearTimeout(this.timerId);
    }

    this.timerId = undefined;
    this.currentText = '';
  }
}
