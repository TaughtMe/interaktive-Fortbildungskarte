// UI API mode is optional. Mock/service data remains the default; a real
// database belongs behind service/repository/API boundaries in a later step.
export function isApiModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_USE_API === 'true';
}
