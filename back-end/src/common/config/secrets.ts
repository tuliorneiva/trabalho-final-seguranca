export function requireSecret(name: string, testFallback: string): string {
  const value = process.env[name]
  if (value) return value
  if (process.env.NODE_ENV === 'test') return testFallback
  throw new Error(`${name} não está definida. Configure-a no arquivo .env.`)
}
