import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import "./globals.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  variable: "--font-newsreader",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Silent Briefing",
  description: "Political intelligence console for Utah",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html
        lang="en"
        className={`${newsreader.variable} ${inter.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col bg-surface font-sans">{children}</body>
      </html>
    </ClerkProvider>
  );
}
