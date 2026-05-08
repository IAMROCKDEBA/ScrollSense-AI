import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { StoreHydrator } from "@/components/providers/store-hydrator";
import { PwaProvider } from "@/components/pwa/pwa-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"]
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"]
});

export const metadata: Metadata = {
  applicationName: "ScrollSense AI",
  title: "ScrollSense AI",
  description: "AI-powered short-form video addiction risk predictor and digital well-being analyzer",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { url: "/icons/icon.svg", type: "image/svg+xml" }
    ],
    apple: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
  },
  appleWebApp: {
    capable: true,
    title: "ScrollSense AI",
    statusBarStyle: "black-translucent"
  },
  formatDetection: {
    telephone: false
  }
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#080605" },
    { media: "(prefers-color-scheme: light)", color: "#F6F0E5" }
  ],
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <StoreHydrator />
          <PwaProvider />
          <AppShell>{children}</AppShell>
        </ThemeProvider>
      </body>
    </html>
  );
}
