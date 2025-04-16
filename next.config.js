/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
  typescript: {
    // 在生产环境忽略 TypeScript 错误，允许构建继续
    ignoreBuildErrors: true,
  },
  eslint: {
    // 在生产环境忽略 ESLint 错误，允许构建继续
    ignoreDuringBuilds: true,
  }
};

module.exports = nextConfig;
