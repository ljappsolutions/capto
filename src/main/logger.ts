type LogLevel = 'debug' | 'info' | 'warn' | 'error'

function stamp(): string {
  return new Date().toISOString()
}

function write(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
  const payload = meta ? ` ${JSON.stringify(meta)}` : ''
  const line = `[${stamp()}] [${level.toUpperCase()}] ${message}${payload}`
  if (level === 'error') {
    console.error(line)
  } else if (level === 'warn') {
    console.warn(line)
  } else {
    console.log(line)
  }
}

export const log = {
  debug: (message: string, meta?: Record<string, unknown>): void => write('debug', message, meta),
  info: (message: string, meta?: Record<string, unknown>): void => write('info', message, meta),
  warn: (message: string, meta?: Record<string, unknown>): void => write('warn', message, meta),
  error: (message: string, meta?: Record<string, unknown>): void => write('error', message, meta)
}
