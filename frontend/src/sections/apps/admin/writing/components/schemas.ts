import * as yup from 'yup';

export function createWritingTestSchema(tx: (key: string) => string) {
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

export function createWritingPartSchema(tx: (key: string) => string) {
  return yup.object({
    order: yup
      .number()
      .typeError(tx('pages.admin.shared.validation.number'))
      .integer(tx('pages.admin.shared.validation.integer'))
      .min(0, tx('pages.admin.shared.validation.non_negative'))
      .required(tx('pages.admin.shared.validation.required')),
    task: yup.string().trim().required(tx('pages.admin.shared.validation.required')),
    imageUrl: yup.string().trim().default(''),
    fileUrlsText: yup.string().default(''),
  });
}
