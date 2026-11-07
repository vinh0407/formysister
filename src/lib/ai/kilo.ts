/**
 * Kilo fallback provider (OpenAI-compatible chat completions).
 * Server-side only.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export async function kiloGenerate(
  messages: ChatMessage[],
  model?: string
): Promise<string> {
  const apiKey = process.env.KILO_API_KEY;
  if (!apiKey) throw new Error('Missing required env: KILO_API_KEY');

  const baseUrl = process.env.KILO_BASE_URL || 'https://api.kilo.ai/v1';
  const resolvedModel = model || process.env.KILO_MODEL || 'kilo-default';

  const url = `${baseUrl.replace(/\/$/, '')}/chat/completions`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: resolvedModel,
      messages,
      temperature: 0.7,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`Kilo AI error ${res.status}: ${text}`);
  }

  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== 'string' || !content.trim()) {
    throw new Error('Kilo AI returned empty response');
  }
  return content;
}
