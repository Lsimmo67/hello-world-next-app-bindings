import type { NextConfig } from 'next';

// User's custom Next.js configuration
// NOTE: basePath is handled by Webflow Cloud builder
const nextConfig: NextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Expose the mount path to client code as an env var so client-side
  // fetch() calls can prefix it (Next.js's basePath only auto-prefixes
  // <Link>/<Image>/router, not fetch).
  env: {
    NEXT_PUBLIC_BASE_PATH: process.env.COSMIC_MOUNT_PATH || '',
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.example.com',
      },
    ],
  },
};

export default nextConfig;
