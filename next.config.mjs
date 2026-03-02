/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'www.redditstatic.com',
      },
      {
        protocol: 'https',
        hostname: 'styles.redditmedia.com',
      },
      {
        protocol: 'https',
        hostname: '*.redd.it',
      },
    ],
  },
};

export default nextConfig;
