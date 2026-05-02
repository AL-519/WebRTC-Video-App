// frontend/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script"; // <-- Import Next.js Script
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
  title: "WebRTC Sync",
  description: "Secure, Peer-to-Peer Video Conferencing",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning // Prevents Next.js errors when our script changes the HTML class
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white dark:bg-gray-900 text-gray-900 dark:text-white transition-colors duration-300">
        
        {/* Next.js approved way to load a blocking script */}
        <Script id="theme-switcher" strategy="beforeInteractive">
          {`
            try {
              let theme = localStorage.getItem('theme') || 'device';
              if (theme === 'dark' || (theme === 'device' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                document.documentElement.classList.add('dark');
              } else {
                document.documentElement.classList.remove('dark');
              }
            } catch (_) {}
          `}
        </Script>

        {children}
      </body>
    </html>
  );
}