"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styled from "styled-components";
import { Container } from "@/components/ui/Container";
import { IconArrowRight } from "@/components/ui/icons";
import { docsFlat, docsNav } from "@/lib/docs";
import { siteConfig } from "@/lib/site";
import { Prose } from "./Prose";

const Layout = styled(Container)`
  display: grid;
  gap: 1.5rem;
  padding: 2rem 0 clamp(3rem, 8vw, 6rem);

  @media (min-width: 960px) {
    grid-template-columns: 240px minmax(0, 1fr);
    gap: 3.5rem;
    padding-top: 3rem;
  }
`;

const Sidebar = styled.nav`
  min-width: 0;

  @media (min-width: 960px) {
    position: sticky;
    top: 88px;
    align-self: start;
    max-height: calc(100vh - 110px);
    overflow-y: auto;
  }
`;

const MobileMenu = styled.details`
  border: 1px solid ${({ theme }) => theme.colors.line};
  border-radius: ${({ theme }) => theme.radii.md};
  background: ${({ theme }) => theme.colors.surface};

  summary {
    padding: 0.8rem 1rem;
    font-weight: 600;
    cursor: pointer;
  }

  > div {
    padding: 0 1rem 1rem;
  }

  @media (min-width: 960px) {
    display: none;
  }
`;

const DesktopMenu = styled.div`
  display: none;

  @media (min-width: 960px) {
    display: block;
  }
`;

const Group = styled.div`
  & + & {
    margin-top: 1.4rem;
  }

  h2 {
    margin: 0 0 0.5rem;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.09em;
    color: ${({ theme }) => theme.colors.muted};
    font-weight: 600;
  }

  ul {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
`;

const NavItem = styled(Link)<{ $active: boolean }>`
  display: block;
  padding: 0.4rem 0.7rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  font-size: 0.93rem;
  text-decoration: none;
  color: ${({ theme, $active }) => ($active ? theme.colors.ink : theme.colors.muted)};
  background: ${({ theme, $active }) => ($active ? theme.colors.surface : "transparent")};
  box-shadow: ${({ theme, $active }) => ($active ? `inset 2px 0 0 ${theme.colors.accent}` : "none")};
  font-weight: ${({ $active }) => ($active ? 600 : 400)};

  &:hover {
    color: ${({ theme }) => theme.colors.ink};
  }
`;

const Pager = styled.nav`
  display: grid;
  gap: 0.75rem;
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid ${({ theme }) => theme.colors.line};

  @media (min-width: ${({ theme }) => theme.breakpoints.sm}) {
    grid-template-columns: 1fr 1fr;
  }

  a {
    display: block;
    padding: 0.9rem 1rem;
    border: 1px solid ${({ theme }) => theme.colors.line};
    border-radius: ${({ theme }) => theme.radii.md};
    text-decoration: none;

    &:hover {
      border-color: ${({ theme }) => theme.colors.lineStrong};
    }

    small {
      display: block;
      color: ${({ theme }) => theme.colors.muted};
      font-size: 0.8rem;
    }

    span {
      font-weight: 600;
    }
  }

  a[data-dir="next"] {
    text-align: right;
    grid-column: 2;

    @media (max-width: 559px) {
      grid-column: auto;
    }
  }
`;

const EditLink = styled.a`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 1.5rem;
  font-size: 0.88rem;
  color: ${({ theme }) => theme.colors.muted};

  &:hover {
    color: ${({ theme }) => theme.colors.ink};
  }
`;

function NavLinks({ pathname }: { pathname: string }) {
  return (
    <>
      {docsNav.map((group) => (
        <Group key={group.title}>
          <h2>{group.title}</h2>
          <ul>
            {group.links.map((link) => {
              const active = pathname === link.href;
              return (
                <li key={link.href}>
                  <NavItem href={link.href} $active={active} aria-current={active ? "page" : undefined}>
                    {link.title}
                  </NavItem>
                </li>
              );
            })}
          </ul>
        </Group>
      ))}
    </>
  );
}

export function DocsShell({ children }: { children: React.ReactNode }) {
  const pathname = (usePathname() || "/docs").replace(/\/+$/, "") || "/docs";
  const index = docsFlat.findIndex((l) => l.href === pathname);
  const prev = index > 0 ? docsFlat[index - 1] : null;
  const next = index >= 0 && index < docsFlat.length - 1 ? docsFlat[index + 1] : null;
  const current = index >= 0 ? docsFlat[index] : null;
  const slug = pathname === "/docs" ? "" : pathname.replace("/docs/", "");
  const editHref = `${siteConfig.github}/edit/main/website/app/(site)/docs/${slug ? `${slug}/` : ""}page.mdx`;

  return (
    <Layout>
      <Sidebar aria-label="Documentation">
        <MobileMenu>
          <summary>{current ? `Docs: ${current.title}` : "Docs menu"}</summary>
          <div>
            <NavLinks pathname={pathname} />
          </div>
        </MobileMenu>
        <DesktopMenu>
          <NavLinks pathname={pathname} />
        </DesktopMenu>
      </Sidebar>
      <div style={{ minWidth: 0 }}>
        <Prose>{children}</Prose>
        <EditLink href={editHref} target="_blank" rel="noopener noreferrer">
          Edit this page on GitHub <IconArrowRight size={14} />
        </EditLink>
        {prev || next ? (
          <Pager aria-label="Docs pagination">
            {prev ? (
              <Link href={prev.href} data-dir="prev">
                <small>Previous</small>
                <span>{prev.title}</span>
              </Link>
            ) : null}
            {next ? (
              <Link href={next.href} data-dir="next">
                <small>Next</small>
                <span>{next.title}</span>
              </Link>
            ) : null}
          </Pager>
        ) : null}
      </div>
    </Layout>
  );
}
