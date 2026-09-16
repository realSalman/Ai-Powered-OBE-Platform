import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  preload: false,
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  preload: false,
});

import { AuthProvider } from "../context/AuthContext";
import { ToastProvider } from "../components/ui/Toast";
import { AIProvider } from "../context/AIContext";

export const metadata: Metadata = {
  title: "AtlasAI",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <AIProvider>
            <ToastProvider>
              {children}
            </ToastProvider>
          </AIProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
