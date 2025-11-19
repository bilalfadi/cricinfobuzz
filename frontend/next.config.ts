import type { NextConfig } from "next";
import path from "path";

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
  experimental: {
    outputFileTracingRoot: path.join(__dirname, '..'),
  },
};

export default nextConfig;

