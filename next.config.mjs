/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  experimental: {
    // Import only the icons/components used, instead of whole barrel files.
    optimizePackageImports: ['lucide-react', 'recharts', 'radix-ui'],
  },
  async headers() {
    return [
      {
        // The service worker must always be fetched fresh so updates reach users.
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ];
  },
  eslint: {
    // Lint separately via `npm run lint` so production builds never block on lint.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
