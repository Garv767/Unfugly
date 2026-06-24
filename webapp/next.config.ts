import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactCompiler: false,
  // Cross-origin requests from the browser to our backend (Render) are handled
  // via CORS on the backend itself, not here.
  // 'allowedDevOrigins' is only needed for Next.js HMR in dev and should never be '*'.
};

export default nextConfig;
