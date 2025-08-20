import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack(config) {
    config.module.rules.push({
      test: /\.svg$/,
      use: ["@svgr/webpack"],
    });
    return config;
  },
  reactStrictMode:false,
    images:{
        domains:[
            'lh3.googleusercontent.com',
            'i.ibb.co'
        ]
    },
};

export default nextConfig;
