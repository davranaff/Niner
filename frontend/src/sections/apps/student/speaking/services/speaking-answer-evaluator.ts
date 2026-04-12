import type { SpeakingAnswerEvaluation, SpeakingQuestion } from '../types';

interface SpeakingAnswerEvaluationInput {
  transcript: string;
  question: SpeakingQuestion;
  examinerPrompt: string;
  durationMs: number;
  timeSinceExaminerEndedMs: number | null;
  userTurnBudgetMs: number;
  wasCutOff: boolean;
  followUpsUsed: number;
}

const STOP_WORDS = new Set([
  'the',
  'and',
  'that',
  'with',
  'have',
  'this',
  'from',
  'your',
  'about',
  'would',
  'there',
  'could',
  'what',
  'when',
  'where',
  'which',
  'they',
  'them',
  'their',
  'because',
  'really',
  'just',
  'into',
  'like',
]);

const NO_ANSWER_PATTERNS = [
  /\bi do not know\b/i,
  /\bi don't know\b/i,
  /\bi am not sure\b/i,
  /\bi'm not sure\b/i,
  /\bno idea\b/i,
  /\bnothing comes to mind\b/i,
  /\bhard to say\b/i,
  /\bi cannot remember\b/i,
  /\bi can't remember\b/i,
];

const REPHRASE_PATTERNS = [
  /^\s*sorry[?.! ]*$/i,
  /^\s*pardon[?.! ]*$/i,
  /\bcould you repeat\b/i,
  /\bcan you repeat\b/i,
  /\bsay that again\b/i,
  /\brepeat the question\b/i,
  /\bi do not understand\b/i,
  /\bi don't understand\b/i,
  /\bi did not catch that\b/i,
  /\bi didn't catch that\b/i,
  /\bwhat do you mean\b/i,
  /\bcould you say that again\b/i,
  /\bcan you say that again\b/i,
  /\bi didn't get the question\b/i,
];

const FILLER_PATTERNS = [/^(um|uh|er|ah|well)\b/i, /\byou know\b/i, /\blet me think\b/i, /\bhmm\b/i];

const PROFANITY_PATTERNS = [/\bfuck\b/i, /\bshit\b/i, /\bbitch\b/i, /\basshole\b/i, /\bmotherfucker\b/i];

function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function contentTokens(text: string) {
  return normalizeText(text)
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function uniqueContentTokens(text: string) {
  return new Set(contentTokens(text));
}

function overlapRatio(left: string, right: string) {
  const leftTokens = uniqueContentTokens(left);
  const rightTokens = uniqueContentTokens(right);

  if (leftTokens.size === 0 || rightTokens.size === 0) {
    return 0;
  }

  let overlap = 0;
  leftTokens.forEach((token) => {
    if (rightTokens.has(token)) {
      overlap += 1;
    }
  });

  return overlap / leftTokens.size;
}

function hasAnyPattern(text: string, patterns: RegExp[]) {
  return patterns.some((pattern) => pattern.test(text));
}

function getMinimumWordExpectation(question: SpeakingQuestion) {
  if (question.partId === 'part2') {
    return 34;
  }

  if (question.partId === 'part3') {
    return 16;
  }

  return 10;
}

function getMinimumDurationExpectation(question: SpeakingQuestion) {
  if (question.partId === 'part2') {
    return 24000;
  }

  if (question.partId === 'part3') {
    return 9000;
  }

  return 5500;
}

function getQuestionContext(question: SpeakingQuestion) {
  return [
    question.shortLabel,
    question.prompt,
    question.rephrasePrompt,
    question.cueCard?.topic,
    ...(question.cueCard?.bulletPoints ?? []),
  ]
    .filter(Boolean)
    .join(' ');
}

function looksFirstPerson(text: string) {
  return /\b(i|my|me|we|our)\b/i.test(text);
}

function hasReasoning(text: string) {
  return /\b(because|so|since|for example|for instance|as a result|in my opinion|i think)\b/i.test(text);
}

export function evaluateSpeakingAnswer(input: SpeakingAnswerEvaluationInput): SpeakingAnswerEvaluation {
  const cleanedTranscript = input.transcript.trim();
  const normalizedTranscript = normalizeText(cleanedTranscript);
  const normalizedExaminer = normalizeText(input.examinerPrompt);
  const wordCount = cleanedTranscript.split(/\s+/).filter(Boolean).length;
  const questionContext = getQuestionContext(input.question);
  const promptOverlapRatio = overlapRatio(cleanedTranscript, input.examinerPrompt);
  const questionOverlapRatio = overlapRatio(cleanedTranscript, questionContext);
  const combinedOverlap = Math.max(promptOverlapRatio, questionOverlapRatio);
  const placeholderCapture = cleanedTranscript === 'Response captured in live session.';
  const treatedAsSilent = placeholderCapture;
  const canBeEchoWindow =
    input.timeSinceExaminerEndedMs !== null &&
    input.timeSinceExaminerEndedMs >= 0 &&
    input.timeSinceExaminerEndedMs < 3200;
  const exactExaminerEcho =
    normalizedTranscript.length > 0 &&
    (normalizedTranscript === normalizedExaminer ||
      normalizedExaminer.includes(normalizedTranscript) ||
      normalizedTranscript.includes(normalizedExaminer));
  const isEchoLeak =
    !placeholderCapture &&
    (exactExaminerEcho ||
      (canBeEchoWindow &&
        combinedOverlap >= 0.58 &&
        wordCount <= input.examinerPrompt.split(/\s+/).length + 8 &&
        input.durationMs < 14000));

  if (isEchoLeak) {
    return {
      action: 'discard_echo',
      reason: 'Candidate transcript matched examiner speech and was filtered as speaker bleed.',
      cleanedTranscript: '',
      hasRealAnswer: false,
      isEchoLeak: true,
      isRelevant: false,
      isShort: false,
      isIncomplete: false,
      isRescueNeeded: false,
      isRedirectNeeded: false,
      isTooLong: false,
      overlapRatio: combinedOverlap,
      wordCount,
    };
  }

  if (hasAnyPattern(cleanedTranscript, REPHRASE_PATTERNS)) {
    return {
      action: 'rephrase',
      reason: 'Candidate asked for the question to be repeated or clarified.',
      cleanedTranscript,
      hasRealAnswer: false,
      isEchoLeak: false,
      isRelevant: false,
      isShort: true,
      isIncomplete: true,
      isRescueNeeded: false,
      isRedirectNeeded: false,
      isTooLong: false,
      overlapRatio: combinedOverlap,
      wordCount,
    };
  }

  if (treatedAsSilent) {
    return {
      action: 'rescue_prompt',
      reason: 'No usable verbal answer was captured.',
      cleanedTranscript: '',
      hasRealAnswer: false,
      isEchoLeak: false,
      isRelevant: false,
      isShort: true,
      isIncomplete: true,
      isRescueNeeded: true,
      isRedirectNeeded: false,
      isTooLong: false,
      overlapRatio: combinedOverlap,
      wordCount: 0,
    };
  }

  if (hasAnyPattern(cleanedTranscript, PROFANITY_PATTERNS)) {
    return {
      action: 'gentle_redirect',
      reason: 'Candidate response was abusive or unusable, so the examiner should redirect to the task.',
      cleanedTranscript,
      hasRealAnswer: false,
      isEchoLeak: false,
      isRelevant: false,
      isShort: true,
      isIncomplete: true,
      isRescueNeeded: false,
      isRedirectNeeded: true,
      isTooLong: false,
      overlapRatio: combinedOverlap,
      wordCount,
    };
  }

  if (hasAnyPattern(cleanedTranscript, NO_ANSWER_PATTERNS)) {
    return {
      action: 'rescue_prompt',
      reason: 'Candidate signalled that they did not know how to respond.',
      cleanedTranscript,
      hasRealAnswer: false,
      isEchoLeak: false,
      isRelevant: false,
      isShort: true,
      isIncomplete: true,
      isRescueNeeded: true,
      isRedirectNeeded: false,
      isTooLong: false,
      overlapRatio: combinedOverlap,
      wordCount,
    };
  }

  const mostlyFiller =
    wordCount <= 8 &&
    hasAnyPattern(cleanedTranscript, FILLER_PATTERNS) &&
    !looksFirstPerson(cleanedTranscript) &&
    !hasReasoning(cleanedTranscript);

  if (mostlyFiller) {
    return {
      action: 'rescue_prompt',
      reason: 'Candidate hesitated without giving a developed answer.',
      cleanedTranscript,
      hasRealAnswer: false,
      isEchoLeak: false,
      isRelevant: false,
      isShort: true,
      isIncomplete: true,
      isRescueNeeded: true,
      isRedirectNeeded: false,
      isTooLong: false,
      overlapRatio: combinedOverlap,
      wordCount,
    };
  }

  const minimumWords = getMinimumWordExpectation(input.question);
  const minimumDurationMs = getMinimumDurationExpectation(input.question);
  const isShort = wordCount < minimumWords || input.durationMs < minimumDurationMs;
  const isTooLong = input.wasCutOff || input.durationMs >= input.userTurnBudgetMs * 0.92;
  const likelyRelevant =
    questionOverlapRatio >= 0.12 ||
    (input.question.partId !== 'part3' && looksFirstPerson(cleanedTranscript)) ||
    (input.question.partId === 'part3' && hasReasoning(cleanedTranscript)) ||
    wordCount >= minimumWords + 10;
  const isRedirectNeeded = !likelyRelevant && !isShort && input.followUpsUsed === 0;

  if (isTooLong) {
    return {
      action: 'soft_cutoff',
      reason: 'Candidate answer was long enough for the examiner to move on.',
      cleanedTranscript,
      hasRealAnswer: true,
      isEchoLeak: false,
      isRelevant: likelyRelevant,
      isShort: false,
      isIncomplete: false,
      isRescueNeeded: false,
      isRedirectNeeded: false,
      isTooLong: true,
      overlapRatio: combinedOverlap,
      wordCount,
    };
  }

  if (isRedirectNeeded) {
    return {
      action: 'gentle_redirect',
      reason: 'Candidate answer did not clearly address the question.',
      cleanedTranscript,
      hasRealAnswer: true,
      isEchoLeak: false,
      isRelevant: false,
      isShort: false,
      isIncomplete: true,
      isRescueNeeded: false,
      isRedirectNeeded: true,
      isTooLong: false,
      overlapRatio: combinedOverlap,
      wordCount,
    };
  }

  if (isShort && input.followUpsUsed < 1) {
    return {
      action: 'follow_up',
      reason: 'Candidate answer was relevant but not developed enough.',
      cleanedTranscript,
      hasRealAnswer: true,
      isEchoLeak: false,
      isRelevant: true,
      isShort: true,
      isIncomplete: true,
      isRescueNeeded: false,
      isRedirectNeeded: false,
      isTooLong: false,
      overlapRatio: combinedOverlap,
      wordCount,
    };
  }

  return {
    action: input.question.partId === 'part3' ? 'transition_to_next_topic' : 'move_on',
    reason: 'Candidate gave a usable answer and the examiner can continue the test.',
    cleanedTranscript,
    hasRealAnswer: true,
    isEchoLeak: false,
    isRelevant: likelyRelevant,
    isShort,
    isIncomplete: isShort,
    isRescueNeeded: false,
    isRedirectNeeded: false,
    isTooLong: false,
    overlapRatio: combinedOverlap,
    wordCount,
  };
}
