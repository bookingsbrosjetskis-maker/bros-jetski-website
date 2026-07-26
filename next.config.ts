import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fleet placeholder photos are local SVGs served from /public/fleet.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },
};

export default nextConfig;
