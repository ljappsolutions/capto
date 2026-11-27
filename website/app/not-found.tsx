import type { Metadata } from "next";
import { NotFoundView } from "@/components/layout/NotFoundView";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <SiteHeader />
      <main id="main">
        <NotFoundView />
      </main>
      <SiteFooter />
    </>
  );
}
