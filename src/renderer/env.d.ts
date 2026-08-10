/// <reference types="vite/client" />

import type { RecorderAPI } from '../shared/ipc'

declare global {
  interface Window {
    recorderAPI: RecorderAPI
  }
}

export {}
