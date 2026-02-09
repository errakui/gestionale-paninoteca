import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignora errori ESLint durante il build (utile per deploy rapidi)
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Ignora errori TypeScript durante il build
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
