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
  createLoginSchema,
  loginFormDefaultValues,
  type LoginFormData,
} from '@/validation-schemas';

import AuthFormLayout from './AuthFormLayout';

export default function LoginPage() {
  const { t, resolveAuthMessage } = useAuthTranslation();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore(state => state.login);
  const loginSchema = useMemo(() => createLoginSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: loginFormDefaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await login(data.email, data.password);

      if (result.success) {
        navigate(AppConstants.Routes.Private.Dashboard, { replace: true });

        return;
      }

      setError(
        resolveAuthMessage(
          result.error ?? 'auth.login.errors.invalidCredentials',
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPageLayout>
      <AuthFormLayout
        title={t('auth.login.title', 'Sign in')}
        subtitle={t('auth.login.subtitle', 'Welcome back to Zentro')}
        footer={(
          <>
            <p className="text-sm text-gray-600 text-center">
              {t('auth.common.noAccount', 'Don\'t have an account?')}
              {' '}
              <Link
                to={AppConstants.Routes.Public.Register}
                className="text-primary font-medium hover:underline"
              >
                {t('auth.common.registerLink', 'Create an account')}
              </Link>
            </p>
            <Link
              to={AppConstants.Routes.Public.ForgotPassword}
              className="text-sm text-gray-500 hover:text-gray-800 text-center"
            >
              {t('auth.login.forgotPasswordLink', 'Forgot password?')}
            </Link>
          </>
        )}
      >
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col items-center w-full space-y-4"
          noValidate
        >
          <div className="w-full">
            <FormInput
              id="email"
              label={t('auth.login.emailLabel', 'Email')}
              error={errors.email?.message}
              {...register('email')}
              type="email"
              autoComplete="email"
              placeholder={t('auth.login.emailPlaceholder', 'Enter your email')}
            />
          </div>

          <div className="w-full">
            <PasswordInput
              name="password"
              id="password"
              label={t('auth.login.passwordLabel', 'Password')}
              register={register}
              error={errors.password?.message}
              placeholder={t('auth.login.passwordPlaceholder', 'Enter your password')}
            />
          </div>

          <FieldError
            msg={error}
            variant="form"
          />

          <AppButton
            type="submit"
            color="primary"
            loading={isSubmitting}
          >
            {t('auth.login.submit', 'Sign in')}
          </AppButton>
        </form>
      </AuthFormLayout>
    </AuthPageLayout>
  );
}
