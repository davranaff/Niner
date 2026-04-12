import * as yup from 'yup';

import { requiresListeningTableCompletion } from '../api/utils';

export function createListeningTestSchema(tx: (key: string) => string) {
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
    voiceUrl: yup.string().trim().default(''),
  });
}

export function createListeningPartSchema(tx: (key: string) => string) {
  return yup.object({
    title: yup.string().trim().required(tx('pages.admin.shared.validation.required')),
    order: yup
      .number()
      .typeError(tx('pages.admin.shared.validation.number'))
      .integer(tx('pages.admin.shared.validation.integer'))
      .min(0, tx('pages.admin.shared.validation.non_negative'))
      .required(tx('pages.admin.shared.validation.required')),
  });
}

export function createListeningBlockSchema(tx: (key: string) => string) {
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
    tableCompletion: yup.string().when('blockType', {
      is: (value: string) => requiresListeningTableCompletion(value),
      then: (schema) => schema.trim().required(tx('pages.admin.shared.validation.required')),
      otherwise: (schema) => schema.default(''),
    }),
  });
}

export function createListeningQuestionSchema(tx: (key: string) => string) {
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

export function createListeningOptionSchema(tx: (key: string) => string) {
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

export function createListeningAnswerSchema(tx: (key: string) => string) {
  return yup.object({
    correctAnswers: yup.string().trim().required(tx('pages.admin.shared.validation.required')),
  });
}
