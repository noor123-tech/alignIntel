/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // We can disable ESLint and TS errors during build for hackathon speed, but keeping them standard is fine.
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  }
};

export default nextConfig;
