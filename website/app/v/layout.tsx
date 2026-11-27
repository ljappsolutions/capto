import type { Metadata } from "next";

// The share viewer carries signed URLs in the URL fragment. Keep it out of
// search engines and never send a referrer. No analytics on this route.
export const metadata: Metadata = {
  title: "Shared recording",
  description: "A screen recording shared with Capto.",
  referrer: "no-referrer",
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false },
  },
  alternates: { canonical: null },
  openGraph: {
    title: "Shared recording",
    description: "A screen recording shared with Capto.",
  },
};

export default function ViewerLayout({ children }: { children: React.ReactNode }) {
  return children;
}
