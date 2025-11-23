import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "PayPunk",
    short_name: "PayPunk",
    description: "An Ethereum-based trustless shopping collective.",
    start_url: "/",
    display: "standalone",
    background_color: "#050505",
    theme_color: "#050505",
    scope: "/",
    id: "/",
    orientation: "portrait",
    icons: [
      {
        src: "/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
    shortcuts: [
      {
        name: "Browse listings",
        url: "/",
        description: "Jump straight into the curated PayPunk drops.",
      },
      {
        name: "Orders dashboard",
        url: "/orders",
        description: "Track the status of bounties you have requested.",
      },
    ],
    display_override: ["standalone", "minimal-ui", "browser"],
    lang: "en-US",
    categories: ["shopping", "finance"],
  };
}
