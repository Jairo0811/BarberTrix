export function getErrorMessage(exception: unknown, fallback: string) {
  return exception instanceof Error ? exception.message : fallback
}
