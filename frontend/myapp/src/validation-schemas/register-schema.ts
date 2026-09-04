import { z } from 'zod';

import { AppConstants } from '@/common/AppConstants';

import { createEmailField } from './email-field';
import type { TranslationFunction } from './types';

export const createRegisterSchema = (t: TranslationFunction) =>
  z
    .object({
      name: z
        .string()
        .min(1, t('auth.register.errors.nameRequired', 'Name is required'))
        .min(2, t('auth.register.errors.nameMinLength', 'Name must be at least 2 characters')),
      email: createEmailField(t, {
        requiredKey: 'auth.register.errors.emailRequired',
        requiredDefault: 'Email is required',
        invalidKey: 'auth.register.errors.invalidEmail',
        invalidDefault: 'Please enter a valid email address',
      }),
      password: z
        .string()
        .min(1, t('auth.register.errors.passwordRequired', 'Password is required'))
        .min(
          AppConstants.Validations.PasswordLength,
          t(
            'auth.register.errors.passwordMinLength',
            'Password must be at least {min} characters',
            { min: AppConstants.Validations.PasswordLength },
          ),
        ),
      confirmPassword: z
        .string()
        .min(
          1,
          t('auth.register.errors.confirmPasswordRequired', 'Please confirm your password'),
        ),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('auth.register.errors.passwordMismatch', 'Passwords do not match'),
      path: ['confirmPassword'],
    });

export type RegisterFormData = z.infer<ReturnType<typeof createRegisterSchema>>;

export const registerFormDefaultValues: RegisterFormData = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
};
