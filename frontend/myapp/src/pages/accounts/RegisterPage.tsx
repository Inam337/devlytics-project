import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { AppConstants } from '@/common/AppConstants';
import AuthOAuthButton, { AuthOrDivider } from '@/components/auth/AuthOAuthButton';
import AuthField from '@/components/auth/AuthField';
import AuthPasswordField from '@/components/auth/AuthPasswordField';
import AuthPrimaryButton from '@/components/auth/AuthPrimaryButton';
import AuthSplitLayout from '@/components/layouts/AuthSplitLayout';
import FieldError from '@/components/ui/FieldError';
import { BrandLogo } from '@/components/ui/BrandLogo';
import { useAuthTranslation } from '@/hooks/use-auth-translation';
import { getPasswordStrength } from '@/libs/password-strength';
import { cn } from '@/libs/utils';
import { useAuthStore } from '@/stores/auth';
import {
  createRegisterSchema,
  registerFormDefaultValues,
  type RegisterFormData,
} from '@/validation-schemas';

const REGISTER_STEPS = [
  { n: '1', title: 'Create your account', desc: 'Sign up and your organization is created with you as its admin.' },
  { n: '2', title: 'Connect a Git provider', desc: 'Authorize GitHub or GitLab with read-only scopes.' },
  { n: '3', title: 'Import repositories', desc: 'Choose which repositories Devlytics should measure.' },
  { n: '4', title: 'See your first analysis', desc: 'Quality, delivery and scoring evidence, ready to review.' },
];

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
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: registerFormDefaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const password = watch('password');
  const strength = useMemo(() => getPasswordStrength(password ?? ''), [password]);
  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await registerUser({
        email: data.email,
        firstName: data.firstName,
        lastName: data.lastName,
        password: data.password,
        organization: { name: data.organizationName },
      });

      if (result.success) {
        navigate(AppConstants.Routes.Private.Dashboard, { replace: true });

        return;
      }

      setError(resolveAuthMessage(result.error ?? 'auth.register.errors.generic'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthSplitLayout
      minColumnWidth={540}
      padding="14px 48px"
      left={(
        <>
          <BrandLogo
            variant="color"
            className="mb-3 h-7 self-start"
          />
          <div
            className="text-[#241d4d]"
            style={{ font: '600 26px/1.15 \'IBM Plex Sans\'', letterSpacing: '-0.02em' }}
          >
            {t('auth.register.title', 'Create your account')}
          </div>
          <div className="mt-1 text-[13px] text-[#64748B]">
            {t('auth.register.subtitle', 'Set up your login, then create your organization.')}
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="mt-2 flex max-w-[440px] flex-col gap-1.5"
          >
            <div className="grid grid-cols-2 gap-1.5">
              <AuthField
                id="firstName"
                label={t('auth.register.firstNameLabel', 'First name')}
                error={errors.firstName?.message}
                {...register('firstName')}
                autoComplete="given-name"
                placeholder={t('auth.register.firstNamePlaceholder', 'Ada')}
              />
              <AuthField
                id="lastName"
                label={t('auth.register.lastNameLabel', 'Last name')}
                error={errors.lastName?.message}
                {...register('lastName')}
                autoComplete="family-name"
                placeholder={t('auth.register.lastNamePlaceholder', 'Lovelace')}
              />
              <AuthField
                id="email"
                span="span 2"
                label={t('auth.register.emailLabel', 'Email')}
                error={errors.email?.message}
                {...register('email')}
                type="email"
                autoComplete="email"
                placeholder={t('auth.register.emailPlaceholder', 'Enter your email')}
              />
              <AuthField
                id="organizationName"
                span="span 2"
                label={t('auth.register.organizationNameLabel', 'Organization name')}
                error={errors.organizationName?.message}
                {...register('organizationName')}
                placeholder={t('auth.register.organizationNamePlaceholder', 'Northwind Engineering')}
              />
            </div>

            <AuthPasswordField
              name="password"
              id="password"
              label={t('auth.register.passwordLabel', 'Password')}
              register={register}
              error={errors.password?.message}
              autoComplete="new-password"
            />
            <div className="-mt-1.5 flex flex-col gap-1">
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
              label={t('auth.register.confirmPasswordLabel', 'Confirm password')}
              register={register}
              error={errors.confirmPassword?.message}
              autoComplete="new-password"
            />

            <label className="flex cursor-pointer items-start gap-[11px]">
              <input
                type="checkbox"
                {...register('agreeToTerms')}
                className={cn(
                  'mt-[3px] h-[17px] w-[17px] flex-none cursor-pointer rounded-[5px] border-[#E2E8F0]',
                  'text-[#372b73] focus:ring-[#372b73]',
                )}
              />
              <span className="text-[12.5px] leading-[1.5] text-[#64748B]">
                {t(
                  'auth.register.termsLabel',
                  'I agree to the terms of service and the data processing policy. Source code '
                  + 'stays inside your environment by default.',
                )}
              </span>
            </label>
            <FieldError msg={errors.agreeToTerms?.message} />

            <FieldError
              msg={error}
              variant="form"
            />

            <AuthPrimaryButton loading={isSubmitting}>
              {t('auth.register.submit', 'Create account')}
            </AuthPrimaryButton>

            <AuthOrDivider />

            <div className="flex gap-3">
              <AuthOAuthButton>{t('auth.register.github', 'Sign up with GitHub')}</AuthOAuthButton>
              <AuthOAuthButton>{t('auth.register.gitlab', 'Sign up with GitLab')}</AuthOAuthButton>
            </div>

            <div className="mt-2.5 text-[13px] text-[#64748B]">
              {t('auth.common.hasAccount', 'Already have an account?')}
              {' '}
              <Link
                to={AppConstants.Routes.Public.Login}
                className="font-medium text-[#372b73] hover:underline"
              >
                {t('auth.common.loginLink', 'Sign in')}
              </Link>
            </div>
          </form>
        </>
      )}
      right={(
        <>
          <BrandLogo
            variant="white"
            className="mb-3 h-9 self-start"
          />
          <div
            className="uppercase text-[#9FD4E4]"
            style={{ font: '500 11px/1 \'IBM Plex Mono\', monospace', letterSpacing: '.12em' }}
          >
            Connect. Analyze. Improve.
          </div>
          <div
            className="mt-2 max-w-[420px] text-white"
            style={{ font: '600 21px/1.3 \'IBM Plex Sans\'', letterSpacing: '-0.02em' }}
          >
            Four steps from sign-up to your first evidence-based improvement plan.
          </div>
          <div className="mt-3 flex max-w-[440px] flex-col gap-2">
            {REGISTER_STEPS.map(step => (
              <div
                key={step.n}
                className="flex items-start gap-3"
              >
                <div
                  className={cn(
                    'flex h-6 w-6 flex-none items-center justify-center rounded-full border',
                    'border-white/30 bg-white/[.14] text-white',
                  )}
                  style={{ font: '600 10px \'IBM Plex Mono\', monospace' }}
                >
                  {step.n}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-white">{step.title}</div>
                  <div className="mt-0.5 text-[11.5px] leading-[1.35] text-[#E4DBF3]">{step.desc}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 max-w-[440px] rounded-xl border border-white/[.14] bg-white/[.07] p-2.5">
            <div className="text-[11.5px] leading-[1.45] text-white">
              Devlytics reads repository metadata to measure engineering performance. Analysis
              runs locally by default — no source code leaves your environment.
            </div>
          </div>
        </>
      )}
    />
  );
}
