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
import { useAuthStore } from '@/stores/auth';
import {
  createLoginSchema,
  loginFormDefaultValues,
  type LoginFormData,
} from '@/validation-schemas';

const LOGIN_STATS: { v: string; k: string }[] = [
  { v: 'Read-only', k: 'Repository access' },
  { v: 'Local', k: 'AI analysis by default' },
  { v: 'Evidence', k: 'Scoring basis' },
  { v: 'GitHub · GitLab', k: 'Providers supported' },
];

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
      const result = await login({ email: data.email, password: data.password });

      if (result.success) {
        navigate(AppConstants.Routes.Private.Dashboard, { replace: true });

        return;
      }

      setError(resolveAuthMessage(result.error ?? 'auth.login.errors.invalidCredentials'));
    } finally {
      setIsSubmitting(false);
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
            className="mb-14 h-8 self-start"
          />
          <div
            className="text-[#241d4d]"
            style={{ font: '600 32px/1.15 \'IBM Plex Sans\'', letterSpacing: '-0.02em' }}
          >
            {t('auth.login.title', 'Welcome back')}
          </div>
          <div className="mt-2.5 text-[15px] text-[#64748B]">
            {t('auth.login.subtitle', 'Sign in to your engineering intelligence workspace.')}
          </div>

          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="mt-9 flex max-w-[400px] flex-col gap-4"
          >
            <AuthField
              id="email"
              label={t('auth.login.emailLabel', 'Email')}
              error={errors.email?.message}
              {...register('email')}
              type="email"
              autoComplete="email"
              placeholder={t('auth.login.emailPlaceholder', 'Enter your email')}
            />
            <AuthPasswordField
              name="password"
              id="password"
              label={t('auth.login.passwordLabel', 'Password')}
              register={register}
              error={errors.password?.message}
              autoComplete="current-password"
            />

            <FieldError
              msg={error}
              variant="form"
            />

            <AuthPrimaryButton loading={isSubmitting}>
              {t('auth.login.submit', 'Sign In')}
            </AuthPrimaryButton>

            <AuthOrDivider />

            <div className="flex gap-3">
              <AuthOAuthButton>{t('auth.login.github', 'Continue with GitHub')}</AuthOAuthButton>
              <AuthOAuthButton>{t('auth.login.google', 'Continue with Google')}</AuthOAuthButton>
            </div>

            <div className="mt-3.5 flex justify-between text-[13px] text-[#64748B]">
              <Link
                to={AppConstants.Routes.Public.ForgotPassword}
                className="hover:text-[#241d4d]"
              >
                {t('auth.login.forgotPasswordLink', 'Forgot password?')}
              </Link>
              <Link
                to={AppConstants.Routes.Public.Register}
                className="font-medium text-[#372b73] hover:underline"
              >
                {t('auth.common.registerLink', 'Create account')}
              </Link>
            </div>
          </form>
        </>
      )}
      right={(
        <>
          <BrandLogo
            variant="white"
            className="mb-9 h-11 self-start"
          />
          <div
            className="uppercase text-[#9FD4E4]"
            style={{ font: '500 11px/1 \'IBM Plex Mono\', monospace', letterSpacing: '.12em' }}
          >
            Measure. Improve. Compete.
          </div>
          <div
            className="mt-4.5 max-w-[420px] text-white"
            style={{ font: '600 26px/1.3 \'IBM Plex Sans\'', letterSpacing: '-0.02em' }}
          >
            Your engineering data tells a story. Devlytics turns that story into measurable
            performance, quality and improvement.
          </div>
          <div className="mt-11 grid max-w-[440px] grid-cols-2 gap-3.5">
            {LOGIN_STATS.map(stat => (
              <div
                key={stat.k}
                className="rounded-xl border border-white/[.12] bg-white/[.06] p-4"
              >
                <div
                  className="text-white"
                  style={{ font: '600 22px/1 \'IBM Plex Mono\', monospace' }}
                >
                  {stat.v}
                </div>
                <div className="mt-[7px] text-xs text-[#B6ABDC]">{stat.k}</div>
              </div>
            ))}
          </div>
        </>
      )}
    />
  );
}
