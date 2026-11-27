# Capto website

Project site for Capto at **https://capto.ljappsolutions.com**, aimed at developers. It has a landing page explaining what Capto is and how it works, docs in MDX (building from source, architecture, sharing, storage setup), and the **`/v` share viewer**, which plays recordings straight from the sharer's own bucket. There are no downloads: Capto is distributed as source.

Stack: Next.js 16 (App Router), React 19, TypeScript, styled-components 6, MDX via `@next/mdx`, deployed with SST v4 (`sst.aws.Nextjs`) to AWS (us-east-1).

## Local development

```bash
cd website
yarn install
yarn dev          # http://localhost:3000
yarn lint
yarn build        # plain `next build` (no SST needed)
yarn start        # serve the production build
```

Try the viewer locally with a sample payload:

```bash
node -e 'const p={v:1,u:"https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",t:"Sample",e:new Date(Date.now()+2*864e5).toISOString()};console.log("http://localhost:3000/v#"+Buffer.from(JSON.stringify(p)).toString("base64url"))'
```

## Environment variables

Copy `.env.example` to `.env` (gitignored). Next.js and SST both read it. Nothing account-specific is committed to the repo.

| Variable | Used by | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_GITHUB_REPO` | build | GitHub `owner/repo` for source, clone, issue and edit links (default `ljappsolutions/capto`). Inlined at build time, so redeploy after changing it |
| `AWS_PROFILE` | deploy | AWS CLI profile to deploy with. Unset uses the default credential chain |
| `CAPTO_SITE_DOMAIN` | deploy | Custom domain, for example `capto.example.com`. Unset deploys to the CloudFront URL only |
| `CAPTO_SITE_CERT_ARN` | deploy | ACM certificate in **us-east-1** covering the domain. Required when `CAPTO_SITE_DOMAIN` is set |

## Deploy

```bash
yarn deploy       # sst deploy --stage production
yarn deploy:dev   # sst deploy --stage dev
```

You can also pass the values inline instead of using `.env`:

```bash
AWS_PROFILE=my-profile CAPTO_SITE_DOMAIN=capto.example.com \
CAPTO_SITE_CERT_ARN=arn:aws:acm:us-east-1:<account>:certificate/<id> yarn deploy
```

- Production uses `removal: "retain"` and `protect: true`. Other stages are removed on `sst remove`.
- DNS isn't managed by SST (`dns: false`). After the first deploy with a custom domain, add a **CNAME** at your DNS provider from the domain to the `cloudfront` output (for example `d1234abcd.cloudfront.net`), then wait for it to propagate.

## Structure

```
app/
  (site)/            pages with the site header and footer
    page.tsx         landing (what's inside, pipeline, storage, link decoder, FAQ)
    docs/            MDX docs; sidebar order lives in lib/docs.ts
    privacy/
  v/                 share viewer (no header/footer, noindex, no-referrer)
  layout.tsx         root layout, fonts, metadata, styled-components registry
  not-found.tsx, robots.ts, sitemap.ts, icon.svg, opengraph-image.tsx
components/          styled-components UI (client components)
lib/
  shareLink.ts       verbatim copy of ../src/shared/shareLink.ts (keep in sync)
  site.ts, docs.ts   site config and docs navigation
styles/theme.ts      theme tokens (CSS variables, dark default + light)
```

## The share viewer (`/v`)

Links look like `https://capto.ljappsolutions.com/v#<base64url JSON>`. The fragment is never sent to the server, so the site stays static and never sees signed URLs. The viewer:

- decodes the payload with `lib/shareLink.ts` (the same contract as the desktop app; keep both files identical below the header comment);
- plays the video directly from the sharer's bucket with no `crossOrigin` attribute, so buckets don't need CORS for playback;
- fetches captions (if present) separately and only shows them when the bucket allows CORS;
- has no analytics, sends `Referrer-Policy: no-referrer`, and is marked `noindex`.

No page on this site loads analytics or third-party scripts; fonts are self-hosted by `next/font`.
