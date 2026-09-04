import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from 'react';

import { AppConstants } from '@/common/AppConstants';
import AppButton from '@/components/ui/AppButton';
import FieldError from '@/components/ui/FieldError';
import PasswordInput from '@/components/ui/PasswordInput';
import { useAuthTranslation } from '@/hooks/use-auth-translation';
import { changePassword } from '@/services/auth';
import { useAuthStore } from '@/stores/auth';
import {
  changePasswordFormDefaultValues,
  createChangePasswordSchema,
  type ChangePasswordFormData,
} from '@/validation-schemas';

export default function Profile() {
  const { t, i18nT, resolveAuthMessage } = useAuthTranslation();
  const user = useAuthStore((state) => state.user);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const changePasswordSchema = useMemo(() => createChangePasswordSchema(t), [t]);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: changePasswordFormDefaultValues,
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });

  const onSubmit = async (data: ChangePasswordFormData) => {
    setError(null);
    setSuccess(null);
    setIsSubmitting(true);

    try {
      const result = await changePassword({
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });

      if (!result.ok) {
        setError(
          resolveAuthMessage(
            result.error ?? 'auth.profile.errors.generic',
          ),
        );
        return;
      }

      setSuccess(
        resolveAuthMessage(
          result.data.message.startsWith('auth.')
            ? result.data.message
            : 'auth.profile.changePassword.success',
        ),
      );
      reset(changePasswordFormDefaultValues);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-md">
      <Link
        to={AppConstants.Routes.Private.Dashboard}
        className="text-sm text-primary hover:underline"
      >
        {i18nT('auth.profile.backToDashboard', 'Back to dashboard')}
      </Link>

      <h1 className="text-2xl font-semibold mt-4 mb-1">
        {i18nT('auth.profile.title', 'Profile')}
      </h1>

      {user ? (
        <p className="text-gray-600 mb-6">
          {user.name}
          {' · '}
          {user.email}
          {' · '}
          {user.role}
        </p>
      ) : null}

      <section>
        <h2 className="text-lg font-medium mb-1">
          {i18nT('auth.profile.changePassword.title', 'Change password')}
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          {i18nT(
            'auth.profile.changePassword.subtitle',
            'Update your password while signed in.',
          )}
        </p>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col space-y-4"
          noValidate
        >
          <PasswordInput
            name="currentPassword"
            id="currentPassword"
            label={i18nT(
              'auth.profile.changePassword.currentPasswordLabel',
              'Current password',
            )}
            register={register}
            error={errors.currentPassword?.message}
            placeholder={i18nT(
              'auth.profile.changePassword.currentPasswordPlaceholder',
              'Enter current password',
            )}
          />

          <PasswordInput
            name="newPassword"
            id="newPassword"
            label={i18nT(
              'auth.profile.changePassword.newPasswordLabel',
              'New password',
            )}
            register={register}
            error={errors.newPassword?.message}
            placeholder={i18nT(
              'auth.profile.changePassword.newPasswordPlaceholder',
              'Enter new password',
            )}
          />

          <PasswordInput
            name="confirmNewPassword"
            id="confirmNewPassword"
            label={i18nT(
              'auth.profile.changePassword.confirmPasswordLabel',
              'Confirm new password',
            )}
            register={register}
            error={errors.confirmNewPassword?.message}
            placeholder={i18nT(
              'auth.profile.changePassword.confirmPasswordPlaceholder',
              'Re-enter new password',
            )}
          />

          <FieldError msg={error} variant="form" />

          {success ? (
            <p
              className="text-sm text-green-700"
              role="status"
            >
              {success}
            </p>
          ) : null}

          <AppButton
            type="submit"
            color="primary"
            loading={isSubmitting}
          >
            {i18nT('auth.profile.changePassword.submit', 'Update password')}
          </AppButton>
        </form>
      </section>
    </div>
  );
}
