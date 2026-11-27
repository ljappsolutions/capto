"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { CaptoMark } from "@/components/ui/Logo";
import { IconGithub } from "@/components/ui/icons";
import { siteConfig } from "@/lib/site";

const Bar = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  backdrop-filter: saturate(1.4) blur(14px);
  -webkit-backdrop-filter: saturate(1.4) blur(14px);
  background: color-mix(in srgb, ${({ theme }) => theme.colors.bg} 78%, transparent);
  border-bottom: 1px solid ${({ theme }) => theme.colors.line};
`;

const Inner = styled(Container)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  height: 64px;
`;

export const Brand = styled(Link)`
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  font-family: ${({ theme }) => theme.fonts.display};
  font-weight: 700;
  font-size: 1.15rem;
  letter-spacing: -0.02em;
  text-decoration: none;
  color: ${({ theme }) => theme.colors.ink};
`;

const Nav = styled.nav`
  display: flex;
  align-items: center;
  gap: 0.25rem;

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    gap: 0.5rem;
  }
`;

const NavLink = styled(Link)<{ $active?: boolean }>`
  padding: 0.45rem 0.6rem;
  border-radius: ${({ theme }) => theme.radii.pill};
  font-size: 0.93rem;
  font-weight: 500;
  text-decoration: none;
  color: ${({ theme, $active }) => ($active ? theme.colors.ink : theme.colors.muted)};
  background: ${({ theme, $active }) => ($active ? theme.colors.surface : "transparent")};

  &:hover {
    color: ${({ theme }) => theme.colors.ink};
  }

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: 0.45rem 0.85rem;
  }
`;

const FeaturesLink = styled(NavLink)`
  display: none;

  @media (min-width: ${({ theme }) => theme.breakpoints.sm}) {
    display: inline-block;
  }
`;

const GithubLink = styled.a`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 38px;
  height: 38px;
  border-radius: ${({ theme }) => theme.radii.pill};
  color: ${({ theme }) => theme.colors.muted};

  &:hover {
    color: ${({ theme }) => theme.colors.ink};
    background: ${({ theme }) => theme.colors.surface};
  }
`;

const BuildCta = styled(Button)`
  display: none;

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    display: inline-flex;
  }
`;

export function SiteHeader() {
  const pathname = usePathname() || "/";
  const is = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`);

  return (
    <Bar>
      <Inner>
        <Brand href="/" aria-label="Capto home">
          <CaptoMark />
          Capto
        </Brand>
        <Nav aria-label="Main">
          <FeaturesLink href="/#how-it-works">How it works</FeaturesLink>
          <NavLink href="/docs" $active={is("/docs")} aria-current={is("/docs") ? "page" : undefined}>
            Docs
          </NavLink>
          <GithubLink href={siteConfig.github} target="_blank" rel="noopener noreferrer" aria-label="Capto on GitHub">
            <IconGithub />
          </GithubLink>
          <BuildCta as={Link} href="/docs/build" $size="sm">
            Build from source
          </BuildCta>
        </Nav>
      </Inner>
    </Bar>
  );
}
