import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
import { AppShell } from "@/components/layout/app-shell";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { MotionProvider } from "@/components/providers/motion-provider";
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

const display = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  display: "swap"
});

export const metadata: Metadata = {
  applicationName: "ScrollSense AI",
  title: {
    default: "ScrollSense AI — Understand your scroll",
    template: "%s · ScrollSense AI"
  },
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
    { media: "(prefers-color-scheme: dark)", color: "#0E0710" },
    { media: "(prefers-color-scheme: light)", color: "#FBF6F0" }
  ],
  colorScheme: "dark light",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} ${display.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <div className="aurora" aria-hidden="true">
            <div className="aurora-blob aurora-blob--1" />
            <div className="aurora-blob aurora-blob--2" />
            <div className="aurora-blob aurora-blob--3" />
          </div>
          <div className="grain" aria-hidden="true" />
          <a
            href="#main-content"
            className="focus-ring fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-foreground px-5 py-2.5 text-sm font-medium text-background transition-transform focus:translate-y-0"
          >
            Skip to content
          </a>
          <MotionProvider>
            <StoreHydrator />
            <PwaProvider />
            <AppShell>{children}</AppShell>
          </MotionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
