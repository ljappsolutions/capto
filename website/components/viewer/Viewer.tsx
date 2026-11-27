"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import styled, { css } from "styled-components";
import { decodeSharePayload, type SharePayload } from "@/lib/shareLink";
import { CaptoMark } from "@/components/ui/Logo";
import { IconAlert, IconClock, IconDownload } from "@/components/ui/icons";
import { Button } from "@/components/ui/Button";
import { downloadName, formatAbsolute, formatDuration, formatTimeUntil } from "./format";

/*
 * Share viewer. The payload lives in the URL fragment (`/v#<base64url JSON>`),
 * which browsers never send to the server. This component only reads it in the
 * browser and never transmits it anywhere: the video, poster and captions load
 * straight from the sharer's own bucket.
 */

function subscribeHash(onChange: () => void) {
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}
const getHash = () => window.location.hash;
const getServerHash = () => null;

const SPEEDS = [1, 1.25, 1.5, 2] as const;

/* ---------------------------------------------------------------- styles */

const Page = styled.div`
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background:
    radial-gradient(70% 40% at 50% 0%, ${({ theme }) => theme.colors.accentSoft}, transparent 70%),
    ${({ theme }) => theme.colors.bg};
`;

const Top = styled.header`
  width: min(1100px, calc(100% - 2rem));
  margin: 0 auto;
  height: 60px;
  display: flex;
  align-items: center;

  a {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    text-decoration: none;
    color: ${({ theme }) => theme.colors.ink};
  }
`;

const Main = styled.main`
  flex: 1;
  width: min(1100px, calc(100% - 2rem));
  margin: 0 auto;
  padding: 0.5rem 0 2.5rem;
`;

const Title = styled.h1`
  margin: 0 0 0.6rem;
  font-size: clamp(1.4rem, 3.5vw, 2rem);
  line-height: 1.2;
  letter-spacing: -0.025em;
  overflow-wrap: anywhere;
`;

const MetaRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.9rem;
  margin-bottom: 1.1rem;
  font-size: 0.92rem;
  color: ${({ theme }) => theme.colors.muted};
`;

const Badge = styled.span<{ $tone?: "danger" | "neutral" }>`
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.2rem 0.6rem;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme }) => theme.colors.line};
  background: ${({ theme }) => theme.colors.surface};

  ${({ $tone, theme }) =>
    $tone === "danger" &&
    css`
      color: ${theme.colors.danger};
      border-color: color-mix(in srgb, ${theme.colors.danger} 40%, transparent);
    `}
`;

const Frame = styled.div`
  position: relative;
  border-radius: ${({ theme }) => theme.radii.lg};
  overflow: hidden;
  background: #000;
  border: 1px solid ${({ theme }) => theme.colors.line};
  box-shadow: ${({ theme }) => theme.shadows.lift};

  video {
    display: block;
    width: 100%;
    max-height: 78vh;
    min-height: 180px;
    background: #000;
  }

  @media (max-width: 559px) {
    border-radius: ${({ theme }) => theme.radii.md};
  }
`;

const Controls = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 1rem;
`;

const SpeedGroup = styled.div`
  display: inline-flex;
  padding: 3px;
  border-radius: ${({ theme }) => theme.radii.pill};
  border: 1px solid ${({ theme }) => theme.colors.line};
  background: ${({ theme }) => theme.colors.surface};
`;

const SpeedButton = styled.button<{ $active: boolean }>`
  min-width: 3.1rem;
  min-height: 36px;
  padding: 0.35rem 0.7rem;
  border: none;
  border-radius: ${({ theme }) => theme.radii.pill};
  font: inherit;
  font-size: 0.88rem;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  color: ${({ theme, $active }) => ($active ? theme.colors.accentInk : theme.colors.muted)};
  background: ${({ theme, $active }) => ($active ? theme.colors.accent : "transparent")};

  &:hover {
    color: ${({ theme, $active }) => ($active ? theme.colors.accentInk : theme.colors.ink)};
  }
`;

const Notice = styled.div<{ $tone?: "danger" | "warn" }>`
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  margin-top: 1rem;
  padding: 0.8rem 1rem;
  border-radius: ${({ theme }) => theme.radii.md};
  border: 1px solid ${({ theme }) => theme.colors.line};
  background: ${({ theme }) => theme.colors.surface};
  font-size: 0.95rem;

  svg {
    flex-shrink: 0;
    margin-top: 2px;
    color: ${({ theme, $tone }) => ($tone === "danger" ? theme.colors.danger : theme.colors.warn)};
  }

  p {
    margin: 0;
  }
`;

const Empty = styled.div`
  max-width: 560px;
  margin: clamp(2rem, 10vh, 6rem) auto 0;
  padding: clamp(1.5rem, 4vw, 2.5rem);
  border-radius: ${({ theme }) => theme.radii.lg};
  border: 1px solid ${({ theme }) => theme.colors.line};
  background: ${({ theme }) => theme.colors.surface};
  text-align: center;

  svg {
    color: ${({ theme }) => theme.colors.warn};
  }

  h1 {
    margin: 0.75rem 0 0.5rem;
    font-size: 1.4rem;
    letter-spacing: -0.02em;
  }

  p {
    margin: 0.5rem 0 0;
    color: ${({ theme }) => theme.colors.muted};
  }
`;

const Skeleton = styled.div`
  aspect-ratio: 16 / 9;
  border-radius: ${({ theme }) => theme.radii.lg};
  background: ${({ theme }) => theme.colors.surface};
  border: 1px solid ${({ theme }) => theme.colors.line};
`;

const Foot = styled.footer`
  padding: 1.5rem 1rem 2rem;
  text-align: center;
  font-size: 0.88rem;
  color: ${({ theme }) => theme.colors.muted};

  a {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    color: inherit;
    text-decoration: none;

    &:hover {
      color: ${({ theme }) => theme.colors.ink};
    }
  }
`;

/* ------------------------------------------------------------ components */

function useNow(intervalMs: number) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return now;
}

/**
 * Cross-origin <track> files need CORS plus a crossorigin attribute on the
 * <video>, which would also force CORS on the video itself. Instead, fetch the
 * VTT separately (CORS) and hand the <track> a same-origin blob URL. If the
 * bucket has no CORS rule, captions are skipped and the video still plays.
 */
function useCaptionsBlobUrl(src: string | undefined) {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!src) return;
    let revoked = false;
    let created: string | null = null;
    const controller = new AbortController();
    fetch(src, { signal: controller.signal, credentials: "omit", referrerPolicy: "no-referrer" })
      .then((res) => (res.ok ? res.text() : Promise.reject(new Error(String(res.status)))))
      .then((text) => {
        if (revoked) return;
        created = URL.createObjectURL(new Blob([text], { type: "text/vtt" }));
        setBlobUrl(created);
      })
      .catch(() => {
        /* captions are optional */
      });
    return () => {
      revoked = true;
      controller.abort();
      if (created) URL.revokeObjectURL(created);
    };
  }, [src]);
  return src ? blobUrl : null;
}

function Player({ payload }: { payload: SharePayload }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [rate, setRate] = useState<number>(1);
  const [failed, setFailed] = useState(false);
  const [mediaDurationMs, setMediaDurationMs] = useState<number | null>(null);
  const now = useNow(30_000);
  const captionsUrl = useCaptionsBlobUrl(payload.c);

  const title = payload.t?.trim() || "Shared recording";
  const expiresAt = payload.e ? Date.parse(payload.e) : null;
  const expired = expiresAt !== null && expiresAt <= now;
  const durationMs = payload.d ?? mediaDurationMs;

  useEffect(() => {
    document.title = `${title} | Capto`;
  }, [title]);

  const applyRate = (value: number) => {
    setRate(value);
    if (videoRef.current) videoRef.current.playbackRate = value;
  };

  return (
    <>
      <Title>{title}</Title>
      <MetaRow>
        {durationMs !== null && durationMs > 0 ? (
          <span>
            <span className="visually-hidden">Duration: </span>
            {formatDuration(durationMs)}
          </span>
        ) : null}
        {expiresAt !== null ? (
          expired ? (
            <Badge $tone="danger" title={formatAbsolute(expiresAt)}>
              <IconClock size={14} /> This link has expired
            </Badge>
          ) : (
            <Badge title={formatAbsolute(expiresAt)}>
              <IconClock size={14} /> Link expires {formatTimeUntil(expiresAt, now)}
            </Badge>
          )
        ) : null}
      </MetaRow>

      <Frame>
        <video
          ref={videoRef}
          controls
          playsInline
          preload="metadata"
          poster={payload.p}
          src={payload.u}
          onLoadedMetadata={(e) => {
            const v = e.currentTarget;
            v.playbackRate = rate;
            if (Number.isFinite(v.duration) && v.duration > 0) setMediaDurationMs(v.duration * 1000);
          }}
          onError={() => setFailed(true)}
        >
          {captionsUrl ? <track kind="captions" src={captionsUrl} srcLang="en" label="Captions" default /> : null}
          Your browser can&apos;t play this video. Use the Download button instead.
        </video>
      </Frame>

      {failed ? (
        <Notice $tone="danger" role="alert">
          <IconAlert size={18} />
          <p>The video couldn&apos;t be loaded. The link may have expired or been deleted.</p>
        </Notice>
      ) : expired ? (
        <Notice $tone="warn" role="status">
          <IconAlert size={18} />
          <p>This link has passed its expiry time, so the video may not play. Ask the sender for a new link.</p>
        </Notice>
      ) : null}

      <Controls>
        <SpeedGroup role="group" aria-label="Playback speed">
          {SPEEDS.map((s) => (
            <SpeedButton key={s} type="button" $active={rate === s} aria-pressed={rate === s} onClick={() => applyRate(s)}>
              {s}x
            </SpeedButton>
          ))}
        </SpeedGroup>
        <Button
          href={payload.u}
          download={downloadName(payload.t)}
          target="_blank"
          rel="noopener noreferrer"
          $variant="secondary"
        >
          <IconDownload size={18} /> Download
        </Button>
      </Controls>
    </>
  );
}

export function Viewer() {
  const hash = useSyncExternalStore(subscribeHash, getHash, getServerHash);
  const payload = useMemo(() => (hash ? decodeSharePayload(hash) : null), [hash]);

  let content: React.ReactNode;
  if (hash === null) {
    content = <Skeleton aria-hidden />;
  } else if (!payload) {
    content = (
      <Empty role="alert">
        <IconAlert size={28} />
        <h1>{hash.replace(/^#/, "") ? "This share link isn't valid" : "No video in this link"}</h1>
        <p>
          The link may be incomplete. Some email and chat apps cut long links short, so ask the sender to copy it
          again, or open the full link in your browser.
        </p>
      </Empty>
    );
  } else {
    content = <Player key={hash} payload={payload} />;
  }

  return (
    <Page>
      <Top>
        <Link href="/" aria-label="Capto home">
          <CaptoMark size={24} /> Capto
        </Link>
      </Top>
      <Main id="main">{content}</Main>
      <Foot>
        <Link href="/">
          Recorded with <CaptoMark size={16} /> <strong>Capto</strong>, open-source screen recording
        </Link>
      </Foot>
    </Page>
  );
}
