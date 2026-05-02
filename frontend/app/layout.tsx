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
  title: "Istap — İşini tap, gələcəyini qur!",
  description:
    "İşini tap, gələcəyini qur: vakansiya axtarışı, profil, seçilmişlər və müraciət; şirkətlər üçün elan və namizəd idarəetməsi.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="az"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="mesh-bg flex min-h-full flex-col text-slate-900"
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
