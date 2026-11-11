import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Homepage photo by Kartabya Aryal on Unsplash (free under the Unsplash License).
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/photo-1688818274551-de0b66ab6bc2",
      },
    ],
  },
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
