// Wails rejects with an Error whose message is the Go error text.
export function errorMessage(e: unknown): string {
  return e instanceof Error ? e.message : String(e)
}
