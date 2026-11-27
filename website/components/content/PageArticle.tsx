"use client";

import styled from "styled-components";
import { Container } from "@/components/ui/Container";
import { Prose } from "@/components/docs/Prose";

const Wrap = styled.div`
  padding: clamp(2.5rem, 7vw, 5rem) 0 clamp(3rem, 8vw, 6rem);
`;

export function PageArticle({ children }: { children: React.ReactNode }) {
  return (
    <Wrap>
      <Container $narrow>
        <Prose>{children}</Prose>
      </Container>
    </Wrap>
  );
}
