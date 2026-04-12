import * as yup from 'yup';

export function createLessonCategorySchema(tx: (key: string) => string) {
  return yup.object({
    title: yup.string().trim().required(tx('pages.admin.shared.validation.required')),
    slug: yup.string().trim().required(tx('pages.admin.shared.validation.required')),
  });
}

export function createLessonSchema(tx: (key: string) => string) {
  return yup.object({
    categoryId: yup
      .number()
      .typeError(tx('pages.admin.shared.validation.number'))
      .integer(tx('pages.admin.shared.validation.integer'))
      .positive(tx('pages.admin.shared.validation.positive'))
      .required(tx('pages.admin.shared.validation.required')),
    title: yup.string().trim().required(tx('pages.admin.shared.validation.required')),
    videoLink: yup.string().trim().required(tx('pages.admin.shared.validation.required')),
  });
}
