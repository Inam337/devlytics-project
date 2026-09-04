import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';

import { AppConstants } from '@/common/AppConstants';
import { useAuthTranslation } from '@/hooks/use-auth-translation';
import AppButton from '@/components/ui/AppButton';
import { FormInput } from '@/components/ui/FormInput';
import AuthPageLayout from '@/components/layouts/AuthPageLayout';
import {
  createForgotPasswordSchema,
  forgotPasswordFormDefaultValues,
  type ForgotPasswordFormData,
} from '@/validation-schemas';

import AuthFormLayout from './AuthFormLayout';

export default function ForgotPasswordPage() {
  const { t } = useAuthTranslation();
  const [submitted, setSubmitted] = useState(false);
  const forgotPasswordSchema = useMemo(() => createForgotPasswordSchema(t), [t]);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: forgotPasswordFormDefaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const onSubmit = () => {
    setSubmitted(true);
  };

  return (
    <AuthPageLayout>
      <AuthFormLayout
        title={t('auth.forgotPassword.title', 'Forgot password')}
        subtitle={t(
          'auth.forgotPassword.subtitle',
          'Enter your email and we\'ll help you recover access',
        )}
        footer={(
          <Link
            to={AppConstants.Routes.Public.Login}
            className="text-sm text-gray-500 hover:text-gray-800 text-center"
          >
            {t('auth.common.backToLogin', 'Back to login')}
          </Link>
        )}
      >
        {submitted
          ? (
              <div className="space-y-3 text-sm text-gray-700">
                <p className="font-medium">
                  {t('auth.forgotPassword.infoTitle', 'Password reset')}
                </p>
                <p>
                  {t(
                    'auth.forgotPassword.infoMessage',
                    [
                      'Password reset by email is not available yet.',
                      'Please contact your administrator or sign in if you already have an account.',
                    ].join(' '),
                  )}
                </p>
              </div>
            )
          : (
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="flex flex-col w-full space-y-4"
                noValidate
              >
                <FormInput
                  id="email"
                  label={t('auth.forgotPassword.emailLabel', 'Email')}
                  error={errors.email?.message}
                  {...register('email')}
                  type="email"
                  autoComplete="email"
                  placeholder={t('auth.forgotPassword.emailPlaceholder', 'Enter your registered email')}
                />

                <AppButton
                  type="submit"
                  color="primary"
                >
                  {t('auth.forgotPassword.submit', 'Send reset link')}
                </AppButton>
              </form>
            )}
      </AuthFormLayout>
    </AuthPageLayout>
  );
}
