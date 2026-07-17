import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: false,
  async redirects() {
    return [
      {
        source: '/',
        has: [{ type: 'host', value: 'extension.unfugly.app' }],
        destination: 'https://google.com',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
