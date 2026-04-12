import type { SpeakingQuestion } from '../types';

function hashSeed(seed: string) {
  let hash = 0;
  const maxUint32 = 4294967296;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) % maxUint32;
  }

  return hash;
}

function pickVariant(seed: string, variants: string[]) {
  return variants[hashSeed(seed) % variants.length];
}

function hasLeadIn(text: string) {
  return /^(now|let us|let's|i would like|i'd like|all right|okay|thank you)\b/i.test(text.trim());
}

function lowerFirst(value: string) {
  if (!value) {
    return value;
  }

  return value.charAt(0).toLowerCase() + value.slice(1);
}

function normalizeCueTopic(topic: string) {
  const trimmed = topic.trim().replace(/\.$/, '');
  if (/^describe\s+/i.test(trimmed)) {
    return lowerFirst(trimmed.replace(/^describe\s+/i, ''));
  }

  return lowerFirst(trimmed);
}

function joinSegments(...parts: Array<string | undefined>) {
  return parts
    .filter((part): part is string => Boolean(part && part.trim()))
    .map((part) => part.trim())
    .join(' ');
}

export function buildQuestionPrompt(question: SpeakingQuestion, previousQuestion?: SpeakingQuestion) {
  if (question.partId !== 'part1' || !previousQuestion || previousQuestion.partId !== 'part1') {
    return question.prompt;
  }

  if (hasLeadIn(question.prompt)) {
    return question.prompt;
  }

  const leadIn = pickVariant(`${previousQuestion.id}:${question.id}:topic`, [
    `Now I'd like to ask you about ${question.shortLabel.toLowerCase()}.`,
    `Let us talk about ${question.shortLabel.toLowerCase()}.`,
    `Now let us move on to ${question.shortLabel.toLowerCase()}.`,
  ]);

  return `${leadIn} ${question.prompt}`;
}

export function buildPreparationCompletePrompt(question: SpeakingQuestion) {
  return pickVariant(`${question.id}:prep-complete`, [
    'All right. You can begin now.',
    'All right. Please start speaking now.',
    'Okay. You can begin now.',
  ]);
}

export function buildNoAnswerReprompt(question: SpeakingQuestion, inPreparation: boolean) {
  if (question.partId === 'part2') {
    return inPreparation
      ? pickVariant(`${question.id}:prep-reminder`, [
          'Take your time. Use this moment to make a few brief notes.',
          'Take your time. Use this time to prepare what you want to say.',
        ])
      : pickVariant(`${question.id}:part2-start-reminder`, [
          'Take your time. You can begin when you are ready.',
          'All right. Please start when you are ready.',
        ]);
  }

  return pickVariant(`${question.id}:no-answer`, [
    `Take your time. ${question.rephrasePrompt ?? question.prompt}`,
    question.rephrasePrompt ?? question.prompt,
  ]);
}

export function buildRescuePrompt(question: SpeakingQuestion) {
  if (question.partId === 'part2') {
    return pickVariant(`${question.id}:rescue`, [
      'That is all right. Just describe one situation that comes to mind.',
      'That is fine. Just tell me about one example you remember.',
    ]);
  }

  if (question.partId === 'part3') {
    return pickVariant(`${question.id}:rescue`, [
      'That is fine. Just give me your general view.',
      'That is all right. What is your opinion on this?',
    ]);
  }

  return pickVariant(`${question.id}:rescue`, [
    'That is fine. Just tell me a little about your own experience.',
    'That is all right. Just say a little about that.',
  ]);
}

export function buildRedirectPrompt(question: SpeakingQuestion) {
  return pickVariant(`${question.id}:redirect`, [
    `I am asking specifically about ${question.shortLabel.toLowerCase()}. ${question.rephrasePrompt ?? question.prompt}`,
    `Let us focus on ${question.shortLabel.toLowerCase()}. ${question.rephrasePrompt ?? question.prompt}`,
  ]);
}

export function buildRephrasePrompt(question: SpeakingQuestion) {
  return pickVariant(`${question.id}:rephrase`, [
    question.rephrasePrompt ?? question.prompt,
    `Certainly. ${question.rephrasePrompt ?? question.prompt}`,
    `Of course. ${question.rephrasePrompt ?? question.prompt}`,
  ]);
}

export function buildMoveOnLeadIn(question: SpeakingQuestion, wasCutOff: boolean) {
  if (question.partId === 'part2') {
    return pickVariant(
      `${question.id}:${wasCutOff}:part2-close`,
      wasCutOff ? ['Thank you.', 'All right. Thank you.'] : ['Thank you.']
    );
  }

  return pickVariant(
    `${question.id}:${wasCutOff}:move-on`,
    wasCutOff
      ? ['All right. Thank you.', 'Okay. Thank you.', 'Thank you.']
      : ['All right.', 'Okay.', 'Thank you.']
  );
}

export function buildPart2Introduction(question: SpeakingQuestion) {
  const {cueCard} = question;
  const topic = cueCard ? normalizeCueTopic(cueCard.topic) : 'the topic on your screen';

  return pickVariant(`${question.id}:part2-intro`, [
    `Now I am going to give you a topic. I would like you to talk about ${topic}. You will have one minute to prepare, and then I would like you to speak for one to two minutes.`,
    `Now I would like you to talk about ${topic}. You will have one minute to prepare, and then I would like you to speak for one to two minutes.`,
  ]);
}

export function buildPart3Transition(question: SpeakingQuestion, leadIn?: string) {
  const bridge = pickVariant(`${question.id}:part3-bridge`, [
    'Now I would like to ask you some more general questions about this.',
    'Let us talk more generally about this topic.',
    'I would like to ask you some broader questions about this.',
  ]);

  return joinSegments(leadIn ?? 'Thank you.', bridge, question.prompt);
}

export function buildClosingPrompt(leadIn?: string) {
  return joinSegments(
    leadIn ?? 'Thank you.',
    pickVariant(`closing:${leadIn ?? 'default'}`, [
      'That is the end of the speaking test.',
      'This is the end of the speaking test.',
    ])
  );
}
