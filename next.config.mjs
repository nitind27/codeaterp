/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [],
  },
  async rewrites() {
    return [
      { source: '/uploads/avatars/:file', destination: '/api/media/avatars/:file' },
    ];
  },
};

export default nextConfig;
