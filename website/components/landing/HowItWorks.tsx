"use client";

import Link from "next/link";
import styled from "styled-components";
import { Container } from "@/components/ui/Container";
import { Section, Eyebrow, SectionTitle, SectionLead, SectionHead } from "@/components/ui/Section";
import { IconArrowRight } from "@/components/ui/icons";

const Lanes = styled.div`
  display: grid;
  gap: 1rem;

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Lane = styled.section<{ $tone: "accent" | "mint" }>`
  padding: 1.4rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.line};
  background: ${({ theme }) => theme.colors.surface};

  h3 {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
    margin: 0 0 1rem;
    font-size: 1.05rem;
    letter-spacing: -0.01em;
  }

  h3 small {
    font-family: ${({ theme }) => theme.fonts.mono};
    font-size: 0.72rem;
    font-weight: 500;
    color: ${({ theme, $tone }) => ($tone === "mint" ? theme.colors.mint : theme.colors.accent)};
  }

  --lane: ${({ theme, $tone }) => ($tone === "mint" ? theme.colors.mint : theme.colors.accent)};
`;

const Steps = styled.ol`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`;

const Step = styled.li`
  position: relative;
  display: grid;
  grid-template-columns: 1.6rem 1fr;
  gap: 0.75rem;
  padding-bottom: 1rem;

  &::before {
    content: "";
    width: 0.7rem;
    height: 0.7rem;
    margin: 0.4rem 0 0 0.45rem;
    border-radius: 50%;
    background: var(--lane);
    box-shadow: 0 0 0 4px color-mix(in srgb, var(--lane) 18%, transparent);
  }

  &:not(:last-child)::after {
    content: "";
    position: absolute;
    left: calc(0.45rem + 0.35rem - 1px);
    top: 1.35rem;
    bottom: 0.1rem;
    width: 2px;
    background: ${({ theme }) => theme.colors.line};
  }

  strong {
    display: block;
    font-weight: 600;
  }

  span {
    display: block;
    color: ${({ theme }) => theme.colors.muted};
    font-size: 0.93rem;
  }

  code {
    font-family: ${({ theme }) => theme.fonts.mono};
    font-size: 0.78rem;
    color: ${({ theme }) => theme.colors.ink};
  }
`;

const Boundary = styled.div`
  display: grid;
  gap: 1rem;
  margin-top: 1rem;
  padding: 1.2rem 1.4rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px dashed ${({ theme }) => theme.colors.lineStrong};
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.95rem;

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1fr auto;
    align-items: center;
  }

  p {
    margin: 0;
  }

  code {
    font-family: ${({ theme }) => theme.fonts.mono};
    font-size: 0.85em;
    color: ${({ theme }) => theme.colors.ink};
  }

  a {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    color: ${({ theme }) => theme.colors.accent};
    font-weight: 600;
    text-decoration: none;
    white-space: nowrap;
  }
`;

const record = [
  { t: "Pick a source", d: "Screens and windows from desktopCapturer; Capto's own windows are filtered out.", c: "src/main/capture.ts" },
  { t: "Composite", d: "Screen + camera bubble drawn to a canvas at 30 fps; mic and system audio mixed with Web Audio.", c: "src/recorder/VideoCompositor.ts" },
  { t: "Encode and persist", d: "MediaRecorder WebM chunks, streamed to a .partial.webm file every second.", c: "src/main/recordings.ts" },
  { t: "Transcode", d: "ffmpeg converts to H.264/AAC MP4 and writes the metadata JSON next to it.", c: "src/main/transcode.ts" },
];

const share = [
  { t: "Upload", d: "Multipart (S3), block (Azure) or resumable (GCS) upload to {folder}/{yyyy}/{mm}/{id}/, plus a poster frame.", c: "src/main/storage/*" },
  { t: "Sign", d: "A read-only link signed locally: SigV4 for S3, a SAS token for Azure, a V4 signed URL for GCS.", c: "createSignedUrl()" },
  { t: "Wrap", d: "The signed URL, title and expiry are encoded into the fragment of a viewer link and copied to the clipboard.", c: "src/shared/shareLink.ts" },
  { t: "Watch", d: "A static page decodes the fragment in the browser and streams straight from your bucket.", c: "website/app/v" },
];

export function HowItWorks() {
  return (
    <Section $alt id="how-it-works">
      <Container>
        <SectionHead>
          <Eyebrow>How it works</Eyebrow>
          <SectionTitle>From pixels to a signed link, with no server in between</SectionTitle>
          <SectionLead>
            Recording happens entirely on your Mac. Sharing is a direct conversation between the app and your storage
            provider, and the viewer only ever talks to your bucket.
          </SectionLead>
        </SectionHead>
        <Lanes>
          <Lane $tone="accent" aria-labelledby="lane-record">
            <h3 id="lane-record">
              Record <small>local · offline</small>
            </h3>
            <Steps>
              {record.map((s) => (
                <Step key={s.t}>
                  <div>
                    <strong>{s.t}</strong>
                    <span>{s.d}</span>
                    <code>{s.c}</code>
                  </div>
                </Step>
              ))}
            </Steps>
          </Lane>
          <Lane $tone="mint" aria-labelledby="lane-share">
            <h3 id="lane-share">
              Share <small>your bucket · your keys</small>
            </h3>
            <Steps>
              {share.map((s) => (
                <Step key={s.t}>
                  <div>
                    <strong>{s.t}</strong>
                    <span>{s.d}</span>
                    <code>{s.c}</code>
                  </div>
                </Step>
              ))}
            </Steps>
          </Lane>
        </Lanes>
        <Boundary>
          <p>
            Security boundary: every window runs with <code>contextIsolation</code>, <code>sandbox</code> and no Node.
            The UI reaches the main process only through <code>window.recorderAPI</code>, whose <code>capto:*</code>{" "}
            IPC handlers validate every argument.
          </p>
          <Link href="/docs/architecture">
            Read the architecture <IconArrowRight size={16} />
          </Link>
        </Boundary>
      </Container>
    </Section>
  );
}
