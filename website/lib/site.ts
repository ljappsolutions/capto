/** GitHub "owner/repo". Placeholder default: confirm before going public. */
export const githubRepo = process.env.NEXT_PUBLIC_GITHUB_REPO || "ljappsolutions/capto";

const repoUrl = `https://github.com/${githubRepo}`;

export const siteConfig = {
  name: "Capto",
  url: "https://capto.ljappsolutions.com",
  tagline: "An open-source screen recorder you build, own and host",
  description:
    "Capto is an open-source macOS screen recorder you build from source. It records locally, uploads to your own S3, R2, Azure or Google Cloud bucket, and signs expiring share links. No service, no accounts, no tracking.",
  github: repoUrl,
  cloneUrl: `${repoUrl}.git`,
  contributing: `${repoUrl}/blob/main/CONTRIBUTING.md`,
  architecture: `${repoUrl}/blob/main/docs/ARCHITECTURE.md`,
  issues: `${repoUrl}/issues`,
  goodFirstIssues: `${repoUrl}/labels/good%20first%20issue`,
  license: `${repoUrl}/blob/main/LICENSE`,
} as const;
