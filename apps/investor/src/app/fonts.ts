import localFont from 'next/font/local';

/**
 * Self-hosted fonts, loaded from npm packages rather than Google's servers.
 * Builds never depend on an outside download, and next/font preloads the
 * files and sizes the fallback font to avoid layout shift.
 */

export const inter = localFont({
  src: '../../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  variable: '--font-inter',
  weight: '100 900',
  display: 'swap',
});

export const jakarta = localFont({
  src: '../../node_modules/@fontsource-variable/plus-jakarta-sans/files/plus-jakarta-sans-latin-wght-normal.woff2',
  variable: '--font-jakarta',
  weight: '200 800',
  display: 'swap',
});

export const arabic = localFont({
  src: [
    {
      path: '../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-400-normal.woff2',
      weight: '400',
    },
    {
      path: '../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-500-normal.woff2',
      weight: '500',
    },
    {
      path: '../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-600-normal.woff2',
      weight: '600',
    },
    {
      path: '../../node_modules/@fontsource/ibm-plex-sans-arabic/files/ibm-plex-sans-arabic-arabic-700-normal.woff2',
      weight: '700',
    },
  ],
  variable: '--font-arabic',
  display: 'swap',
  preload: false,
});

/** Apply to <html> so every CSS variable above is available everywhere. */
export const fontVariables = `${inter.variable} ${jakarta.variable} ${arabic.variable}`;
