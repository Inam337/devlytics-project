import { z } from 'zod';

import { AppConstants } from '@/common/AppConstants';

import type { TranslationFunction } from './types';

/** Mirrors the backend's PASSWORD_RULE exactly — client and server reject the same passwords. */
export const createPasswordField = (t: TranslationFunction, requiredKey: string, requiredDefault: string) =>
  z
    .string()
    .min(1, t(requiredKey, requiredDefault))
    .regex(
      AppConstants.Validations.Password,
      t(
        'common.text.passwordPolicy',
        'Password must be at least 12 characters and include upper case, lower case, a digit and a symbol',
      ),
    );
