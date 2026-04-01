import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: 'http://127.0.0.1:8080/:path*',
      },
    ];
  },
  experimental: {
    middlewareClientMaxBodySize: 50 * 1024 * 1024, // 50MB
  },

};

export default nextConfig;