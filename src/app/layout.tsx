import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
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
        <footer className="border-t border-white/10 bg-[#061f34] px-6 py-10 text-white/70 sm:px-8 lg:px-10">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-center gap-4">
              <Image
                alt=""
                aria-hidden="true"
                className="h-12 w-12 rounded-full object-cover"
                height={96}
                src="/brand/consumption-diet-mark.png"
                width={96}
              />
              <div>
                <p className="text-lg font-semibold text-white">
                  Consumption Diet
                </p>
                <p className="mt-2 text-sm">Consume Less. Live Better.</p>
              </div>
            </div>
            <div className="text-sm sm:text-right">
              <a
                className="underline-offset-4 hover:text-white hover:underline"
                href="mailto:hello@consumptiondiet.com"
              >
                hello@consumptiondiet.com
              </a>
              <p className="mt-2">
                Copyright {new Date().getFullYear()} Consumption Diet
              </p>
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
