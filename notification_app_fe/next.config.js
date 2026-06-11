/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ["logging_middleware"],
  turbopack: {
    root: __dirname,
  },
};

module.exports = nextConfig;
