import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import { PredictionProvider } from "@/context/PredictionContext";
import WhatsAppFloatingButton from "@/components/layout/WhatsAppFloatingButton";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "GolPro",
  description:
    "GolPro - Pronósticos y resultados de fútbol",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <PredictionProvider>
          {children}
          <WhatsAppFloatingButton />
        </PredictionProvider>
      </body>
    </html>
  );
}