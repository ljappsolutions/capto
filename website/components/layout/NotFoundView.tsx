"use client";

import Link from "next/link";
import styled from "styled-components";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

const Wrap = styled(Container)`
  padding: clamp(4rem, 14vw, 9rem) 0;
  text-align: center;

  p:first-child {
    margin: 0;
    font-family: ${({ theme }) => theme.fonts.mono};
    color: ${({ theme }) => theme.colors.accent};
  }

  h1 {
    margin: 0.5rem 0 0.75rem;
    font-size: clamp(2rem, 6vw, 3rem);
    letter-spacing: -0.035em;
  }

  p {
    color: ${({ theme }) => theme.colors.muted};
  }
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.75rem;
  margin-top: 2rem;
`;

export function NotFoundView() {
  return (
    <Wrap>
      <p>404</p>
      <h1>This page cut out mid-recording</h1>
      <p>The page you&apos;re looking for doesn&apos;t exist or has moved.</p>
      <Actions>
        <Button as={Link} href="/">
          Back home
        </Button>
        <Button as={Link} href="/docs" $variant="secondary">
          Browse the docs
        </Button>
      </Actions>
    </Wrap>
  );
}
