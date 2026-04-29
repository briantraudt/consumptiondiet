import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Consumption Diet | Consume Less. Live Better.",
  description:
    "A simple challenge to reduce noise, distraction, and excess so you can regain clarity, discipline, and purpose.",
  metadataBase: new URL("https://consumptiondiet.com"),
  openGraph: {
    title: "Consumption Diet",
    description: "Consume Less. Live Better.",
    url: "https://consumptiondiet.com",
    siteName: "Consumption Diet",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="flex min-h-full flex-col antialiased">
        {children}
      </body>
    </html>
  );
}
