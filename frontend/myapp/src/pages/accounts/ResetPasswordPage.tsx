import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AppConstants } from '@/common/AppConstants';
import AuthPasswordField from '@/components/auth/AuthPasswordField';
import AuthPrimaryButton from '@/components/auth/AuthPrimaryButton';
import AuthValuesPanel from '@/components/auth/AuthValuesPanel';
import AuthSplitLayout from '@/components/layouts/AuthSplitLayout';
import { BrandLogo } from '@/components/ui/BrandLogo';
import FieldError from '@/components/ui/FieldError';
import { useAuthTranslation } from '@/hooks/use-auth-translation';
import { getPasswordStrength } from '@/libs/password-strength';
import { resetPassword } from '@/services/auth';
import {
  createResetPasswordSchema,
  resetPasswordFormDefaultValues,
  type ResetPasswordFormData,
} from '@/validation-schemas';

export default function ResetPasswordPage() {
  const { t, resolveAuthMessage } = useAuthTranslation();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [error, setError] = useState<string | null>(null);
  const [invalidToken, setInvalidToken] = useState(false);
  const [done, setDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const resetPasswordSchema = useMemo(() => createResetPasswordSchema(t), [t]);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: resetPasswordFormDefaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const newPasswordValue = watch('newPassword');
  const strength = useMemo(() => getPasswordStrength(newPasswordValue ?? ''), [newPasswordValue]);
  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) {
      setInvalidToken(true);

      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await resetPassword({ token, newPassword: data.newPassword });

      // NOTE: this project's tsconfig has strictNullChecks off, which breaks
      // discriminated-union narrowing on `!result.ok` — check `=== true` first.
      if (result.ok === true) {
        setDone(true);

        return;
      }

      // Backend rejects an invalid/expired/used token with a specific 400 message —
      // this is an explicit, distinct state, not a generic form error (failures
      // freeze and are named, they never just show a vague toast).
      if (result.error.toLowerCase().includes('invalid or has expired')) {
        setInvalidToken(true);

        return;
      }

      setError(resolveAuthMessage(result.error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const left = (() => {
    if (!token || invalidToken) {
      return (
        <>
          <div
            className="text-[#241d4d]"
            style={{ font: '600 28px/1.15 \'IBM Plex Sans\'', letterSpacing: '-0.02em' }}
          >
            {t('auth.resetPassword.invalidTitle', 'Link invalid or expired')}
          </div>
          <div className="mt-2 max-w-[400px] text-[15px] text-[#64748B]">
            {t(
              'auth.resetPassword.invalidSubtitle',
              'This reset link is invalid or has expired. Request a new one to continue.',
            )}
          </div>
          <Link
            to={AppConstants.Routes.Public.ForgotPassword}
            className="mt-6 inline-block text-[13px] font-medium text-[#372b73] hover:underline"
          >
            {t('auth.resetPassword.requestNewLink', 'Request a new reset link')}
          </Link>
        </>
      );
    }

    if (done) {
      return (
        <>
          <div
            className="text-[#241d4d]"
            style={{ font: '600 28px/1.15 \'IBM Plex Sans\'', letterSpacing: '-0.02em' }}
          >
            {t('auth.resetPassword.doneTitle', 'Password reset')}
          </div>
          <div
            className="mt-4 max-w-[400px] rounded-lg border border-[#CDEEDC] bg-[#F1FBF5] p-4"
            role="status"
          >
            <p className="text-[13px] leading-[1.5] text-[#475569]">
              {t(
                'auth.resetPassword.doneMessage',
                'Your password has been changed. Every other session has been signed out '
                + '— sign in again with your new password.',
              )}
            </p>
          </div>
          <Link
            to={AppConstants.Routes.Public.Login}
            className="mt-5 inline-block text-[13px] font-medium text-[#372b73] hover:underline"
          >
            {t('auth.common.loginLink', 'Sign in')}
          </Link>
        </>
      );
    }

    return (
      <>
        <div
          className="text-[#241d4d]"
          style={{ font: '600 28px/1.15 \'IBM Plex Sans\'', letterSpacing: '-0.02em' }}
        >
          {t('auth.resetPassword.title', 'Reset password')}
        </div>
        <div className="mt-2 text-[15px] text-[#64748B]">
          {t('auth.resetPassword.subtitle', 'Choose a new password for your account')}
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          className="mt-7 flex max-w-[400px] flex-col gap-4"
        >
          <AuthPasswordField
            name="newPassword"
            id="newPassword"
            label={t('auth.resetPassword.newPasswordLabel', 'New password')}
            register={register}
            error={errors.newPassword?.message}
            autoComplete="new-password"
          />
          <div className="-mt-2 flex flex-col gap-1">
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map(i => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full"
                  style={{ background: i < strength.score ? strength.barColor : '#E2E8F0' }}
                />
              ))}
            </div>
            <div
              className="text-[#64748B]"
              style={{ font: '400 11px \'IBM Plex Mono\', monospace' }}
            >
              {strength.label}
            </div>
          </div>

          <AuthPasswordField
            name="confirmNewPassword"
            id="confirmNewPassword"
            label={t('auth.resetPassword.confirmPasswordLabel', 'Confirm new password')}
            register={register}
            error={errors.confirmNewPassword?.message}
            autoComplete="new-password"
          />

          <FieldError
            msg={error}
            variant="form"
          />

          <AuthPrimaryButton loading={isSubmitting}>
            {t('auth.resetPassword.submit', 'Reset password')}
          </AuthPrimaryButton>

          <Link
            to={AppConstants.Routes.Public.Login}
            className="text-center text-[13px] text-[#64748B] hover:text-[#241d4d]"
          >
            {t('auth.common.backToLogin', 'Back to login')}
          </Link>
        </form>
      </>
    );
  })();

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
          {left}
        </>
      )}
      right={(
        <AuthValuesPanel
          eyebrow="Secure your account"
          headline="A fresh password, the same evidence-based standards on the other side."
        />
      )}
    />
  );
}
