/**
 * Web app manifest: lets the app be installed to a home screen, dock or
 * start menu on phones, tablets and computers. Served at /manifest.webmanifest.
 */
export default function manifest() {
  return {
    id: '/',
    name: 'Factor Grid',
    short_name: 'Factor Grid',
    description: 'Enterprise analytics for human factors issue reporting and risk governance.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    orientation: 'any',
    background_color: '#f5f7fb',
    theme_color: '#0F172A',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
