"use client";

import Link from "next/link";
import styled from "styled-components";
import { Container } from "@/components/ui/Container";
import { CaptoMark } from "@/components/ui/Logo";
import { siteConfig } from "@/lib/site";

const Foot = styled.footer`
  border-top: 1px solid ${({ theme }) => theme.colors.line};
  padding: 3rem 0 2.5rem;
  color: ${({ theme }) => theme.colors.muted};
  font-size: 0.92rem;
`;

const Grid = styled(Container)`
  display: grid;
  gap: 2rem;

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    grid-template-columns: 1.4fr repeat(3, 1fr);
  }
`;

const Col = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;

  h2 {
    margin: 0 0 0.25rem;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: ${({ theme }) => theme.colors.ink};
  }

  a {
    text-decoration: none;
    width: fit-content;

    &:hover {
      color: ${({ theme }) => theme.colors.ink};
    }
  }
`;

const BrandLine = styled.p`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0;
  font-weight: 700;
  color: ${({ theme }) => theme.colors.ink};
`;

const Small = styled.p`
  margin: 0;
  max-width: 34ch;
`;

export function SiteFooter() {
  return (
    <Foot>
      <Grid>
        <Col>
          <BrandLine>
            <CaptoMark size={22} /> Capto
          </BrandLine>
          <Small>An open-source macOS screen recorder you build, own and host. Your recordings, your bucket, your links.</Small>
          <Small>MIT licensed. No service, no accounts, no tracking.</Small>
        </Col>
        <Col>
          <h2>Project</h2>
          <Link href="/#inside">What&apos;s inside</Link>
          <Link href="/#how-it-works">How it works</Link>
          <Link href="/#faq">FAQ</Link>
          <Link href="/privacy">Privacy</Link>
        </Col>
        <Col>
          <h2>Docs</h2>
          <Link href="/docs/build">Build from source</Link>
          <Link href="/docs/architecture">Architecture</Link>
          <Link href="/docs/sharing">How sharing works</Link>
          <Link href="/docs/troubleshooting">Troubleshooting</Link>
        </Col>
        <Col>
          <h2>Open source</h2>
          <a href={siteConfig.github} target="_blank" rel="noopener noreferrer">GitHub</a>
          <a href={siteConfig.issues} target="_blank" rel="noopener noreferrer">Issues</a>
          <Link href="/docs/contributing">Contributing</Link>
          <a href={siteConfig.license} target="_blank" rel="noopener noreferrer">MIT license</a>
        </Col>
      </Grid>
    </Foot>
  );
}
