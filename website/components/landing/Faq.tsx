"use client";

import Link from "next/link";
import styled from "styled-components";
import type { ReactNode } from "react";
import { Container } from "@/components/ui/Container";
import { Section, Eyebrow, SectionTitle, SectionHead } from "@/components/ui/Section";
import { siteConfig } from "@/lib/site";

const List = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
`;

const Item = styled.details`
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.line};
  background: ${({ theme }) => theme.colors.surface};

  &[open] {
    border-color: ${({ theme }) => theme.colors.lineStrong};
  }

  summary {
    list-style: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 1rem;
    padding: 1.1rem 1.25rem;
    font-weight: 600;
    cursor: pointer;
    border-radius: ${({ theme }) => theme.radii.md};
  }

  summary::-webkit-details-marker {
    display: none;
  }

  summary::after {
    content: "+";
    flex-shrink: 0;
    font-size: 1.3rem;
    line-height: 1;
    color: ${({ theme }) => theme.colors.muted};
    transition: transform 160ms ease;
  }

  &[open] summary::after {
    transform: rotate(45deg);
  }

  div {
    padding: 0 1.25rem 1.2rem;
    color: ${({ theme }) => theme.colors.muted};
  }

  p {
    margin: 0;
  }

  a {
    color: ${({ theme }) => theme.colors.accent};
  }

  code {
    font-family: ${({ theme }) => theme.fonts.mono};
    font-size: 0.86em;
    color: ${({ theme }) => theme.colors.ink};
  }
`;

const faqs: { q: string; a: ReactNode }[] = [
  {
    q: "How do I get Capto?",
    a: (
      <p>
        Clone the repository and build it. Capto is distributed as source code: <code>yarn package:dir</code> takes a
        couple of minutes and gives you a <code>Capto.app</code> you compiled yourself. You can sign it with your own
        Apple Developer ID if you have one. See <Link href="/docs/build">Build from source</Link>.
      </p>
    ),
  },
  {
    q: "Why Electron instead of a native Swift app?",
    a: (
      <p>
        Chromium already ships the hard parts: <code>getDisplayMedia</code> with loopback audio, <code>MediaRecorder</code>,
        canvas compositing and Web Audio mixing. That keeps Capto to one TypeScript codebase with no native modules. The
        trade-off is app size and memory compared to a native recorder.
      </p>
    ),
  },
  {
    q: "Does this website see my videos or links?",
    a: (
      <p>
        No. The viewer is static client-side code, and the signed URL lives in the URL fragment, which browsers never
        send to a server. The video streams straight from your bucket. You can also{" "}
        <Link href="/docs/self-hosting">host the viewer yourself</Link> or share raw signed URLs.
      </p>
    ),
  },
  {
    q: "Can I work on uploads without a cloud account?",
    a: (
      <p>
        Yes. <code>yarn test:storage:up</code> starts S3Mock, Azurite and fake-gcs-server in Docker, and the app can be
        pointed at any of them. See <Link href="/docs/contributing">Contributing</Link>.
      </p>
    ),
  },
  {
    q: "Are Azure and Google Cloud production-ready?",
    a: (
      <p>
        Both are implemented and pass integration tests against their emulators, but haven&apos;t been verified against
        real accounts yet. If you try one, please report back in an <a href={siteConfig.issues}>issue</a>.
      </p>
    ),
  },
  {
    q: "Windows or Linux?",
    a: (
      <p>
        Not today. Capto relies on macOS screen-capture permissions, ScreenCaptureKit loopback audio and the Keychain.
        Most of the code is portable Electron and TypeScript, so a port is realistic, and contributions are welcome.
      </p>
    ),
  },
  {
    q: "What's the license?",
    a: (
      <p>
        <a href={siteConfig.license}>MIT</a>. Fork it, rebrand it, ship it inside your company.
      </p>
    ),
  },
];

export function Faq() {
  return (
    <Section $alt id="faq">
      <Container $narrow>
        <SectionHead $center>
          <Eyebrow>FAQ</Eyebrow>
          <SectionTitle>Questions developers ask</SectionTitle>
        </SectionHead>
        <List>
          {faqs.map((f) => (
            <Item key={f.q}>
              <summary>{f.q}</summary>
              <div>{f.a}</div>
            </Item>
          ))}
        </List>
      </Container>
    </Section>
  );
}
