import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  compress: true,
  productionBrowserSourceMaps: false,
  // Allow LAN devices (phones on the same Wi-Fi) to hit the dev server and
  // receive HMR updates. Safe for dev only — has no effect in production.
  allowedDevOrigins: ["192.168.1.3", "192.168.1.*", "localhost"],
  experimental: {
    optimizePackageImports: ["@tanstack/react-query"],
  },
};

export default nextConfig;
