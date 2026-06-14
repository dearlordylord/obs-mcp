interface DiagnosticStream {
  write(message: string): unknown
}

interface DiagnosticStreams {
  readonly stderr: DiagnosticStream
  readonly stdout: DiagnosticStream
}

export const reportStdioStartupFailure = (
  error: unknown,
  streams: DiagnosticStreams,
  exit: (code: number) => unknown
): void => {
  const message = error instanceof Error ? error.message : String(error)
  streams.stderr.write(`obs-mcp failed: ${message}\n`)
  exit(1)
}
