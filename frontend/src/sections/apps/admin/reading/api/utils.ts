import type {
  AdminReadingBlock,
  AdminReadingDetail,
  AdminReadingListItem,
  AdminReadingOption,
  AdminReadingPassage,
  AdminReadingQuestion,
  AdminReadingRawAnswerSpec,
  AdminReadingRawBlock,
  AdminReadingRawDetail,
  AdminReadingRawOption,
  AdminReadingRawPassage,
  AdminReadingRawQuestion,
  AdminReadingTestSettings,
} from './types';

export const READING_ADMIN_BATCH_SIZE = 12;

export const READING_BLOCK_TYPES = [
  'matching_headings',
  'matching_paragraph_info',
  'matching_features',
  'matching_sentence_endings',
  'true_false_ng',
  'multiple_choice',
  'list_of_options',
  'choose_title',
  'table_completion',
  'short_answers',
  'sentence_completion',
  'note_completion',
  'summary_completion',
  'flow_chart_completion',
  'diagram_completion',
] as const;

const READING_OPTION_BLOCK_TYPES = new Set<string>([
  'matching_headings',
  'matching_paragraph_info',
  'matching_features',
  'matching_sentence_endings',
  'true_false_ng',
  'multiple_choice',
  'list_of_options',
  'choose_title',
]);

const READING_ANSWER_BLOCK_TYPES = new Set<string>([
  'table_completion',
  'short_answers',
  'sentence_completion',
  'note_completion',
  'summary_completion',
  'flow_chart_completion',
  'diagram_completion',
]);

export function humanizeAdminValue(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toAdminReadingOption(option: AdminReadingRawOption): AdminReadingOption {
  return {
    id: option.id,
    optionText: option.optionText,
    isCorrect: option.isCorrect,
    order: option.order,
  };
}

function toAdminReadingQuestion(question: AdminReadingRawQuestion): AdminReadingQuestion {
  return {
    id: question.id,
    questionText: question.questionText,
    order: question.order,
    number: question.number,
    answerType: question.answerType,
    inputVariant: question.inputVariant,
    options: question.options.map(toAdminReadingOption),
  };
}

function toAdminReadingAnswerSpec(spec: AdminReadingRawAnswerSpec) {
  return {
    answerType: spec.answerType,
    inputVariant: spec.inputVariant,
    optionsMode: spec.optionsMode ?? null,
    maxWords: spec.maxWords ?? null,
  };
}

function toAdminReadingBlock(block: AdminReadingRawBlock): AdminReadingBlock {
  return {
    id: block.id,
    title: block.title,
    description: block.description,
    blockType: block.blockType,
    order: block.order,
    answerSpec: toAdminReadingAnswerSpec(block.answerSpec),
    questions: block.questions.map(toAdminReadingQuestion),
    questionHeading: block.questionHeading ?? null,
    listOfHeadings: block.listOfHeadings ?? null,
    tableJson: block.tableJson ?? null,
    flowChartCompletion: block.flowChartCompletion ?? null,
  };
}

function toAdminReadingPassage(passage: AdminReadingRawPassage): AdminReadingPassage {
  return {
    id: passage.id,
    title: passage.title,
    content: passage.content,
    passageNumber: passage.passageNumber,
    partNumber: passage.partNumber,
    questionBlocks: passage.questionBlocks.map(toAdminReadingBlock),
    questionsCount: passage.questionsCount,
  };
}

export function toAdminReadingListItem(item: AdminReadingListItem) {
  return {
    id: item.id,
    title: item.title,
    description: item.description,
    timeLimit: item.timeLimit,
    isActive: item.isActive,
  };
}

export function mergeAdminReadingDetail(
  detail: AdminReadingRawDetail,
  settings: AdminReadingTestSettings
): AdminReadingDetail {
  const passages = detail.passages.map(toAdminReadingPassage);
  const parts = detail.parts.map(toAdminReadingPassage);

  return {
    ...settings,
    createdAt: detail.createdAt,
    passages,
    parts,
  };
}

export function supportsReadingOptions(blockType: string) {
  return READING_OPTION_BLOCK_TYPES.has(blockType);
}

export function supportsReadingAnswers(blockType: string) {
  return READING_ANSWER_BLOCK_TYPES.has(blockType);
}

export function requiresReadingQuestionHeading(blockType: string) {
  return blockType === 'note_completion';
}

export function requiresReadingHeadingsList(blockType: string) {
  return blockType === 'matching_headings';
}

export function requiresReadingTableCompletion(blockType: string) {
  return blockType === 'table_completion';
}

export function requiresReadingFlowChartCompletion(blockType: string) {
  return blockType === 'flow_chart_completion';
}
