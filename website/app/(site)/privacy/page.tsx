import type { Metadata } from "next";
import Link from "next/link";
import { PageArticle } from "@/components/content/PageArticle";
import { siteConfig } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Capto collects nothing. This website uses no cookies or tracking, and never sees your share links.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <PageArticle>
      <h1>Privacy</h1>
      <p>Short version: Capto collects nothing, and this website doesn&apos;t track you. Capto is software you build and run yourself; there is no Capto service.</p>

      <h2>The Capto app</h2>
      <ul>
        <li>No account, no sign-in, no telemetry, no analytics, no crash reporting to us.</li>
        <li>Recordings are saved on your Mac. They only leave it if you choose to upload them, and then only to the cloud storage account you configured (AWS S3, an S3-compatible service, Azure Blob Storage or Google Cloud Storage).</li>
        <li>Storage credentials are encrypted with the macOS Keychain (via Electron <code>safeStorage</code>) and are only ever sent to your storage provider.</li>
        <li>There is no Capto server. We never receive your videos, credentials or links.</li>
      </ul>
      <p>
        Details: <Link href="/docs/privacy-security">Privacy &amp; security docs</Link>.
      </p>

      <h2>This website</h2>
      <ul>
        <li>No cookies, no analytics, no advertising or tracking scripts, no third-party embeds.</li>
        <li>Fonts are served from this site, not from a third-party font service.</li>
        <li>
          Like any website, the hosting infrastructure (AWS CloudFront) may keep standard access logs (IP address,
          requested page, user agent) for security and operations. We don&apos;t use them to profile anyone.
        </li>
      </ul>

      <h2>Share links (the viewer page)</h2>
      <p>
        Capto share links look like <code>{siteConfig.url.replace("https://", "")}/v#…</code>. Everything after the{" "}
        <code>#</code> (the video address, title and expiry) is the URL <em>fragment</em>. Browsers never send the
        fragment to a web server, so this site never sees which video you&apos;re watching. The page decodes it in your
        browser and plays the video directly from the sender&apos;s own storage.
      </p>
      <p>
        The viewer page sends no referrer, has no analytics and is excluded from search engines. Your request for the
        video goes to the sender&apos;s storage provider, which may log it under that provider&apos;s terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Open an issue on <a href={siteConfig.issues}>GitHub</a>.
      </p>
      <p>
        <small>Last updated: November 2026</small>
      </p>
    </PageArticle>
  );
}
