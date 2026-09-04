import { Inter, Noto_Sans_Arabic, Roboto } from 'next/font/google';

// Optimized font loading with next/font
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  weight: ['400', '500', '600', '700'],
  preload: true,
  fallback: ['system-ui', 'arial'],
});

export const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic', 'latin'],
  display: 'swap',
  variable: '--font-noto-arabic',
  weight: ['100', '200', '300', '400', '500', '600', '700', '800', '900'],
  preload: false, // Only preload if Arabic is critical
  fallback: ['system-ui', 'arial'],
});

// Roboto font for Material-UI compatibility
export const roboto = Roboto({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-roboto',
  weight: ['300', '400', '500', '700'],
  preload: false,
  fallback: ['system-ui', 'arial'],
});

// Font class names for use in components
export const fontClassNames = `${inter.variable} ${notoSansArabic.variable} ${roboto.variable}`;
