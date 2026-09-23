import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { useAuthStore } from '@/stores/auth';
import {
  acceptInvitationFormDefaultValues,
  createAcceptInvitationSchema,
  type AcceptInvitationFormData,
} from '@/validation-schemas';

export default function AcceptInvitationPage() {
  const { t, resolveAuthMessage } = useAuthTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const email = searchParams.get('email');
  const organizationId = searchParams.get('organizationId');
  const acceptInvitation = useAuthStore(state => state.acceptInvitation);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const schema = useMemo(() => createAcceptInvitationSchema(t), [t]);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<AcceptInvitationFormData>({
    resolver: zodResolver(schema),
    defaultValues: acceptInvitationFormDefaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const passwordValue = watch('password');
  const strength = useMemo(() => getPasswordStrength(passwordValue ?? ''), [passwordValue]);
  const onSubmit = async (data: AcceptInvitationFormData) => {
    if (!email || !organizationId) {
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      const result = await acceptInvitation({
        email,
        organizationId,
        password: data.password,
      });

      if (result.success) {
        navigate(AppConstants.Routes.Private.Dashboard, { replace: true });

        return;
      }

      setError(resolveAuthMessage(result.error ?? 'auth.acceptInvitation.errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const left = !email || !organizationId
    ? (
        <>
          <div
            className="text-[#241d4d]"
            style={{ font: '600 28px/1.15 \'IBM Plex Sans\'', letterSpacing: '-0.02em' }}
          >
            {t('auth.acceptInvitation.invalidTitle', 'Invitation link invalid')}
          </div>
          <div className="mt-2 max-w-[400px] text-[15px] text-[#64748B]">
            {t(
              'auth.acceptInvitation.invalidSubtitle',
              'This invitation link is missing required information. Ask your organization admin to resend it.',
            )}
          </div>
        </>
      )
    : (
        <>
          <div
            className="text-[#241d4d]"
            style={{ font: '600 28px/1.15 \'IBM Plex Sans\'', letterSpacing: '-0.02em' }}
          >
            {t('auth.acceptInvitation.title', 'Accept invitation')}
          </div>
          <div className="mt-2 text-[15px] text-[#64748B]">
            {t('auth.acceptInvitation.subtitle', 'Set a password to activate your account')}
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="mt-7 flex max-w-[400px] flex-col gap-4"
          >
            <label className="flex flex-col gap-1">
              <span
                className="uppercase text-[#64748B]"
                style={{ font: '500 11px/1 \'IBM Plex Mono\', monospace', letterSpacing: '.09em' }}
              >
                {t('auth.acceptInvitation.emailLabel', 'Email')}
              </span>
              <div className="rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-[14px] py-2 text-sm text-[#5C6879]">
                {email}
              </div>
            </label>

            <AuthPasswordField
              name="password"
              id="password"
              label={t('auth.acceptInvitation.passwordLabel', 'Password')}
              register={register}
              error={errors.password?.message}
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
              name="confirmPassword"
              id="confirmPassword"
              label={t('auth.acceptInvitation.confirmPasswordLabel', 'Confirm password')}
              register={register}
              error={errors.confirmPassword?.message}
              autoComplete="new-password"
            />

            <FieldError
              msg={error}
              variant="form"
            />

            <AuthPrimaryButton loading={isSubmitting}>
              {t('auth.acceptInvitation.submit', 'Activate account')}
            </AuthPrimaryButton>
          </form>
        </>
      );

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
          eyebrow="You've been invited"
          headline="Join a team that measures engineering with evidence, not opinion."
        />
      )}
    />
  );
}
