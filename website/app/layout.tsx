import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import StyledComponentsRegistry from "./registry";
import Providers from "./providers";
import { siteConfig } from "@/lib/site";
import "./globals.css";

const geist = Geist({ variable: "--font-body", subsets: ["latin"], display: "swap" });
const geistMono = Geist_Mono({ variable: "--font-mono", subsets: ["latin"], display: "swap" });

const title = `${siteConfig.name}: an open-source screen recorder you build, own and host`;

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [
    "open source screen recorder",
    "self-hosted",
    "macOS screen recording",
    "Electron",
    "TypeScript",
    "local-first",
    "presigned URL",
    "S3",
    "Cloudflare R2",
    "Azure Blob",
    "Google Cloud Storage",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title,
    description: siteConfig.description,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title,
    description: siteConfig.description,
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: dark)", color: "#0a0b0f" },
    { media: "(prefers-color-scheme: light)", color: "#f7f7f4" },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body>
        <StyledComponentsRegistry>
          <Providers>{children}</Providers>
        </StyledComponentsRegistry>
      </body>
    </html>
  );
}
