"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import styled from "styled-components";
import { Container } from "@/components/ui/Container";
import { Section, Eyebrow, SectionTitle, SectionLead, SectionHead } from "@/components/ui/Section";
import { IconArrowRight } from "@/components/ui/icons";
import { buildViewerUrl, decodeSharePayload, type SharePayload } from "@/lib/shareLink";
import { siteConfig } from "@/lib/site";

const SAMPLE: SharePayload = {
  v: 1,
  u: "https://your-bucket.s3.us-east-1.amazonaws.com/capto/2026/11/rec-1a2b/Onboarding.mp4?X-Amz-Expires=604800&X-Amz-Signature=3f9c…",
  p: "https://your-bucket.s3.us-east-1.amazonaws.com/capto/2026/11/rec-1a2b/poster.jpg?X-Amz-Signature=8d21…",
  t: "Onboarding walkthrough",
  e: "2026-12-03T23:31:23.000Z",
  d: 184000,
};

const FIELDS: Record<string, string> = {
  v: "payload version",
  u: "signed video URL",
  p: "signed poster URL",
  c: "signed captions URL",
  t: "title",
  e: "link expiry (ISO 8601)",
  d: "duration in ms",
};

const Grid = styled.div`
  display: grid;
  gap: 1.5rem;

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 0.9fr 1.1fr;
    align-items: start;
  }
`;

const Points = styled.ul`
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 1rem;

  li {
    padding-left: 1rem;
    border-left: 2px solid ${({ theme }) => theme.colors.line};
    color: ${({ theme }) => theme.colors.muted};
  }

  strong {
    display: block;
    color: ${({ theme }) => theme.colors.ink};
  }

  code {
    font-family: ${({ theme }) => theme.fonts.mono};
    font-size: 0.85em;
    color: ${({ theme }) => theme.colors.ink};
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    color: ${({ theme }) => theme.colors.accent};
    font-weight: 600;
    text-decoration: none;
  }
`;

const Panel = styled.div`
  min-width: 0;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.lineStrong};
  background: ${({ theme }) => theme.colors.surface};
  overflow: hidden;
`;

const PanelHead = styled.label`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid ${({ theme }) => theme.colors.line};
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.muted};

  button {
    border: 0;
    background: none;
    padding: 0;
    font: inherit;
    letter-spacing: 0;
    text-transform: none;
    color: ${({ theme }) => theme.colors.accent};
    cursor: pointer;
  }
`;

const Input = styled.textarea`
  display: block;
  width: 100%;
  min-height: 5.5rem;
  margin: 0;
  padding: 0.85rem 1rem;
  border: 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.line};
  background: ${({ theme }) => theme.colors.bgAlt};
  color: ${({ theme }) => theme.colors.ink};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.78rem;
  line-height: 1.6;
  resize: vertical;
  word-break: break-all;

  &:focus {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: -2px;
  }
`;

const Output = styled.pre`
  margin: 0;
  padding: 1rem;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.78rem;
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-all;

  .k {
    color: ${({ theme }) => theme.colors.mint};
  }
  .s {
    color: ${({ theme }) => theme.colors.ink};
  }
  .n {
    color: ${({ theme }) => theme.colors.accent};
  }
  .c {
    color: ${({ theme }) => theme.colors.muted};
  }
  .err {
    color: ${({ theme }) => theme.colors.warn};
  }
`;

function Decoded({ payload }: { payload: SharePayload }) {
  const entries = Object.entries(payload) as [string, string | number][];
  return (
    <>
      {"{\n"}
      {entries.map(([k, v], i) => (
        <span key={k}>
          {"  "}
          <span className="k">&quot;{k}&quot;</span>:{" "}
          {typeof v === "number" ? <span className="n">{v}</span> : <span className="s">{JSON.stringify(v)}</span>}
          {i < entries.length - 1 ? "," : ""} <span className="c">{"// " + (FIELDS[k] ?? "")}</span>
          {"\n"}
        </span>
      ))}
      {"}"}
    </>
  );
}

export function LinkFormat() {
  const sampleLink = useMemo(() => buildViewerUrl(siteConfig.url, SAMPLE), []);
  const [value, setValue] = useState(sampleLink);

  const decoded = useMemo(() => {
    const hash = value.includes("#") ? value.slice(value.indexOf("#") + 1) : value;
    return decodeSharePayload(hash);
  }, [value]);

  return (
    <Section $alt id="link-format">
      <Container>
        <SectionHead>
          <Eyebrow>The link</Eyebrow>
          <SectionTitle>Everything after the # stays in the browser</SectionTitle>
          <SectionLead>
            A share link is a static viewer page plus a base64url JSON payload in the URL fragment. Browsers never send
            the fragment to a server, so whoever hosts the viewer never learns which video you&apos;re watching.
          </SectionLead>
        </SectionHead>
        <Grid>
          <Points>
            <li>
              <strong>One shared contract</strong>
              The format is defined in <code>src/shared/shareLink.ts</code> and copied verbatim into the website.
              Payloads are versioned, and non-HTTP URLs are rejected on decode.
            </li>
            <li>
              <strong>Host the viewer yourself</strong>
              Deploy <code>website/</code> anywhere Next.js runs, then set <em>Settings → Sharing → Advanced → Viewer base URL</em>{" "}
              to your domain. Or skip the viewer and share the raw signed URL.
            </li>
            <li>
              <strong>Revocation is deletion</strong>
              A signed URL can&apos;t be un-signed. Delete the object (Capto has a button for it) and every link to it
              dies at once.
              <br />
              <Link href="/docs/sharing">
                How sharing works <IconArrowRight size={15} />
              </Link>
            </li>
          </Points>
          <Panel>
            <PanelHead htmlFor="link-decoder">
              Paste a Capto link to decode it
              {value !== sampleLink && (
                <button type="button" onClick={() => setValue(sampleLink)}>
                  Reset sample
                </button>
              )}
            </PanelHead>
            <Input
              id="link-decoder"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              spellCheck={false}
              aria-describedby="link-decoder-out"
            />
            <Output id="link-decoder-out" aria-live="polite">
              {decoded ? (
                <Decoded payload={decoded} />
              ) : (
                <span className="err">Not a valid Capto payload. Decoding runs locally in your browser.</span>
              )}
            </Output>
          </Panel>
        </Grid>
      </Container>
    </Section>
  );
}
