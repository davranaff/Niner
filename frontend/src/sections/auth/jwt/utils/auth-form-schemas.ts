import * as Yup from 'yup';

type Translate = (key: string, options?: Record<string, string | number>) => string;

export function createLoginSchema(tx: Translate) {
  return Yup.object({
    email: Yup.string()
      .required(tx('auth.validation.email_required'))
      .email(tx('auth.validation.email_invalid')),
    password: Yup.string()
      .required(tx('auth.validation.password_required'))
      .min(8, tx('auth.validation.password_min', { count: 8 })),
  });
}

export function createRegisterSchema(tx: Translate) {
  return Yup.object({
    firstName: Yup.string().required(tx('auth.validation.first_name_required')),
    lastName: Yup.string().required(tx('auth.validation.last_name_required')),
    email: Yup.string()
      .required(tx('auth.validation.email_required'))
      .email(tx('auth.validation.email_invalid')),
    role: Yup.string()
      .oneOf(['student', 'teacher'])
      .required(tx('auth.validation.role_required')),
    password: Yup.string()
      .required(tx('auth.validation.password_required'))
      .min(8, tx('auth.validation.password_min', { count: 8 })),
    passwordConfirm: Yup.string()
      .required(tx('auth.validation.confirm_password_required'))
      .oneOf([Yup.ref('password')], tx('auth.validation.passwords_match')),
  });
}
