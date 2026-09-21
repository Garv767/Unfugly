import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: false,
  async redirects() {
    return [
      {
        // Matches the root and any deep paths (e.g., / or /setup)
        source: '/:path*', 
        has: [
          { 
            type: 'host', 
            value: 'extension.unfugly.app' 
          }
        ],
        // Routes everyone directly to your specific Chrome Web Store link
        destination: 'https://chromewebstore.google.com/detail/lfjlfkbcnoioefacgcjanjdiodphnoce',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
