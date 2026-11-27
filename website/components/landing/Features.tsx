"use client";

import styled from "styled-components";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Section, Eyebrow, SectionTitle, SectionLead, SectionHead } from "@/components/ui/Section";
import { IconMonitor, IconClock, IconCamera, IconCloud, IconShield, IconCode } from "@/components/ui/icons";

const Grid = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 1rem;

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: repeat(3, 1fr);
  }
`;

const Card = styled.li`
  padding: 1.5rem;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.line};
  background: ${({ theme }) => theme.colors.surface};
  transition: border-color 160ms ease;

  &:hover {
    border-color: ${({ theme }) => theme.colors.lineStrong};
  }

  h3 {
    margin: 1rem 0 0.45rem;
    font-size: 1.1rem;
    letter-spacing: -0.01em;
  }

  p {
    margin: 0;
    color: ${({ theme }) => theme.colors.muted};
    font-size: 0.97rem;
  }

  code {
    font-family: ${({ theme }) => theme.fonts.mono};
    font-size: 0.86em;
    color: ${({ theme }) => theme.colors.ink};
  }
`;

const IconBox = styled.span<{ $tone?: "accent" | "mint" }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 42px;
  height: 42px;
  border-radius: 12px;
  color: ${({ theme, $tone }) => ($tone === "mint" ? theme.colors.mint : theme.colors.accent)};
  background: ${({ theme, $tone }) => ($tone === "mint" ? theme.colors.mintSoft : theme.colors.accentSoft)};
`;

const features: { icon: ReactNode; title: string; body: ReactNode; tone?: "accent" | "mint" }[] = [
  {
    icon: <IconMonitor />,
    title: "Screen, window and system audio",
    body: (
      <>
        <code>desktopCapturer</code> picks the source and <code>getDisplayMedia</code> captures it, with loopback
        system audio on macOS 14.2+. No virtual audio driver, no kernel extension.
      </>
    ),
  },
  {
    icon: <IconCamera />,
    title: "Canvas compositor",
    body: "Screen and camera are drawn onto one canvas at 30 fps. The bubble's shape, size, border, mirroring and position are just state, so they can change mid-recording.",
  },
  {
    icon: <IconClock />,
    title: "Crash-safe recording",
    body: (
      <>
        <code>MediaRecorder</code> emits a WebM chunk every second and the main process appends it to disk. A crash
        loses about a second, and interrupted recordings are recovered on the next launch.
      </>
    ),
  },
  {
    icon: <IconCode />,
    title: "QuickTime-friendly output",
    body: "A bundled ffmpeg transcodes to H.264/AAC MP4 and keeps the real variable frame timing. Files play anywhere, with no extra installs.",
  },
  {
    icon: <IconCloud />,
    title: "Bring your own bucket",
    body: (
      <>
        S3, S3-compatible, Azure Blob and Google Cloud Storage share one <code>StorageProvider</code> interface, with
        multipart or resumable uploads, progress and pre-signed links.
      </>
    ),
    tone: "mint",
  },
  {
    icon: <IconShield />,
    title: "Secrets never reach the UI",
    body: (
      <>
        Credentials are encrypted with <code>safeStorage</code> (Keychain) and read only in the main process. The
        renderer is sandboxed and talks through a typed, validated bridge.
      </>
    ),
    tone: "mint",
  },
];

export function Features() {
  return (
    <Section id="inside">
      <Container>
        <SectionHead>
          <Eyebrow>What&apos;s inside</Eyebrow>
          <SectionTitle>A small, readable codebase that does the whole job</SectionTitle>
          <SectionLead>
            Capture, compositing, encoding, upload and link signing all live in one TypeScript repo. No native
            modules to compile and no backend to run.
          </SectionLead>
        </SectionHead>
        <Grid>
          {features.map((f) => (
            <Card key={f.title}>
              <IconBox $tone={f.tone}>{f.icon}</IconBox>
              <h3>{f.title}</h3>
              <p>{f.body}</p>
            </Card>
          ))}
        </Grid>
      </Container>
    </Section>
  );
}
