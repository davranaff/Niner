import axios from 'axios';

import type { BaseError } from 'src/hooks/api/types';

import { errorReader } from './error-reader';

export type AuthFormContext = 'login' | 'register';

function readApiField(data: unknown, key: 'code' | 'message' | 'detail'): string {
  if (data && typeof data === 'object' && key in data) {
    const value = (data as Record<string, unknown>)[key];
    return typeof value === 'string' ? value.toLowerCase() : '';
  }
  return '';
}

/**
 * User-facing copy for JWT login / register forms (Russian).
 */
export function getAuthFormErrorMessage(error: unknown, context: AuthFormContext): string {
  if (!axios.isAxiosError(error)) {
    if (error instanceof Error) {
      return error.message;
    }
    return typeof error === 'string' ? error : 'Не удалось выполнить запрос. Попробуйте ещё раз.';
  }

  const status = error.response?.status;
  const data = error.response?.data;
  const code = readApiField(data, 'code');
  const message = readApiField(data, 'message');
  const detail = readApiField(data, 'detail');

  if ((status === 400 || status === 401) && context === 'login') {
    if (
      code.includes('invalid_credentials') ||
      detail.includes('no active account') ||
      detail.includes('credentials') ||
      detail.includes('authentication') ||
      message.includes('invalid email or password')
    ) {
      return 'Неверный email или пароль. Проверьте данные и попробуйте снова.';
    }
    return 'Неверный email или пароль. Если забыли пароль — воспользуйтесь восстановлением (когда будет доступно).';
  }

  if (status === 403 && context === 'login') {
    if (code.includes('inactive_user') || message.includes('account is not active')) {
      return 'Аккаунт ещё не активирован. Подтвердите регистрацию или обратитесь к администратору.';
    }
  }

  if (status === 401 && context === 'register') {
    return 'Запрос отклонён. Выйдите из аккаунта или обновите страницу и попробуйте снова.';
  }

  if (status === 409 && context === 'register') {
    if (code.includes('email_exists') || message.includes('already exists')) {
      return 'Пользователь с таким email уже зарегистрирован. Войдите или используйте другой адрес.';
    }
  }

  if (status === 400 || status === 403 || status === 422) {
    return errorReader(error as BaseError);
  }

  if (status === 404) {
    return 'Адрес API не найден. Проверьте настройки сервера.';
  }

  if (status === 429) {
    return 'Слишком много попыток. Подождите немного и попробуйте снова.';
  }

  if (status !== undefined && status >= 500) {
    return 'Ошибка на сервере. Попробуйте позже или напишите в поддержку.';
  }

  if (status === undefined || status === 0) {
    return 'Нет связи с сервером. Проверьте интернет и что backend запущен.';
  }

  return errorReader(error as BaseError);
}
