import type { MockQuestionAnswerValue } from 'src/_mock/ielts';

const MIN_FONT_SCALE = 0.9;
const MAX_FONT_SCALE = 1.15;
const FONT_SCALE_STEP = 0.05;

export function hasAnswerValue(value?: MockQuestionAnswerValue) {
  if (typeof value === 'undefined') return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some((item) => item.trim().length > 0);
  return Object.values(value).some((item) => item.trim().length > 0);
}

export function formatSessionTimer(totalSeconds?: number | null) {
  if (typeof totalSeconds !== 'number') {
    return '--:--';
  }

  const safe = Math.max(0, totalSeconds);
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function increaseFontScale(previous: number) {
  return Math.min(MAX_FONT_SCALE, Number((previous + FONT_SCALE_STEP).toFixed(2)));
}

export function decreaseFontScale(previous: number) {
  return Math.max(MIN_FONT_SCALE, Number((previous - FONT_SCALE_STEP).toFixed(2)));
}

export function getPassageParagraphs(body?: string) {
  return body?.split(/\n{2,}/).filter(Boolean) || [];
}
