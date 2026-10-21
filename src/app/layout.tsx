import type { Metadata } from "next";
import { siteConfig } from "@/config/site";
import { Providers } from "@/components/providers";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${siteConfig.name} | Petualangan dimulai di sini`,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <noscript>
          <style>{`[data-motion] { opacity: 1 !important; transform: none !important; }`}</style>
        </noscript>
        <Providers>
          <a
            href="#main-content"
            className="sr-only z-50 rounded-md bg-foreground p-3 text-background focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
          >
            Lewati ke konten
          </a>
          {children}
        </Providers>
      </body>
    </html>
  );
}
