import { useEffect, useMemo, useState } from 'react';

import { cn } from '@/libs/utils';

interface ImageProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  src: string | { src?: string; default?: string };
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  fill?: boolean;
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
  loading?: 'lazy' | 'eager';
  priority?: boolean;
  onLoad?: () => void;
  onError?: () => void;
}

export function Image({
  src,
  alt,
  width,
  height,
  className,
  fill = false,
  objectFit = 'cover',
  objectPosition = 'center',
  loading = 'lazy',
  priority = false,
  onLoad: onLoadProp,
  onError: onErrorProp,
  ...props
}: ImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  // Handle imported images - Vite imports return string URLs
  const imageSrc = useMemo(() => {
    if (!src) {
      return '';
    }

    if (typeof src === 'string') {
      return src;
    }

    if (src && typeof src === 'object') {
      return src.src || src.default || String(src);
    }

    return String(src);
  }, [src]);

  // Reset loading state when image source changes
  useEffect(() => {
    if (imageSrc) {
      setIsLoading(true);
      setHasError(false);
    } else {
      setIsLoading(false);
      setHasError(true);
    }
  }, [imageSrc]);

  // Preload image if priority is true
  useEffect(() => {
    if (priority && imageSrc) {
      const link = document.createElement('link');

      link.rel = 'preload';
      link.as = 'image';
      link.href = imageSrc;
      document.head.appendChild(link);

      return () => {
        if (document.head.contains(link)) {
          document.head.removeChild(link);
        }
      };
    }
  }, [priority, imageSrc]);

  const handleLoad = () => {
    setIsLoading(false);
    onLoadProp?.();
  };

  const handleError = (e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setIsLoading(false);
    setHasError(true);
    console.error('Image failed to load:', imageSrc, e);
    onErrorProp?.();
  };

  // Don't render if no image source
  if (!imageSrc) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100',
          'text-gray-400 text-sm',
          className,
        )}
        style={fill ? { width: '100%', height: '100%' } : { width, height }}
      >
        No image source provided
      </div>
    );
  }

  if (hasError) {
    return (
      <div
        className={cn(
          'flex items-center justify-center bg-gray-100',
          'text-gray-400 text-sm',
          className,
        )}
        style={fill ? { width: '100%', height: '100%' } : { width, height }}
      >
        Failed to load image
      </div>
    );
  }

  const objectFitClass = {
    'contain': 'object-contain',
    'cover': 'object-cover',
    'fill': 'object-fill',
    'none': 'object-none',
    'scale-down': 'object-scale-down',
  }[objectFit] || 'object-cover';
  const imageClassName = cn(
    'transition-opacity duration-300 ease-in-out',
    isLoading ? 'opacity-0' : 'opacity-100',
    objectFitClass,
    className,
  );
  const containerClassName = cn(
    'relative overflow-hidden',
    fill && 'w-full h-full',
    !fill && 'inline-block',
  );
  const containerStyle = fill
    ? undefined
    : { position: 'relative' as const, width, height };
  const imageStyle = fill
    ? {
        position: 'absolute' as const,
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        objectFit,
        objectPosition,
      }
    : {
        width: width ? `${width}px` : 'auto',
        height: height ? `${height}px` : 'auto',
        objectFit,
        objectPosition,
      };

  return (
    <div
      className={containerClassName}
      style={containerStyle}
    >
      {isLoading && (
        <div
          className="bg-gray-200 animate-pulse z-0"
          style={fill ? undefined : { width, height }}
          aria-hidden="true"
        />
      )}
      <img
        key={imageSrc}
        src={imageSrc}
        alt={alt}
        width={fill ? undefined : width}
        height={fill ? undefined : height}
        loading={priority ? 'eager' : loading}
        fetchPriority={priority ? 'high' : 'auto'}
        onLoad={handleLoad}
        onError={handleError}
        className={imageClassName}
        style={imageStyle}
        decoding="async"
        {...props}
      />
    </div>
  );
}
