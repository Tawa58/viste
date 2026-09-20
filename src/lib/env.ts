/** Firebase-only env helper (works under Next.js). */
export function readPublicEnv(name: string, fallback = ''): string {
  if (typeof process !== 'undefined') {
    const fromProcess =
      process.env[`NEXT_PUBLIC_${name}`] ?? process.env[`VITE_${name}`]
    if (fromProcess) return fromProcess
  }
  return fallback
}
