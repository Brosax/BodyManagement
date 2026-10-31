import type { Metadata, Viewport } from "next";
import { ViewTransitions } from "next-view-transitions";
import "./globals.css";
import AppShell from "@/components/AppShell";

export const metadata: Metadata = {
  title: "Body Management",
  description: "情侣健身记录",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Body",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#16a34a",
  colorScheme: "light",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ViewTransitions>
      <html lang="zh-CN">
        <body className="antialiased bg-gray-50 text-gray-900 min-h-dvh">
          <AppShell>{children}</AppShell>
        </body>
      </html>
    </ViewTransitions>
  );
}
