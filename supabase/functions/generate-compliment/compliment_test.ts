import { assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts'

import { buildPrompt, fallbackCompliment, hashSafetyIdentifier, normalizeCompliment, parseResponseText } from './compliment.ts'

Deno.test('builds a bounded, focused compliment prompt', () => {
  const prompt = buildPrompt('  I took a real lunch break.  ')
  assertStringIncludes(prompt, 'I took a real lunch break.')
  assertStringIncludes(prompt, 'private daily-life highlight')
})

Deno.test('uses a deterministic fallback', () => {
  assertEquals(
    fallbackCompliment('Drank water'),
    '“Drank water” counts. You noticed what helped, and that kind of attention builds a life you can feel.',
  )
})

Deno.test('extracts Responses API output text', () => {
  assertEquals(parseResponseText({ output_text: '“You showed up.”' }), 'You showed up.')
  assertEquals(parseResponseText({ output: [{ content: [{ type: 'output_text', text: 'You showed up.' }] }] }), 'You showed up.')
  assertEquals(parseResponseText({ output: [{ content: [{ type: 'reasoning', text: 'hidden' }] }] }), null)
})

Deno.test('rejects empty or oversized model responses', () => {
  assertEquals(normalizeCompliment(''), null)
  assertEquals(normalizeCompliment('x'.repeat(501)), null)
})

Deno.test('hashes user identifiers without exposing them', async () => {
  const hash = await hashSafetyIdentifier('user-1')
  assertEquals(hash.length, 64)
  assertEquals(hash, await hashSafetyIdentifier('user-1'))
})
