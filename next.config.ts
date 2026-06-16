import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns", "@radix-ui/react-select", "@radix-ui/react-dialog", "@radix-ui/react-dropdown-menu"],
  },
};

export default nextConfig;
