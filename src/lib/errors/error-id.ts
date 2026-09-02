export function createErrorId(): string {
  const timestamp = Date.now().toString(36)
  const random = crypto.randomUUID().replace(/-/g, '').slice(0, 12)

  return `err_${timestamp}_${random}`
}
