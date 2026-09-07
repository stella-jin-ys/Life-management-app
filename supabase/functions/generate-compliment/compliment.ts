export const MAX_HIGHLIGHT_LENGTH = 500

export function fallbackCompliment(content: string) {
  return `“${content}” counts. You noticed what helped, and that kind of attention builds a life you can feel.`
}

export function normalizeCompliment(value: unknown) {
  if (typeof value !== 'string') return null
  const normalized = value.trim().replace(/^['“”"]+|['“”"]+$/g, '').trim()
  return normalized.length >= 1 && normalized.length <= MAX_HIGHLIGHT_LENGTH ? normalized : null
}

export function buildPrompt(content: string) {
  return [
    'Write one warm, specific compliment for a private daily-life highlight.',
    'Use 1–2 sentences, plain language, and no emojis or therapy claims.',
    'Celebrate the person’s effort without exaggerating or assuming how they feel.',
    `Highlight: ${content.trim().slice(0, MAX_HIGHLIGHT_LENGTH)}`,
  ].join('\n')
}

export function parseResponseText(payload: { output_text?: string; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> }) {
  const direct = normalizeCompliment(payload.output_text)
  if (direct) return direct
  return payload.output?.flatMap((item) => item.content || [])
    .filter((part) => part.type === 'output_text' && part.text)
    .map((part) => normalizeCompliment(part.text))
    .find(Boolean) || null
}

export async function hashSafetyIdentifier(userId: string) {
  const bytes = new TextEncoder().encode(userId)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, '0')).join('')
}
