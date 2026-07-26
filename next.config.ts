import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Fleet placeholder photos are local SVGs served from /public/fleet.
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    // Admin-uploaded gallery media lives on Vercel Blob in production.
    remotePatterns: [
      { protocol: "https", hostname: "*.public.blob.vercel-storage.com" },
    ],
  },
};

export default nextConfig;
