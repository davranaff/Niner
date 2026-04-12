import * as yup from 'yup';

import {
  requiresReadingFlowChartCompletion,
  requiresReadingHeadingsList,
  requiresReadingQuestionHeading,
  requiresReadingTableCompletion,
} from '../api/utils';

export function createReadingTestSchema(tx: (key: string) => string) {
  return yup.object({
    title: yup.string().trim().required(tx('pages.admin.shared.validation.required')),
    description: yup.string().trim().required(tx('pages.admin.shared.validation.required')),
    timeLimit: yup
      .number()
      .typeError(tx('pages.admin.shared.validation.number'))
      .integer(tx('pages.admin.shared.validation.integer'))
      .positive(tx('pages.admin.shared.validation.positive'))
      .required(tx('pages.admin.shared.validation.required')),
    isActive: yup.boolean().required(),
  });
}

export function createReadingPassageSchema(tx: (key: string) => string) {
  return yup.object({
    title: yup.string().trim().required(tx('pages.admin.shared.validation.required')),
    content: yup.string().trim().required(tx('pages.admin.shared.validation.required')),
    passageNumber: yup
      .number()
      .typeError(tx('pages.admin.shared.validation.number'))
      .integer(tx('pages.admin.shared.validation.integer'))
      .positive(tx('pages.admin.shared.validation.positive'))
      .required(tx('pages.admin.shared.validation.required')),
  });
}

export function createReadingBlockSchema(tx: (key: string) => string) {
  return yup.object({
    title: yup.string().trim().required(tx('pages.admin.shared.validation.required')),
    description: yup.string().trim().required(tx('pages.admin.shared.validation.required')),
    blockType: yup.string().trim().required(tx('pages.admin.shared.validation.required')),
    order: yup
      .number()
      .typeError(tx('pages.admin.shared.validation.number'))
      .integer(tx('pages.admin.shared.validation.integer'))
      .min(0, tx('pages.admin.shared.validation.non_negative'))
      .required(tx('pages.admin.shared.validation.required')),
    questionHeading: yup.string().when('blockType', {
      is: (value: string) => requiresReadingQuestionHeading(value),
      then: (schema) => schema.trim().required(tx('pages.admin.shared.validation.required')),
      otherwise: (schema) => schema.default(''),
    }),
    listOfHeadings: yup.string().when('blockType', {
      is: (value: string) => requiresReadingHeadingsList(value),
      then: (schema) => schema.trim().required(tx('pages.admin.shared.validation.required')),
      otherwise: (schema) => schema.default(''),
    }),
    tableCompletion: yup.string().when('blockType', {
      is: (value: string) => requiresReadingTableCompletion(value),
      then: (schema) => schema.trim().required(tx('pages.admin.shared.validation.required')),
      otherwise: (schema) => schema.default(''),
    }),
    flowChartCompletion: yup.string().when('blockType', {
      is: (value: string) => requiresReadingFlowChartCompletion(value),
      then: (schema) => schema.trim().required(tx('pages.admin.shared.validation.required')),
      otherwise: (schema) => schema.default(''),
    }),
  });
}

export function createReadingQuestionSchema(tx: (key: string) => string) {
  return yup.object({
    questionText: yup.string().trim().required(tx('pages.admin.shared.validation.required')),
    order: yup
      .number()
      .typeError(tx('pages.admin.shared.validation.number'))
      .integer(tx('pages.admin.shared.validation.integer'))
      .min(0, tx('pages.admin.shared.validation.non_negative'))
      .required(tx('pages.admin.shared.validation.required')),
  });
}

export function createReadingOptionSchema(tx: (key: string) => string) {
  return yup.object({
    optionText: yup.string().trim().required(tx('pages.admin.shared.validation.required')),
    isCorrect: yup.boolean().required(),
    order: yup
      .number()
      .typeError(tx('pages.admin.shared.validation.number'))
      .integer(tx('pages.admin.shared.validation.integer'))
      .min(0, tx('pages.admin.shared.validation.non_negative'))
      .required(tx('pages.admin.shared.validation.required')),
  });
}

export function createReadingAnswerSchema(tx: (key: string) => string) {
  return yup.object({
    correctAnswers: yup.string().trim().required(tx('pages.admin.shared.validation.required')),
  });
}
