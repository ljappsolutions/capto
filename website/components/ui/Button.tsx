"use client";

import styled, { css } from "styled-components";

type Variant = "primary" | "secondary" | "ghost";
type Size = "md" | "lg" | "sm";

const variants = {
  primary: css`
    background: ${({ theme }) => theme.colors.accent};
    color: ${({ theme }) => theme.colors.accentInk};
    border: 1px solid ${({ theme }) => theme.colors.accent};

    &:hover {
      background: ${({ theme }) => theme.colors.accentHover};
      border-color: ${({ theme }) => theme.colors.accentHover};
    }
  `,
  secondary: css`
    background: ${({ theme }) => theme.colors.surface};
    color: ${({ theme }) => theme.colors.ink};
    border: 1px solid ${({ theme }) => theme.colors.lineStrong};

    &:hover {
      border-color: ${({ theme }) => theme.colors.muted};
    }
  `,
  ghost: css`
    background: transparent;
    color: ${({ theme }) => theme.colors.ink};
    border: 1px solid transparent;

    &:hover {
      background: ${({ theme }) => theme.colors.surface};
    }
  `,
};

const sizes = {
  sm: css`
    padding: 0.45rem 0.8rem;
    font-size: 0.875rem;
  `,
  md: css`
    padding: 0.7rem 1.15rem;
    font-size: 0.95rem;
  `,
  lg: css`
    padding: 0.9rem 1.5rem;
    font-size: 1rem;
  `,
};

export const buttonStyles = css<{ $variant?: Variant; $size?: Size }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  border-radius: ${({ theme }) => theme.radii.pill};
  font-family: ${({ theme }) => theme.fonts.body};
  font-weight: 600;
  line-height: 1.2;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition:
    background 160ms ease,
    border-color 160ms ease,
    color 160ms ease,
    transform 160ms ease;

  ${({ $variant = "primary" }) => variants[$variant]}
  ${({ $size = "md" }) => sizes[$size]}

  svg {
    flex-shrink: 0;
  }

  &:disabled,
  &[aria-disabled="true"] {
    opacity: 0.5;
    cursor: not-allowed;
  }

  @media (prefers-reduced-motion: no-preference) {
    &:hover {
      transform: translateY(-1px);
    }
  }
`;

export const Button = styled.a<{ $variant?: Variant; $size?: Size }>`
  ${buttonStyles}
`;

export const ActionButton = styled.button<{ $variant?: Variant; $size?: Size }>`
  ${buttonStyles}
`;
