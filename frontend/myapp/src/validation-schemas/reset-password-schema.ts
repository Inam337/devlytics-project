import { z } from 'zod';

import { createPasswordField } from './password-field';
import type { TranslationFunction } from './types';

export const createResetPasswordSchema = (t: TranslationFunction) =>
  z
    .object({
      newPassword: createPasswordField(
        t,
        'auth.resetPassword.errors.newPasswordRequired',
        'New password is required',
      ),
      confirmNewPassword: z
        .string()
        .min(
          1,
          t(
            'auth.resetPassword.errors.confirmPasswordRequired',
            'Please confirm your new password',
          ),
        ),
    })
    .refine(data => data.newPassword === data.confirmNewPassword, {
      message: t('auth.resetPassword.errors.passwordMismatch', 'Passwords do not match'),
      path: ['confirmNewPassword'],
    });

export type ResetPasswordFormData = z.infer<ReturnType<typeof createResetPasswordSchema>>;

export const resetPasswordFormDefaultValues: ResetPasswordFormData = {
  newPassword: '',
  confirmNewPassword: '',
};
