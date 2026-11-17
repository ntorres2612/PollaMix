import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";

import "./globals.css";

import { PredictionProvider } from "@/context/PredictionContext";
import Footer from "@/components/layout/Footer";
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
  title: "Total Gol",
  description:
    "Total Gol - Pronósticos y resultados de fútbol",
  icons: {
    icon: [
      { url: "/icons/totalgol.png", type: "image/png", sizes: "512x512" },
    ],
    apple: "/icons/totalgol-apple.png",
  },
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
          <Footer />
          <WhatsAppFloatingButton />
        </PredictionProvider>
      </body>
    </html>
  );
}