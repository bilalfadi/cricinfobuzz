import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'static.cricbuzz.com',
      },
      {
        protocol: 'https',
        hostname: 'www.cricbuzz.com',
      },
    ],
  },
  // Fix for missing internal files
  experimental: {
    missingSuspenseWithCSRBailout: false,
  },
};

export default nextConfig;

