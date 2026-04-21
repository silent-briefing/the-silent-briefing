import { ClerkProvider } from "@clerk/nextjs";
import type { Metadata } from "next";
import { Inter, Newsreader } from "next/font/google";
import { AppProviders } from "@/components/providers/app-providers";
import "./globals.css";
import { QueryProvider } from "@/lib/query/provider";
import { cn } from "@/lib/utils";

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
        className={cn("h-full", "antialiased", newsreader.variable, inter.variable, "font-sans")}
      >
        <body className="flex min-h-screen flex-col bg-surface font-sans text-[var(--fg-2)]">
          <QueryProvider>
            <AppProviders>
              <div className="flex min-h-0 flex-1 flex-col">{children}</div>
            </AppProviders>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
