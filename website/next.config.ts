import type { NextConfig } from "next";
import path from "node:path";
import createMDX from "@next/mdx";

const nextConfig: NextConfig = {
  compiler: {
    styledComponents: true,
  },
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  poweredByHeader: false,
  // website/ has its own lockfile inside the Electron app's repo; pin the root.
  turbopack: {
    root: path.join(__dirname),
  },
  async headers() {
    return [
      {
        // The share viewer carries signed URLs in the fragment. Never leak a
        // referrer, never index it.
        source: "/v",
        headers: [
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
        ],
      },
    ];
  },
};

// Plugins are passed by name so the config stays serializable for Turbopack.
const withMDX = createMDX({
  options: {
    remarkPlugins: [["remark-gfm", {}]],
  },
});

export default withMDX(nextConfig);
