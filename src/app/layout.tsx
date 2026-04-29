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
  title: "Consumption Diet | Less Is More",
  description:
    "Remove what does not matter so you can focus on what does.",
  metadataBase: new URL("https://consumptiondiet.com"),
  openGraph: {
    title: "Consumption Diet",
    description: "Less Is More.",
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
        <footer className="bg-white px-6 py-8 text-center text-xs font-medium text-[#0B2A44]/55">
          Copyright {new Date().getFullYear()} Consumption Diet
        </footer>
      </body>
    </html>
  );
}
