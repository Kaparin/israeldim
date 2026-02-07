import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Noto_Sans_Hebrew } from "next/font/google";
import { LocaleProvider } from "@/i18n/context";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const notoHebrew = Noto_Sans_Hebrew({
  variable: "--font-noto-hebrew",
  subsets: ["hebrew"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "ElectriQuiz — הכנה לרישיון חשמלאי",
  description: "Подготовка к экзамену на лицензию электрика в Израиле",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="he" dir="rtl" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${notoHebrew.variable} font-sans antialiased min-h-screen bg-background`}
        style={{ fontFamily: "var(--font-geist-sans), var(--font-noto-hebrew), sans-serif" }}
      >
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
