import { intParam } from 'src/hooks/use-url-query-state';

import { hasListeningAnswer } from '../api/utils';

import type {
  ListeningDraftAnswers,
  ListeningPart,
  ListeningQuestionWithContext,
} from '../api/types';

export const listeningSessionQuerySchema = {
  section: intParam(1),
};

export function countAnsweredListeningQuestions(
  questions: ListeningQuestionWithContext[],
  answers: ListeningDraftAnswers
) {
  return questions.filter((item) => hasListeningAnswer(answers[String(item.question.id)])).length;
}

export function getUnansweredListeningQuestions(
  questions: ListeningQuestionWithContext[],
  answers: ListeningDraftAnswers
) {
  return questions.filter((item) => !hasListeningAnswer(answers[String(item.question.id)]));
}

export function getListeningSelectedQuestionRangeLabel(selectedPart: ListeningPart | null) {
  const questionNumbers = selectedPart?.questionBlocks
    .flatMap((block) => block.questions.map((question) => question.number))
    .sort((left, right) => left - right);

  if (!questionNumbers?.length) {
    return '';
  }

  return `${questionNumbers[0]}-${questionNumbers[questionNumbers.length - 1]}`;
}

export function buildListeningNavigatorItems(
  questions: ListeningQuestionWithContext[],
  answers: ListeningDraftAnswers,
  activeQuestionId: string
) {
  return questions.map((item) => ({
    id: String(item.question.id),
    label: String(item.question.number),
    answered: hasListeningAnswer(answers[String(item.question.id)]),
    active: String(item.question.id) === activeQuestionId,
  }));
}
