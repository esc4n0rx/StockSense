/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Remova ou comente essa linha
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: { unoptimized: true },
};

module.exports = nextConfig;

