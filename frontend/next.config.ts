import type { NextConfig } from "next";

const backendInternalUrl = process.env.BACKEND_INTERNAL_URL || "http://localhost:8080";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${backendInternalUrl}/:path*`,
      },
    ];
  },
  experimental: {
    middlewareClientMaxBodySize: 50 * 1024 * 1024, // 50MB
  },

};

export default nextConfig;
