import { z } from 'zod';

import { createPasswordField } from './password-field';
import type { TranslationFunction } from './types';

export const createAcceptInvitationSchema = (t: TranslationFunction) =>
  z
    .object({
      password: createPasswordField(
        t,
        'auth.acceptInvitation.errors.passwordRequired',
        'Password is required',
      ),
      confirmPassword: z
        .string()
        .min(
          1,
          t(
            'auth.acceptInvitation.errors.confirmPasswordRequired',
            'Please confirm your password',
          ),
        ),
    })
    .refine(data => data.password === data.confirmPassword, {
      message: t('auth.acceptInvitation.errors.passwordMismatch', 'Passwords do not match'),
      path: ['confirmPassword'],
    });

export type AcceptInvitationFormData = z.infer<ReturnType<typeof createAcceptInvitationSchema>>;

export const acceptInvitationFormDefaultValues: AcceptInvitationFormData = {
  password: '',
  confirmPassword: '',
};
