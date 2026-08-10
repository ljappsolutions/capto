/** Shared quit flag so windows that normally hide-on-close can destroy during shutdown. */
let quitting = false

export function isAppQuitting(): boolean {
  return quitting
}

export function markAppQuitting(): void {
  quitting = true
}
