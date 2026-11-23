/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [],
  },
  experimental: {
    serverComponentsExternalPackages: ['sharp', '@node-rs/argon2'],
  },
};
export default nextConfig;
