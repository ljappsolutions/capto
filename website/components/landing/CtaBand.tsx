"use client";

import Link from "next/link";
import styled from "styled-components";
import { Container } from "@/components/ui/Container";
import { Section, Eyebrow, SectionTitle, SectionLead, SectionHead } from "@/components/ui/Section";
import { Button } from "@/components/ui/Button";
import { IconArrowRight, IconGithub } from "@/components/ui/icons";
import { siteConfig } from "@/lib/site";

const Grid = styled.div`
  display: grid;
  gap: 1rem;

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr 1fr;
  }
`;

const Card = styled.div`
  min-width: 0;
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.line};
  background: ${({ theme }) => theme.colors.surface};
  overflow: hidden;

  h3 {
    margin: 0;
    padding: 0.8rem 1.1rem;
    border-bottom: 1px solid ${({ theme }) => theme.colors.line};
    font-size: 0.8rem;
    font-weight: 600;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: ${({ theme }) => theme.colors.muted};
  }
`;

const Pre = styled.pre`
  margin: 0;
  padding: 1rem 1.1rem 1.2rem;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.82rem;
  line-height: 1.85;
  overflow-x: auto;

  .p {
    color: ${({ theme }) => theme.colors.accent};
    user-select: none;
  }
  .c {
    color: ${({ theme }) => theme.colors.muted};
  }
  .d {
    color: ${({ theme }) => theme.colors.mint};
  }
`;

const Requirements = styled.p`
  margin: 1.25rem 0 0;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.93rem;

  code {
    font-family: ${({ theme }) => theme.fonts.mono};
    font-size: 0.88em;
    color: ${({ theme }) => theme.colors.ink};
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 1.75rem;
`;

const commands: [string, string][] = [
  ["yarn dev", "run with hot reload"],
  ["yarn test", "unit tests (Vitest)"],
  ["yarn typecheck", "tsc, main + renderer"],
  ["yarn lint", "ESLint"],
  ["yarn test:storage", "providers vs emulators"],
  ["yarn package:dir", "build your own Capto.app"],
  ["yarn package", ".app + .dmg"],
];

const layout: [string, string][] = [
  ["src/main/", "windows, capture, files, uploads"],
  ["src/main/storage/", "S3 · Azure · GCS providers"],
  ["src/preload/", "typed window.recorderAPI"],
  ["src/recorder/", "compositor, mixer, MediaRecorder"],
  ["src/renderer/", "React UI"],
  ["src/shared/", "pure, unit-tested helpers"],
  ["website/", "this site + the /v viewer"],
];

export function CtaBand() {
  return (
    <Section id="hack">
      <Container>
        <SectionHead>
          <Eyebrow>Hack on it</Eyebrow>
          <SectionTitle>Running in two minutes, readable in an afternoon</SectionTitle>
          <SectionLead>
            Capto is distributed as source. Run it in dev mode with hot reload, or package your own signed or ad-hoc{" "}
            <code>Capto.app</code> and keep it in Applications.
          </SectionLead>
        </SectionHead>
        <Grid>
          <Card>
            <h3>Commands</h3>
            <Pre>
              {commands.map(([cmd, what]) => (
                <span key={cmd}>
                  <span className="p">$ </span>
                  {cmd.padEnd(19)}
                  <span className="c">{what ? `# ${what}` : ""}</span>
                  {"\n"}
                </span>
              ))}
            </Pre>
          </Card>
          <Card>
            <h3>Layout</h3>
            <Pre>
              {layout.map(([dir, what]) => (
                <span key={dir}>
                  <span className="d">{dir.padEnd(19)}</span>
                  <span className="c">{what}</span>
                  {"\n"}
                </span>
              ))}
            </Pre>
          </Card>
        </Grid>
        <Requirements>
          Needs macOS 14+, Node.js 22+, Yarn 1.22 and the Xcode Command Line Tools. Docker is optional, for the storage
          emulators.
        </Requirements>
        <Actions>
          <Button as={Link} href="/docs/build" $size="lg">
            Build guide <IconArrowRight size={18} />
          </Button>
          <Button href={siteConfig.contributing} target="_blank" rel="noopener noreferrer" $variant="secondary" $size="lg">
            <IconGithub /> Contributing
          </Button>
          <Button href={siteConfig.goodFirstIssues} target="_blank" rel="noopener noreferrer" $variant="ghost" $size="lg">
            Good first issues
          </Button>
        </Actions>
      </Container>
    </Section>
  );
}
