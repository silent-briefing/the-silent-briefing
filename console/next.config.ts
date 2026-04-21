import type { NextConfig } from "next";

/** LAN / alternate hostnames for dev HMR (see Next.js allowedDevOrigins). Comma-separated. */
const extraOrigins = (process.env.NEXT_PUBLIC_ALLOWED_DEV_ORIGINS ?? "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

const nextConfig: NextConfig = {
  // Browsing the dev server from another device (e.g. phone on LAN) — add host/IP here or via env.
  allowedDevOrigins: ["127.0.0.1", "192.168.1.211", ...extraOrigins],
};

export default nextConfig;
