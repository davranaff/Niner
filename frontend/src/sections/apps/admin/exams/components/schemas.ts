import * as yup from 'yup';

export function createWritingReviewSchema(tx: (key: string) => string) {
  return yup.object({
    examPartId: yup
      .string()
      .trim()
      .matches(/^\d+$/, tx('pages.admin.shared.validation.integer'))
      .required(tx('pages.admin.shared.validation.required')),
    isChecked: yup.boolean().required(),
    corrections: yup.string().default(''),
    score: yup
      .string()
      .trim()
      .test(
        'score-format',
        tx('pages.admin.shared.validation.number'),
        (value) => !value || !value.length || !Number.isNaN(Number(value))
      ),
  });
}
