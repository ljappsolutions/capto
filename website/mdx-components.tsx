import type { MDXComponents } from "mdx/types";

// Docs styling is applied by the `Prose` wrapper in app/docs/layout.tsx.
export function useMDXComponents(components: MDXComponents): MDXComponents {
  return components;
}
