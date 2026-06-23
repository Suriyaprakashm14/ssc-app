import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AuthGate } from "@/components/auth-gate";
import { PwaRegistration } from "@/components/pwa-registration";

export const metadata: Metadata = { title: "SSC War Room", description: "Your competitive exam study command center", manifest: "/manifest.webmanifest", appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "SSC War Room" } };
export const viewport: Viewport = { themeColor: "#080b12", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><PwaRegistration /><AuthGate>{children}</AuthGate></body></html>; }
