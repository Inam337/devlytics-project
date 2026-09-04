import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

import { Button } from '@/components/ui/Button';
import { RbIcon } from '@/components/icons/common/RbIcon';
import type { NotFoundProps } from '@/models/NotFound';
import { AppConstants } from '@/common/AppConstants';
import { IconColors } from '@/components/icons/types/RbIcon.types';

export default function NotFound({
  title,
  description,
  showBackButton = true,
  showHomeButton = true,
  className = '',
}: NotFoundProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const MULTI_FILE_ICON_SIZE = 64;
  const defaultTitle = t('common.notFound.text.title', 'Page Not Found');
  const defaultDescription = t('common.notFound.text.description',
    'The page you are looking for does not exist or has been moved.');
  const handleGoBack = () => {
    navigate(-1);
  };

  const handleGoHome = () => {
    navigate(AppConstants.Routes.Index);
  };

  return (
    <div className={`w-full flex flex-col items-center justify-center h-screen
     bg-gradient-to-br from-white via-green-50 to-green-200 px-4 ${className}`}
    >
      {/* 404 Icon */}
      <div className="mb-8 bg-green-100 p-4 rounded-lg">
        <RbIcon
          name="multiFile"
          size={MULTI_FILE_ICON_SIZE}
          color={IconColors.PRIMARY_COLOR_ICON}
        />
      </div>

      {/* Error Code */}
      <div className="mb-4">
        <h1 className="text-6xl font-bold text-primary">404</h1>
      </div>

      {/* Title */}
      <div className="mb-4 text-center">
        <h2 className="text-2xl font-semibold text-gray-900 mb-2">
          {title || defaultTitle}
        </h2>
        <p className="text-gray-600 max-w-lg">
          {description || defaultDescription}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        {showBackButton && (
          <Button
            variant="outline"
            onClick={handleGoBack}
            className="flex items-center gap-2 px-2 py-2 pr-4"
          >
            <RbIcon
              name="arrowChevronLeft"
              size={16}
              color={IconColors.PRIMARY_COLOR_ICON}
            />
            {t('common.notFound.actions.goBack', 'Go Back')}
          </Button>
        )}

        {showHomeButton && (
          <Button
            variant="default"
            onClick={handleGoHome}
          >
            <RbIcon
              name="home"
              size={16}
              color={IconColors.WHITE_COLOR_ICON}
            />
            {t('common.notFound.actions.goHome', 'Go Home')}
          </Button>
        )}
      </div>

      {/* Additional Help Text */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          {t('common.notFound.text.helpText',
            'If you believe this is an error, please contact support.')}
        </p>
      </div>
    </div>
  );
}
