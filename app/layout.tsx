import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { ServiceWorkerRegister } from "./ServiceWorkerRegister";
import "./globals.css";

export const metadata: Metadata = {
  title: "Weekly Family Menu Planner",
  description: "Generate and copy the household tiffin menu for the week.",
  manifest: "/manifest.webmanifest",
  applicationName: "Menu Planner",
  icons: {
    icon: "/icon.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#2c4a3e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ServiceWorkerRegister />
        {children}
      </body>
    </html>
  );
}
