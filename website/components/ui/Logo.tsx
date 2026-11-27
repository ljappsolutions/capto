import type { SVGProps } from "react";

/** Capto mark: a screen frame with a camera bubble in the corner. */
export function CaptoMark({ size = 28, ...props }: SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden focusable={false} {...props}>
      <rect x="2.5" y="5" width="24" height="18" rx="4.5" fill="none" stroke="currentColor" strokeWidth="2.6" />
      <circle cx="23.5" cy="22.5" r="7" fill="var(--c-accent, #ff6a3d)" stroke="var(--c-bg, #0a0b0f)" strokeWidth="2.5" />
      <circle cx="23.5" cy="22.5" r="2.4" fill="var(--c-bg, #0a0b0f)" />
    </svg>
  );
}
