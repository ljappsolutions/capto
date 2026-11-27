"use client";

import styled from "styled-components";

/** Typography for MDX docs content. */
export const Prose = styled.article`
  min-width: 0;
  max-width: 760px;
  font-size: 1.02rem;
  line-height: 1.7;
  overflow-wrap: break-word;

  > :first-child {
    margin-top: 0;
  }

  h1 {
    margin: 0 0 1rem;
    font-size: clamp(2rem, 5vw, 2.6rem);
    line-height: 1.1;
    letter-spacing: -0.035em;
  }

  h1 + p {
    font-size: 1.12rem;
    color: ${({ theme }) => theme.colors.muted};
  }

  h2 {
    margin: 2.6rem 0 0.8rem;
    padding-top: 1.6rem;
    border-top: 1px solid ${({ theme }) => theme.colors.line};
    font-size: 1.45rem;
    letter-spacing: -0.02em;
    line-height: 1.25;
  }

  h3 {
    margin: 2rem 0 0.6rem;
    font-size: 1.12rem;
    letter-spacing: -0.01em;
  }

  p,
  ul,
  ol {
    margin: 0.9rem 0;
  }

  ul,
  ol {
    padding-left: 1.4rem;
  }

  li + li {
    margin-top: 0.35rem;
  }

  li > ul,
  li > ol {
    margin: 0.35rem 0;
  }

  a {
    color: ${({ theme }) => theme.colors.accent};
    text-underline-offset: 2px;

    &:hover {
      color: ${({ theme }) => theme.colors.accentHover};
    }
  }

  strong {
    color: ${({ theme }) => theme.colors.ink};
  }

  code {
    font-family: ${({ theme }) => theme.fonts.mono};
    font-size: 0.86em;
    padding: 0.12em 0.4em;
    border-radius: 6px;
    background: ${({ theme }) => theme.colors.surface};
    border: 1px solid ${({ theme }) => theme.colors.line};
  }

  pre {
    margin: 1.1rem 0;
    padding: 1rem 1.1rem;
    border-radius: ${({ theme }) => theme.radii.md};
    background: ${({ theme }) => theme.colors.bgAlt};
    border: 1px solid ${({ theme }) => theme.colors.line};
    overflow-x: auto;
    line-height: 1.55;

    code {
      padding: 0;
      border: none;
      background: none;
      font-size: 0.85rem;
    }
  }

  blockquote {
    margin: 1.2rem 0;
    padding: 0.8rem 1.1rem;
    border-left: 3px solid ${({ theme }) => theme.colors.accent};
    border-radius: 0 ${({ theme }) => theme.radii.sm} ${({ theme }) => theme.radii.sm} 0;
    background: ${({ theme }) => theme.colors.accentSoft};

    p {
      margin: 0.3rem 0;
    }
  }

  table {
    display: block;
    width: 100%;
    max-width: 100%;
    overflow-x: auto;
    margin: 1.2rem 0;
    border-collapse: collapse;
    font-size: 0.94rem;
  }

  th,
  td {
    padding: 0.6rem 0.8rem;
    border: 1px solid ${({ theme }) => theme.colors.line};
    text-align: left;
    vertical-align: top;
  }

  th {
    background: ${({ theme }) => theme.colors.surface};
    font-weight: 600;
  }

  hr {
    margin: 2.5rem 0;
    border: none;
    border-top: 1px solid ${({ theme }) => theme.colors.line};
  }
`;
