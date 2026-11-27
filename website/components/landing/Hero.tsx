"use client";

import Link from "next/link";
import styled, { keyframes } from "styled-components";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { IconGithub, IconLink, IconClock, IconArrowRight } from "@/components/ui/icons";
import { siteConfig } from "@/lib/site";

const Wrap = styled.section`
  position: relative;
  padding: clamp(3.5rem, 9vw, 6.5rem) 0 clamp(3.5rem, 8vw, 6rem);
  overflow: hidden;

  &::before {
    content: "";
    position: absolute;
    inset: 0;
    background: var(--glow);
    pointer-events: none;
  }
`;

const Grid = styled(Container)`
  position: relative;
  display: grid;
  gap: clamp(2.5rem, 6vw, 4rem);
  align-items: center;

  @media (min-width: ${({ theme }) => theme.breakpoints.lg}) {
    grid-template-columns: 1fr 1.05fr;
  }
`;

const Pill = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  margin: 0 0 1.4rem;
  padding: 0.35rem 0.8rem 0.35rem 0.5rem;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme }) => theme.colors.line};
  background: ${({ theme }) => theme.colors.surface};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.8rem;
  color: ${({ theme }) => theme.colors.muted};
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.55; transform: scale(0.85); }
`;

const RecDot = styled.span`
  width: 9px;
  height: 9px;
  border-radius: 50%;
  background: ${({ theme }) => theme.colors.accent};
  box-shadow: 0 0 0 4px ${({ theme }) => theme.colors.accentSoft};
  animation: ${pulse} 1.8s ease-in-out infinite;
`;

const Title = styled.h1`
  margin: 0;
  font-family: ${({ theme }) => theme.fonts.display};
  font-size: clamp(2.3rem, 6vw, 3.9rem);
  line-height: 1.05;
  letter-spacing: -0.04em;
  font-weight: 750;
  text-wrap: balance;

  em {
    font-style: normal;
    color: ${({ theme }) => theme.colors.accent};
  }
`;

const Lead = styled.p`
  margin: 1.4rem 0 0;
  max-width: 56ch;
  font-size: clamp(1.05rem, 2vw, 1.15rem);
  color: ${({ theme }) => theme.colors.muted};
  text-wrap: pretty;
`;

const Actions = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-top: 2rem;
`;

const Meta = styled.ul`
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  margin: 1.4rem 0 0;
  padding: 0;
  list-style: none;

  li {
    padding: 0.2rem 0.6rem;
    border-radius: ${({ theme }) => theme.radii.pill};
    border: 1px solid ${({ theme }) => theme.colors.line};
    font-family: ${({ theme }) => theme.fonts.mono};
    font-size: 0.75rem;
    color: ${({ theme }) => theme.colors.muted};
  }
`;

/* ---- Visual: a terminal building Capto, with the link it produces ---- */

const Stage = styled.div`
  position: relative;
  padding-bottom: 5.5rem;
  min-width: 0;
`;

const Terminal = styled.div`
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.lineStrong};
  background: #0d0f14;
  box-shadow: ${({ theme }) => theme.shadows.lift};
  overflow: hidden;
  color: #d6dae4;
`;

const Chrome = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0.7rem 0.9rem;
  border-bottom: 1px solid #1f2430;

  span {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: #2c3242;
  }

  b {
    margin-left: auto;
    margin-right: auto;
    padding-right: 36px;
    font-family: ${({ theme }) => theme.fonts.mono};
    font-size: 0.72rem;
    font-weight: 500;
    color: #7c8598;
  }
`;

const Code = styled.pre`
  margin: 0;
  padding: 1.1rem 1.2rem 1.4rem;
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: clamp(0.72rem, 1.6vw, 0.82rem);
  line-height: 1.75;
  white-space: pre-wrap;
  word-break: break-all;

  .p {
    color: #ff865f;
    user-select: none;
  }
  .c {
    color: #5eead4;
  }
  .m {
    color: #7c8598;
  }
`;

const ShareCard = styled.div`
  position: absolute;
  right: -0.25rem;
  bottom: 0;
  width: min(340px, 90%);
  padding: 0.9rem 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.lineStrong};
  background: ${({ theme }) => theme.colors.surfaceRaised};
  box-shadow: ${({ theme }) => theme.shadows.lift};
  font-size: 0.85rem;

  @media (min-width: ${({ theme }) => theme.breakpoints.md}) {
    right: -1.25rem;
  }
`;

const ShareRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: ${({ theme }) => theme.colors.ink};
  font-weight: 600;

  svg {
    color: ${({ theme }) => theme.colors.accent};
  }
`;

const ShareUrl = styled.code`
  display: block;
  margin: 0.5rem 0;
  padding: 0.45rem 0.6rem;
  border-radius: ${({ theme }) => theme.radii.sm};
  background: ${({ theme }) => theme.colors.bgAlt};
  border: 1px solid ${({ theme }) => theme.colors.line};
  font-family: ${({ theme }) => theme.fonts.mono};
  font-size: 0.72rem;
  color: ${({ theme }) => theme.colors.muted};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ShareMeta = styled.p`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin: 0;
  font-size: 0.78rem;
  color: ${({ theme }) => theme.colors.muted};
`;

export function Hero() {
  const repo = siteConfig.cloneUrl.replace("https://", "");
  return (
    <Wrap>
      <Grid>
        <div>
          <Pill>
            <RecDot /> open source · MIT · macOS
          </Pill>
          <Title>
            A screen recorder you <em>build, own and host.</em>
          </Title>
          <Lead>
            Capto is a macOS screen recorder written in TypeScript on Electron. It records your screen, camera and
            audio locally, uploads to a bucket you control, and signs expiring links for whoever needs to watch. There
            is no service and no account: clone it, build it, change it.
          </Lead>
          <Actions>
            <Button as={Link} href="/docs/build" $size="lg">
              Build from source <IconArrowRight size={18} />
            </Button>
            <Button href={siteConfig.github} target="_blank" rel="noopener noreferrer" $variant="secondary" $size="lg">
              <IconGithub /> Browse the code
            </Button>
          </Actions>
          <Meta aria-label="Stack">
            <li>Electron 36</li>
            <li>React 19</li>
            <li>TypeScript</li>
            <li>ffmpeg</li>
            <li>S3 · R2 · Azure · GCS</li>
          </Meta>
        </div>

        <Stage aria-hidden>
          <Terminal>
            <Chrome>
              <span />
              <span />
              <span />
              <b>~/src</b>
            </Chrome>
            <Code>
              <span className="p">$ </span>git clone {repo}
              {"\n"}
              <span className="p">$ </span>cd capto && yarn install
              {"\n"}
              <span className="p">$ </span>yarn dev
              {"\n"}
              <span className="c">✓</span> <span className="m">main process built · out/main/index.js</span>
              {"\n"}
              <span className="c">✓</span> <span className="m">renderer dev server · localhost:5173</span>
              {"\n"}
              <span className="c">●</span> <span className="m">starting electron app…</span>
              {"\n\n"}
              <span className="p">$ </span>yarn package:dir
              {"\n"}
              <span className="c">✓</span> <span className="m">release/mac-arm64/Capto.app</span>
            </Code>
          </Terminal>
          <ShareCard>
            <ShareRow>
              <IconLink size={16} /> Link copied
            </ShareRow>
            <ShareUrl>capto.ljappsolutions.com/v#eyJ2IjoxLCJ1IjoiaHR0cHM6Ly95b3VyLWJ1Y2tldC5zMy5hbWF6b25hd3MuY29t</ShareUrl>
            <ShareMeta>
              <IconClock size={14} /> signed by your-bucket · expires in 7 days
            </ShareMeta>
          </ShareCard>
        </Stage>
      </Grid>
    </Wrap>
  );
}
