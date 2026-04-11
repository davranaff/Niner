import type {
  MockQuestion,
  MockQuestionAnswerValue,
  MockWritingPrompt,
  MockWritingRubric,
} from 'src/_mock/ielts';

const BAND_TABLE = [
  { min: 39, band: 9 },
  { min: 37, band: 8.5 },
  { min: 35, band: 8 },
  { min: 33, band: 7.5 },
  { min: 30, band: 7 },
  { min: 27, band: 6.5 },
  { min: 23, band: 6 },
  { min: 19, band: 5.5 },
  { min: 15, band: 5 },
  { min: 12, band: 4.5 },
  { min: 10, band: 4 },
  { min: 8, band: 3.5 },
  { min: 6, band: 3 },
  { min: 4, band: 2.5 },
  { min: 0, band: 2 },
] as const;

function normalizeText(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function countWords(content: string) {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

export function stringifyAnswerValue(value?: MockQuestionAnswerValue) {
  if (typeof value === 'undefined') return 'No answer';
  if (typeof value === 'string') return value;
  if (Array.isArray(value)) return value.join(', ');
  return Object.entries(value)
    .map(([key, answer]) => `${key}: ${answer}`)
    .join(' | ');
}

export function rawScoreToBand(rawScore: number) {
  return BAND_TABLE.find((item) => rawScore >= item.min)?.band || 2;
}

export function scaleScoreToForty(rawScore: number, totalQuestions: number) {
  if (!totalQuestions) return 0;
  return Math.round((rawScore / totalQuestions) * 40);
}

export function roundToNearestHalf(value: number) {
  return Math.round(value * 2) / 2;
}

export function writingRubricToBand(rubric: MockWritingRubric) {
  return roundToNearestHalf(
    (rubric.taskAchievement +
      rubric.coherence +
      rubric.lexicalResource +
      rubric.grammarRangeAccuracy) /
      4
  );
}

type AnswerEvaluation = {
  correct: boolean;
  partial: boolean;
  matchedCount: number;
  totalCount: number;
};

function compareString(expected: string, actual: string) {
  return normalizeText(expected) === normalizeText(actual);
}

export function evaluateQuestionAnswer(
  question: MockQuestion,
  userValue?: MockQuestionAnswerValue
): AnswerEvaluation {
  if (typeof userValue === 'undefined') {
    return { correct: false, partial: false, matchedCount: 0, totalCount: 1 };
  }

  if (typeof question.correctAnswer === 'string') {
    const match = typeof userValue === 'string' && compareString(question.correctAnswer, userValue);

    return { correct: match, partial: false, matchedCount: match ? 1 : 0, totalCount: 1 };
  }

  if (Array.isArray(question.correctAnswer)) {
    const actual = Array.isArray(userValue) ? userValue : [String(userValue)];
    const totalCount = question.correctAnswer.length;
    const matchedCount = question.correctAnswer.filter((value, index) =>
      compareString(value, actual[index] || '')
    ).length;

    return {
      correct: matchedCount === totalCount,
      partial: matchedCount > 0 && matchedCount < totalCount,
      matchedCount,
      totalCount,
    };
  }

  const actual = typeof userValue === 'object' && !Array.isArray(userValue) ? userValue : {};
  const entries = Object.entries(question.correctAnswer);
  const matchedCount = entries.filter(([key, value]) =>
    compareString(value, actual[key] || '')
  ).length;
  const totalCount = entries.length;

  return {
    correct: matchedCount === totalCount,
    partial: matchedCount > 0 && matchedCount < totalCount,
    matchedCount,
    totalCount,
  };
}

export function evaluateWritingSubmission(
  responses: Record<string, string>,
  prompts: MockWritingPrompt[]
): MockWritingRubric {
  const promptOne = prompts[0];
  const promptTwo = prompts[1];
  const wordsOne = countWords(responses[promptOne?.id] || '');
  const wordsTwo = countWords(responses[promptTwo?.id] || '');

  const coverageOne = promptOne ? Math.min(1, wordsOne / promptOne.minWords) : 0.5;
  const coverageTwo = promptTwo ? Math.min(1, wordsTwo / promptTwo.minWords) : 0.5;
  const combinedText = Object.values(responses).join(' ').trim();
  const lexicalSignal = new Set(
    combinedText
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 4)
  ).size;
  const sentenceSignal = combinedText.split(/[.!?]+/).filter(Boolean).length;

  const taskAchievement = 5 + coverageOne * 0.9 + coverageTwo * 1.1;
  const coherence = 5 + Math.min(1.5, sentenceSignal / 10);
  const lexicalResource = 5 + Math.min(2, lexicalSignal / 45);
  const grammarRangeAccuracy = 5 + Math.min(2, combinedText.length / 500);

  return {
    taskAchievement: roundToNearestHalf(Math.min(taskAchievement, 8)),
    coherence: roundToNearestHalf(Math.min(coherence, 8)),
    lexicalResource: roundToNearestHalf(Math.min(lexicalResource, 8)),
    grammarRangeAccuracy: roundToNearestHalf(Math.min(grammarRangeAccuracy, 8)),
  };
}
