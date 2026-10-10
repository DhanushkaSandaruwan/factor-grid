/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  eslint: {
    // Lint separately via `npm run lint` so production builds never block on lint.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
