// Supabase Edge Function: bendbot-ai
// The Gemini key is read only from the private GEMINI_API_KEY secret.

const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://braylonlarish.github.io',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (request.method !== 'POST') return new Response(JSON.stringify({ error: 'POST required' }), { status: 405, headers: corsHeaders })

  const authorization = request.headers.get('Authorization')
  const projectUrl = Deno.env.get('SUPABASE_URL')
  const keys = JSON.parse(Deno.env.get('SUPABASE_PUBLISHABLE_KEYS') || '{}')
  const publishableKey = keys.default || Deno.env.get('SUPABASE_ANON_KEY')
  if (!authorization || !projectUrl || !publishableKey) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

  const userCheck = await fetch(`${projectUrl}/auth/v1/user`, { headers: { Authorization: authorization, apikey: publishableKey } })
  if (!userCheck.ok) return new Response(JSON.stringify({ error: 'Sign in is required' }), { status: 401, headers: corsHeaders })

  const { message, context } = await request.json()
  if (typeof message !== 'string' || !message.trim()) return new Response(JSON.stringify({ error: 'A question is required' }), { status: 400, headers: corsHeaders })

  const prompt = `You are BendBot, a concise assistant for A+J Design LLC's Press Flow brake-press scheduling tool. Answer only from the scheduling snapshot below. Do not invent part data, due dates, or company policy. You may explain scheduling tradeoffs and suggest what a user should review, but never claim you made a change. Keep the answer under 130 words and use plain shop-floor language.\n\nSCHEDULING SNAPSHOT:\n${JSON.stringify(context)}\n\nEMPLOYEE QUESTION:\n${message}`
  const key = Deno.env.get('GEMINI_API_KEY')
  if (!key) return new Response(JSON.stringify({ error: 'Gemini test key is not configured' }), { status: 500, headers: corsHeaders })

  const gemini = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { temperature: 0.3, maxOutputTokens: 350 } }),
  })
  const result = await gemini.json()
  if (!gemini.ok) return new Response(JSON.stringify({ error: result.error?.message || 'Gemini request failed' }), { status: 502, headers: corsHeaders })
  const answer = result.candidates?.[0]?.content?.parts?.map((part: { text?: string }) => part.text || '').join('').trim()
  return new Response(JSON.stringify({ answer: answer || 'I could not form an answer from the current schedule.' }), { headers: corsHeaders })
})
