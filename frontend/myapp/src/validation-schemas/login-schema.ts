import { z } from 'zod';

import { createEmailField } from './email-field';
import type { TranslationFunction } from './types';

export const createLoginSchema = (t: TranslationFunction) =>
  z.object({
    email: createEmailField(t, {
      requiredKey: 'auth.login.errors.emailRequired',
      requiredDefault: 'Email is required',
      invalidKey: 'auth.login.errors.invalidFormat',
      invalidDefault: 'Please enter a valid email address',
    }),
    password: z
      .string()
      .min(1, t('auth.login.errors.passwordRequired', 'Password is required')),
  });

export type LoginFormData = z.infer<ReturnType<typeof createLoginSchema>>;

export const loginFormDefaultValues: LoginFormData = {
  email: '',
  password: '',
};
