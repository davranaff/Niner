import type {
  AdminListeningBlock,
  AdminListeningDetail,
  AdminListeningOption,
  AdminListeningPart,
  AdminListeningQuestion,
  AdminListeningRawAnswerSpec,
  AdminListeningRawBlock,
  AdminListeningRawDetail,
  AdminListeningRawOption,
  AdminListeningRawPart,
  AdminListeningRawQuestion,
  AdminListeningTestSettings,
} from './types';

export const LISTENING_ADMIN_BATCH_SIZE = 12;

export const LISTENING_BLOCK_TYPES = [
  'matching',
  'list_of_options',
  'multiple_choice',
  'note_completion',
  'form_completion',
  'table_completion',
  'sentence_completion',
  'summary_completion',
  'short_answer',
  'short_answer_multiple',
  'map_plan_labelling',
  'diagram_flowchart_completion',
] as const;

const LISTENING_OPTION_BLOCK_TYPES = new Set<string>([
  'matching',
  'list_of_options',
  'multiple_choice',
  'map_plan_labelling',
]);

const LISTENING_ANSWER_BLOCK_TYPES = new Set<string>([
  'note_completion',
  'form_completion',
  'table_completion',
  'sentence_completion',
  'summary_completion',
  'short_answer',
  'short_answer_multiple',
  'diagram_flowchart_completion',
]);

export function humanizeAdminValue(value: string) {
  return value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function toAdminListeningOption(option: AdminListeningRawOption): AdminListeningOption {
  return {
    id: option.id,
    optionText: option.optionText,
    order: option.order,
  };
}

function toAdminListeningQuestion(question: AdminListeningRawQuestion): AdminListeningQuestion {
  return {
    id: question.id,
    questionText: question.questionText,
    order: question.order,
    number: question.number,
    answerType: question.answerType,
    inputVariant: question.inputVariant,
    options: question.options.map(toAdminListeningOption),
  };
}

function toAdminListeningAnswerSpec(spec: AdminListeningRawAnswerSpec) {
  return {
    answerType: spec.answerType,
    inputVariant: spec.inputVariant,
    optionsMode: spec.optionsMode ?? null,
    maxWords: spec.maxWords ?? null,
  };
}

function toAdminListeningBlock(block: AdminListeningRawBlock): AdminListeningBlock {
  return {
    id: block.id,
    title: block.title,
    description: block.description,
    blockType: block.blockType,
    order: block.order,
    answerSpec: toAdminListeningAnswerSpec(block.answerSpec),
    questions: block.questions.map(toAdminListeningQuestion),
    tableJson: block.tableJson ?? null,
  };
}

function toAdminListeningPart(part: AdminListeningRawPart): AdminListeningPart {
  return {
    id: part.id,
    title: part.title,
    order: part.order,
    partNumber: part.partNumber,
    questionBlocks: part.questionBlocks.map(toAdminListeningBlock),
    questionsCount: part.questionsCount,
  };
}

export function mergeAdminListeningDetail(
  detail: AdminListeningRawDetail,
  settings: AdminListeningTestSettings
): AdminListeningDetail {
  return {
    ...settings,
    createdAt: detail.createdAt,
    audioUrl: detail.audioUrl ?? null,
    parts: detail.parts.map(toAdminListeningPart),
  };
}

export function supportsListeningOptions(blockType: string) {
  return LISTENING_OPTION_BLOCK_TYPES.has(blockType);
}

export function supportsListeningAnswers(blockType: string) {
  return LISTENING_ANSWER_BLOCK_TYPES.has(blockType);
}

export function requiresListeningTableCompletion(blockType: string) {
  return blockType === 'table_completion';
}
