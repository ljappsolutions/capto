import { startApp } from './app'
import { log } from './logger'

void startApp().catch((error: unknown) => {
  log.error('Failed to start Capto', {
    error: error instanceof Error ? error.message : String(error)
  })
  process.exit(1)
})
