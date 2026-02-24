import type { Metadata } from "next";
import { getSiteConfig, getThemeCSS } from "@/lib/config";
import "./globals.css";

const site = getSiteConfig();

export const metadata: Metadata = {
  title: site.title,
  description: site.description,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const themeCSS = getThemeCSS();

  return (
    <html lang="en">
      <head>
        {themeCSS && <style dangerouslySetInnerHTML={{ __html: themeCSS }} />}
      </head>
      <body className="min-h-screen" style={{ backgroundColor: 'var(--page-bg)' }}>
        {children}
      </body>
    </html>
  );
}
