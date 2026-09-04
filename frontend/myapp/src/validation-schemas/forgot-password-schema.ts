import { z } from 'zod';

import { createEmailField } from './email-field';
import type { TranslationFunction } from './types';

export const createForgotPasswordSchema = (t: TranslationFunction) =>
  z.object({
    email: createEmailField(t, {
      requiredKey: 'auth.forgotPassword.errors.emailRequired',
      requiredDefault: 'Email is required',
      invalidKey: 'auth.forgotPassword.errors.invalidEmail',
      invalidDefault: 'Please enter a valid email address',
    }),
  });

export type ForgotPasswordFormData = z.infer<ReturnType<typeof createForgotPasswordSchema>>;

export const forgotPasswordFormDefaultValues: ForgotPasswordFormData = {
  email: '',
};
