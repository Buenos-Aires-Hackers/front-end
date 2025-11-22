import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["pino-pretty", "lokijs", "encoding"],
};

export default nextConfig;
