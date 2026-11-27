import { Hero } from "@/components/landing/Hero";
import { Features } from "@/components/landing/Features";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { Providers } from "@/components/landing/Providers";
import { LinkFormat } from "@/components/landing/LinkFormat";
import { CtaBand } from "@/components/landing/CtaBand";
import { Faq } from "@/components/landing/Faq";
import { siteConfig } from "@/lib/site";

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareSourceCode",
  name: "Capto",
  description: siteConfig.description,
  url: siteConfig.url,
  codeRepository: siteConfig.github,
  programmingLanguage: "TypeScript",
  runtimePlatform: "Electron (macOS 14+)",
  license: "https://opensource.org/licenses/MIT",
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Hero />
      <Features />
      <HowItWorks />
      <Providers />
      <LinkFormat />
      <CtaBand />
      <Faq />
    </>
  );
}
