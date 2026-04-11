import { intParam } from 'src/hooks/use-url-query-state';

import { hasReadingAnswer } from '../api/utils';

import type { ReadingDraftAnswers, ReadingPart, ReadingQuestionWithContext } from '../api/types';

export const readingSessionQuerySchema = {
  passage: intParam(1),
};

export function countAnsweredReadingQuestions(
  questions: ReadingQuestionWithContext[],
  answers: ReadingDraftAnswers
) {
  return questions.filter((item) => hasReadingAnswer(answers[String(item.question.id)])).length;
}

export function getUnansweredReadingQuestions(
  questions: ReadingQuestionWithContext[],
  answers: ReadingDraftAnswers
) {
  return questions.filter((item) => !hasReadingAnswer(answers[String(item.question.id)]));
}

export function getMissingChoiceReadingQuestions(
  questions: ReadingQuestionWithContext[],
  answers: ReadingDraftAnswers
) {
  return getUnansweredReadingQuestions(questions, answers).filter(
    (item) => item.answerSpec.answerType === 'single_choice'
  );
}

export function getReadingSelectedQuestionRangeLabel(selectedPassage: ReadingPart | null) {
  const questionNumbers = selectedPassage?.questionBlocks
    .flatMap((block) => block.questions.map((question) => question.number))
    .sort((left, right) => left - right);

  if (!questionNumbers?.length) {
    return '';
  }

  return `${questionNumbers[0]}-${questionNumbers[questionNumbers.length - 1]}`;
}

export function buildReadingNavigatorItems(
  questions: ReadingQuestionWithContext[],
  answers: ReadingDraftAnswers,
  activeQuestionId: string
) {
  return questions.map((item) => ({
    id: String(item.question.id),
    label: String(item.question.number),
    answered: hasReadingAnswer(answers[String(item.question.id)]),
    active: String(item.question.id) === activeQuestionId,
  }));
}
