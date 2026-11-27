"use client";

import styled from "styled-components";

export const Section = styled.section<{ $alt?: boolean }>`
  padding: ${({ theme }) => theme.space.section} 0;
  background: ${({ theme, $alt }) => ($alt ? theme.colors.bgAlt : "transparent")};
  border-top: ${({ theme, $alt }) => ($alt ? `1px solid ${theme.colors.line}` : "none")};
  border-bottom: ${({ theme, $alt }) => ($alt ? `1px solid ${theme.colors.line}` : "none")};
  scroll-margin-top: 64px;
`;

export const Eyebrow = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 0.9rem;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.accent};
`;

export const SectionTitle = styled.h2`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: clamp(1.8rem, 4vw, 2.6rem);
  line-height: 1.12;
  letter-spacing: -0.03em;
  font-weight: 700;
  text-wrap: balance;
`;

export const SectionLead = styled.p`
  margin: 1rem 0 0;
  max-width: 60ch;
  font-size: 1.08rem;
  color: ${({ theme }) => theme.colors.muted};
  text-wrap: pretty;
`;

export const SectionHead = styled.div<{ $center?: boolean }>`
  margin-bottom: clamp(2rem, 5vw, 3.5rem);
  text-align: ${({ $center }) => ($center ? "center" : "left")};

  ${SectionLead} {
    margin-inline: ${({ $center }) => ($center ? "auto" : "0")};
  }
`;
