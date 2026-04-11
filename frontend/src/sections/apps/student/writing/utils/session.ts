import { intParam } from 'src/hooks/use-url-query-state';

import { countWords } from 'src/sections/apps/common/module-test/utils/scoring';

import type { WritingDraftResponses, WritingPart } from '../api/types';
import { hasWritingEssay } from '../api/utils';

export const writingSessionQuerySchema = {
  task: intParam(1),
};

export function getWritingSuggestedMinWords(order: number) {
  return order === 1 ? 150 : 250;
}

export function getMissingWritingParts(parts: WritingPart[], responses: WritingDraftResponses) {
  return parts.filter((part) => !hasWritingEssay(responses[String(part.id)]));
}

export function countCompletedWritingTasks(parts: WritingPart[], responses: WritingDraftResponses) {
  return parts.filter((part) => hasWritingEssay(responses[String(part.id)])).length;
}

export function getWritingWordCount(partId: number | null | undefined, responses: WritingDraftResponses) {
  if (!partId) {
    return 0;
  }

  return countWords(responses[String(partId)] ?? '');
}
