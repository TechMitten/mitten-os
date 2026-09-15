import type { Metadata } from "next";
import Script from "next/script";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./orion.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MittenOS",
  description: "A browser-based operating system powered by MittenOS",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" style={{ colorScheme: 'dark' }} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-hidden`}
      >
        {children}
        <Script
          id="umami-analytics"
          src="https://umami.techmitten.com/script.js"
          strategy="afterInteractive"
          data-website-id="275feb26-0ae3-42be-8d62-ba203d21861b"
        />
        <Script
          id="umami-recorder"
          src="https://umami.techmitten.com/recorder.js"
          strategy="afterInteractive"
          data-website-id="275feb26-0ae3-42be-8d62-ba203d21861b"
        />
        <Toaster />
      </body>
    </html>
  );
}
