import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';

import { AppConstants } from '@/common/AppConstants';
import AuthField from '@/components/auth/AuthField';
import AuthPrimaryButton from '@/components/auth/AuthPrimaryButton';
import AuthValuesPanel from '@/components/auth/AuthValuesPanel';
import AuthSplitLayout from '@/components/layouts/AuthSplitLayout';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useAuthTranslation } from '@/hooks/use-auth-translation';
import { forgotPassword } from '@/services/auth';
import {
  createForgotPasswordSchema,
  forgotPasswordFormDefaultValues,
  type ForgotPasswordFormData,
} from '@/validation-schemas';

export default function ForgotPasswordPage() {
  const { t } = useAuthTranslation();
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsSubmitting(true);

    try {
      // The API never reveals whether the email exists — show the same success
      // state regardless of the result (a network/server error still shows the
      // generic message; there's nothing account-specific to leak either way).
      await forgotPassword({ email: data.email });
    } finally {
      setIsSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <AuthSplitLayout
      minColumnWidth={460}
      padding="48px 64px"
      left={(
        <>
          <BrandLogo
            variant="color"
            className="mb-8 h-8 self-start"
          />
          <div
            className="text-[#241d4d]"
            style={{ font: '600 28px/1.15 \'IBM Plex Sans\'', letterSpacing: '-0.02em' }}
          >
            {t('auth.forgotPassword.title', 'Forgot password')}
          </div>
          <div className="mt-2 text-[15px] text-[#64748B]">
            {t(
              'auth.forgotPassword.subtitle',
              'Enter your email and we\'ll help you recover access',
            )}
          </div>

          <div className="mt-7 max-w-[400px]">
            {submitted
              ? (
                  <div
                    className="rounded-lg border border-[#CDEEDC] bg-[#F1FBF5] p-4"
                    role="status"
                  >
                    <p className="text-sm font-medium text-[#241d4d]">
                      {t('auth.forgotPassword.successTitle', 'Check your email')}
                    </p>
                    <p className="mt-1.5 text-[13px] leading-[1.5] text-[#475569]">
                      {t(
                        'auth.forgotPassword.successMessage',
                        'If an account exists for that email, we\'ve sent a reset link. It expires in 30 minutes.',
                      )}
                    </p>
                  </div>
                )
              : (
                  <form
                    onSubmit={handleSubmit(onSubmit)}
                    noValidate
                    className="flex flex-col gap-4"
                  >
                    <AuthField
                      id="email"
                      label={t('auth.forgotPassword.emailLabel', 'Email')}
                      error={errors.email?.message}
                      {...register('email')}
                      type="email"
                      autoComplete="email"
                      placeholder={t('auth.forgotPassword.emailPlaceholder', 'Enter your registered email')}
                    />

                    <AuthPrimaryButton loading={isSubmitting}>
                      {t('auth.forgotPassword.submit', 'Send reset link')}
                    </AuthPrimaryButton>
                  </form>
                )}

            <Link
              to={AppConstants.Routes.Public.Login}
              className="mt-5 block text-center text-[13px] text-[#64748B] hover:text-[#241d4d]"
            >
              {t('auth.common.backToLogin', 'Back to login')}
            </Link>
          </div>
        </>
      )}
      right={(
        <AuthValuesPanel
          eyebrow="Recover access"
          headline="Locked out happens. What matters is what your data proves once you're back in."
        />
      )}
    />
  );
}
