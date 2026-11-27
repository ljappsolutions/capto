// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="./.sst/platform/config.d.ts" />

/**
 * Deployment settings come from the environment (or website/.env, which is
 * gitignored) so no account-specific values live in the repo:
 *
 *   AWS_PROFILE           AWS CLI profile to deploy with (default credential chain if unset)
 *   CAPTO_SITE_DOMAIN     custom domain, e.g. capto.example.com (optional)
 *   CAPTO_SITE_CERT_ARN   ACM certificate in us-east-1 covering CAPTO_SITE_DOMAIN
 *                         (required when CAPTO_SITE_DOMAIN is set; DNS is managed outside SST)
 *   NEXT_PUBLIC_GITHUB_REPO  "owner/repo" for source and issue links
 *
 * Without CAPTO_SITE_DOMAIN the site deploys to its CloudFront URL only.
 */
export default $config({
  app(input) {
    return {
      name: "capto-site",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: ["production"].includes(input?.stage),
      home: "aws",
      providers: {
        aws: {
          profile: process.env.AWS_PROFILE || undefined,
          region: "us-east-1",
        },
      },
    };
  },
  async run() {
    const domainName = process.env.CAPTO_SITE_DOMAIN?.trim();
    const certArn = process.env.CAPTO_SITE_CERT_ARN?.trim();
    if (domainName && !certArn) {
      throw new Error("CAPTO_SITE_CERT_ARN is required when CAPTO_SITE_DOMAIN is set.");
    }

    const site = new sst.aws.Nextjs("Site", {
      // DNS is managed outside AWS: after deploying, point a CNAME for the
      // domain at the `cloudfront` output below.
      domain: domainName ? { name: domainName, dns: false, cert: certArn } : undefined,
      environment: {
        NEXT_PUBLIC_GITHUB_REPO: process.env.NEXT_PUBLIC_GITHUB_REPO || "ljappsolutions/capto",
      },
    });

    return {
      url: site.url,
      cloudfront: site.nodes.cdn.url,
    };
  },
});
