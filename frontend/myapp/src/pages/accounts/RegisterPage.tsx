import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';

import { AppConstants } from '@/common/AppConstants';
import { useAuthTranslation } from '@/hooks/use-auth-translation';
import AppButton from '@/components/ui/AppButton';
import FieldError from '@/components/ui/FieldError';
import { FormInput } from '@/components/ui/FormInput';
import AuthPageLayout from '@/components/layouts/AuthPageLayout';
import PasswordInput from '@/components/ui/PasswordInput';
import { useAuthStore } from '@/stores/auth';
import {
  createRegisterSchema,
  registerFormDefaultValues,
  type RegisterFormData,
} from '@/validation-schemas';

import AuthFormLayout from './AuthFormLayout';

export default function RegisterPage() {
  const { t, resolveAuthMessage } = useAuthTranslation();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const registerUser = useAuthStore(state => state.register);
  const registerSchema = useMemo(() => createRegisterSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: registerFormDefaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      if (result.success) {
        navigate(AppConstants.Routes.Private.Dashboard, { replace: true });

        return;
      }

      setError(
        resolveAuthMessage(
          result.error ?? 'auth.register.errors.generic',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageLayout>
      <AuthFormLayout
        title={t('auth.register.title', 'Create account')}
        subtitle={t('auth.register.subtitle', 'Join Zentro to shop and manage orders')}
        footer={(
          <p className="text-sm text-gray-600 text-center">
            {t('auth.common.hasAccount', 'Already have an account?')}
            {' '}
            <Link
              to={AppConstants.Routes.Public.Login}
              className="text-primary font-medium hover:underline"
            >
              {t('auth.common.loginLink', 'Sign in')}
            </Link>
          </p>
        )}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col w-full space-y-4"
          noValidate
        >
          <FormInput
            id="name"
            label={t('auth.register.nameLabel', 'Full name')}
            error={errors.name?.message}
            {...register('name')}
            type="text"
            autoComplete="name"
            placeholder={t('auth.register.namePlaceholder', 'Enter your name')}
          />

          <FormInput
            id="email"
            label={t('auth.register.emailLabel', 'Email')}
            error={errors.email?.message}
            {...register('email')}
            type="email"
            autoComplete="email"
            placeholder={t('auth.register.emailPlaceholder', 'Enter your email')}
          />

          <PasswordInput
            name="password"
            id="password"
            label={t('auth.register.passwordLabel', 'Password')}
            register={register}
            error={errors.password?.message}
            placeholder={t('auth.register.passwordPlaceholder', 'Create a password')}
          />

          <PasswordInput
            name="confirmPassword"
            id="confirmPassword"
            label={t('auth.register.confirmPasswordLabel', 'Confirm password')}
            register={register}
            error={errors.confirmPassword?.message}
            placeholder={t('auth.register.confirmPasswordPlaceholder', 'Re-enter your password')}
          />

          <FieldError
            msg={error}
            variant="form"
          />

          <AppButton
            type="submit"
            color="primary"
            loading={isSubmitting}
          >
            {t('auth.register.submit', 'Register')}
          </AppButton>
        </form>
      </AuthFormLayout>
    </AuthPageLayout>
  );
}
