import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      {
        source: "/api/:path((?!auth).*)",
        destination: "http://localhost:8000/api/:path*", // Proxy to Backend, excluding /api/auth
      },
    ];
  },
};

export default nextConfig;
