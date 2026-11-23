import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  // Hosts allowed to load dev-only resources (HMR, /_next) when running `npm run dev` behind a VS Code / GitHub dev tunnel.
  allowedDevOrigins: ["127.0.0.1", "localhost", "*.devtunnels.ms"]
};

export default nextConfig;
