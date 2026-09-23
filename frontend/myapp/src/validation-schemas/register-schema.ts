import { z } from 'zod';

import { createEmailField } from './email-field';
import { createPasswordField } from './password-field';
import type { TranslationFunction } from './types';

export const createRegisterSchema = (t: TranslationFunction) =>
  z
    .object({
      firstName: z
        .string()
        .min(1, t('auth.register.errors.firstNameRequired', 'First name is required')),
      lastName: z
        .string()
        .min(1, t('auth.register.errors.lastNameRequired', 'Last name is required')),
      email: createEmailField(t, {
        requiredKey: 'auth.register.errors.emailRequired',
        requiredDefault: 'Email is required',
        invalidKey: 'auth.register.errors.invalidEmail',
        invalidDefault: 'Please enter a valid email address',
      }),
      organizationName: z
        .string()
        .min(
          2,
          t(
            'auth.register.errors.organizationNameRequired',
            'Organization name must be at least 2 characters',
          ),
        ),
      password: createPasswordField(
        t,
        'auth.register.errors.passwordRequired',
        'Password is required',
      ),
      confirmPassword: z
        .string()
        .min(
          1,
          t('auth.register.errors.confirmPasswordRequired', 'Please confirm your password'),
        ),
      agreeToTerms: z.boolean().refine(value => value, {
        message: t(
          'auth.register.errors.termsRequired',
          'You must agree to the terms to continue',
        ),
      }),
    })
    .refine(data => data.password === data.confirmPassword, {
      message: t('auth.register.errors.passwordMismatch', 'Passwords do not match'),
      path: ['confirmPassword'],
    });

export type RegisterFormData = z.infer<ReturnType<typeof createRegisterSchema>>;

export const registerFormDefaultValues: RegisterFormData = {
  firstName: '',
  lastName: '',
  email: '',
  organizationName: '',
  password: '',
  confirmPassword: '',
  agreeToTerms: false,
};
