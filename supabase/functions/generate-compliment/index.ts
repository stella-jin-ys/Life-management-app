import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

import { buildPrompt, fallbackCompliment, hashSafetyIdentifier, parseResponseText } from './compliment.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authorization = request.headers.get('Authorization')
  const token = authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return json({ error: 'Missing authorization' }, 401)

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  )
  const { data: authData, error: authError } = await supabase.auth.getUser(token)
  if (authError || !authData.user) return json({ error: 'Invalid authorization' }, 401)

  let body: { highlight_id?: string }
  try { body = await request.json() } catch { return json({ error: 'Invalid JSON body' }, 400) }
  if (!body.highlight_id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.highlight_id)) {
    return json({ error: 'highlight_id must be a UUID' }, 400)
  }

  const { data: claimed, error: claimError } = await supabase.rpc('claim_compliment_generation', { p_highlight_id: body.highlight_id })
  if (claimError) return json({ error: 'Could not start compliment generation' }, 500)
  if (!claimed) return json({ error: 'Compliment generation is not available for this highlight' }, 409)

  const { data: highlight, error: highlightError } = await supabase
    .from('highlights').select('id, content').eq('id', body.highlight_id).eq('user_id', authData.user.id).single()
  if (highlightError || !highlight) return json({ error: 'Highlight not found' }, 404)

  const apiKey = Deno.env.get('OPENAI_API_KEY')
  const model = Deno.env.get('OPENAI_MODEL') ?? 'gpt-5.4-mini'
  let compliment = fallbackCompliment(highlight.content)
  let status = 'fallback'

  if (apiKey) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 12000)
      const response = await fetch('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          input: buildPrompt(highlight.content),
          instructions: 'Write one warm, specific compliment for a small daily win. Use at most two short sentences. Do not diagnose, give medical advice, exaggerate, or mention being an AI.',
          max_output_tokens: 100,
          store: false,
          safety_identifier: await hashSafetyIdentifier(authData.user.id),
        }),
        signal: controller.signal,
      })
      clearTimeout(timeout)
      if (response.ok) {
        const text = parseResponseText(await response.json())
        if (text) { compliment = text.slice(0, 500); status = 'complete' }
      }
    } catch { /* fallback is intentionally safe and deterministic */ }
  }

  const { data: finalized, error: updateError } = await supabase.rpc('finalize_compliment_generation', {
    p_highlight_id: highlight.id,
    p_compliment: compliment,
    p_status: status,
  })
  if (updateError || !finalized) return json({ error: 'Could not save compliment' }, 500)
  return json({ status, compliment })
})
