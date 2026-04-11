import path from "path";
import type { NextConfig } from "next";

const defaultApiOrigin = 'http://localhost:5000';
const apiOrigin = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/api\/?$/, '') || defaultApiOrigin;
const parsedApiOrigin = (() => {
  try {
    return new URL(apiOrigin);
  } catch {
    return new URL(defaultApiOrigin);
  }
})();

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  turbopack: {
    root: path.resolve(__dirname),
  },
  images: {
    unoptimized: true,
    remotePatterns: [
      {
        protocol: parsedApiOrigin.protocol.replace(':', '') as 'http' | 'https',
        hostname: parsedApiOrigin.hostname,
        port: parsedApiOrigin.port || undefined,
        pathname: '/uploads/**',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'via.placeholder.com',
      }
    ],
  },
  async rewrites() {
    return [
      {
        source: '/uploads/:path*',
        destination: `${apiOrigin}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
