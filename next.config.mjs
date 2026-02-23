/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // Includi Chromium (bin + .br) nel deploy Vercel; altrimenti executablePath fallisce
  experimental: {
    outputFileTracingIncludes: {
      "/api/cron/sync-velocissimo": ["./node_modules/@sparticuz/chromium/**"],
    },
  },
};

export default nextConfig;
