export type DocLink = { href: string; title: string };
export type DocGroup = { title: string; links: DocLink[] };

export const docsNav: DocGroup[] = [
  {
    title: "Start",
    links: [
      { href: "/docs", title: "Overview" },
      { href: "/docs/build", title: "Build from source" },
      { href: "/docs/architecture", title: "Architecture" },
    ],
  },
  {
    title: "Sharing",
    links: [
      { href: "/docs/sharing", title: "How sharing works" },
      { href: "/docs/self-hosting", title: "Self-host the viewer" },
    ],
  },
  {
    title: "Storage setup",
    links: [
      { href: "/docs/aws-s3", title: "AWS S3" },
      { href: "/docs/s3-compatible", title: "Cloudflare R2 & S3-compatible" },
      { href: "/docs/azure", title: "Azure Blob Storage" },
      { href: "/docs/gcs", title: "Google Cloud Storage" },
    ],
  },
  {
    title: "Reference",
    links: [
      { href: "/docs/camera", title: "Camera overlay" },
      { href: "/docs/privacy-security", title: "Privacy & security" },
      { href: "/docs/troubleshooting", title: "Troubleshooting" },
    ],
  },
  {
    title: "Project",
    links: [{ href: "/docs/contributing", title: "Contributing" }],
  },
];

export const docsFlat: DocLink[] = docsNav.flatMap((g) => g.links);
