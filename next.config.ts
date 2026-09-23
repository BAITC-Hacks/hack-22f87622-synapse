import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/*": ["./data/raw/*.csv"],
  },
};

export default nextConfig;
