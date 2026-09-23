import { z } from 'zod';

import { createPasswordField } from './password-field';
import type { TranslationFunction } from './types';

export const createChangePasswordSchema = (t: TranslationFunction) =>
  z
    .object({
      currentPassword: z
        .string()
        .min(
          1,
          t(
            'auth.profile.errors.currentPasswordRequired',
            'Current password is required',
          ),
        ),
      newPassword: createPasswordField(
        t,
        'auth.profile.errors.newPasswordRequired',
        'New password is required',
      ),
      confirmNewPassword: z
        .string()
        .min(
          1,
          t(
            'auth.profile.errors.confirmNewPasswordRequired',
            'Please confirm your new password',
          ),
        ),
    })
    .refine(data => data.newPassword === data.confirmNewPassword, {
      message: t(
        'auth.profile.errors.passwordMismatch',
        'New passwords do not match',
      ),
      path: ['confirmNewPassword'],
    })
    .refine(data => data.currentPassword !== data.newPassword, {
      message: t(
        'auth.profile.errors.sameAsCurrent',
        'New password must be different from your current password',
      ),
      path: ['newPassword'],
    });

export type ChangePasswordFormData = z.infer<
  ReturnType<typeof createChangePasswordSchema>
>;

export const changePasswordFormDefaultValues: ChangePasswordFormData = {
  currentPassword: '',
  newPassword: '',
  confirmNewPassword: '',
};
