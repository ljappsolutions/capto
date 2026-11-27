// Colors are CSS custom properties (defined in app/globals.css) so the site can
// switch between dark (default) and light with prefers-color-scheme, no JS.
export const theme = {
  colors: {
    bg: "var(--c-bg)",
    bgAlt: "var(--c-bg-alt)",
    surface: "var(--c-surface)",
    surfaceRaised: "var(--c-surface-raised)",
    ink: "var(--c-ink)",
    muted: "var(--c-muted)",
    line: "var(--c-line)",
    lineStrong: "var(--c-line-strong)",
    accent: "var(--c-accent)",
    accentHover: "var(--c-accent-hover)",
    accentInk: "var(--c-accent-ink)",
    accentSoft: "var(--c-accent-soft)",
    mint: "var(--c-mint)",
    mintSoft: "var(--c-mint-soft)",
    danger: "var(--c-danger)",
    warn: "var(--c-warn)",
  },
  fonts: {
    display: "var(--font-display), ui-sans-serif, system-ui, sans-serif",
    body: "var(--font-body), ui-sans-serif, system-ui, sans-serif",
    mono: "var(--font-mono), ui-monospace, SFMono-Regular, Menlo, monospace",
  },
  radii: {
    sm: "8px",
    md: "12px",
    lg: "20px",
    pill: "999px",
  },
  shadows: {
    soft: "var(--shadow-soft)",
    lift: "var(--shadow-lift)",
  },
  space: {
    section: "clamp(4rem, 9vw, 7.5rem)",
  },
  breakpoints: {
    sm: "560px",
    md: "768px",
    lg: "1024px",
  },
} as const;

export type AppTheme = typeof theme;

declare module "styled-components" {
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  export interface DefaultTheme extends AppTheme {}
}
