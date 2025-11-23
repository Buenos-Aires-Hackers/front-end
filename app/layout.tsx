import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AppProvider } from "./providers/AppProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "PayPunk",
  title: {
    default: "PayPunk — Trustless shopping collective",
    template: "%s | PayPunk",
  },
  description: "An Ethereum-based trustless shopping collective.",
  keywords: [
    "PayPunk",
    "Ethereum commerce",
    "crypto shopping",
    "decentralized marketplace",
    "PWA",
  ],
  category: "shopping",
  manifest: "/manifest.webmanifest",
  colorScheme: "dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#050505" },
  ],
  formatDetection: {
    address: false,
    email: false,
    telephone: false,
  },
  openGraph: {
    title: "PayPunk — Trustless shopping collective",
    description: "An Ethereum-based trustless shopping collective.",
    url: "/",
    siteName: "PayPunk",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/android-chrome-512x512.png",
        width: 512,
        height: 512,
        alt: "PayPunk neon emblem",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PayPunk — Trustless shopping collective",
    description: "An Ethereum-based trustless shopping collective.",
    images: ["/android-chrome-512x512.png"],
  },
  icons: {
    icon: [
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
    other: [{ rel: "mask-icon", url: "/file.svg", color: "#22c55e" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PayPunk",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
