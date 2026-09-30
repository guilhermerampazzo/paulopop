import type { NextRequest } from 'next/server'

/**
 * v1.4 — lê o corpo JSON de uma requisição como objeto. Corpo ausente, inválido, grande demais ou que não
 * seja um objeto ({…}) vira {} — a rota responde com a validação normal em vez de erro 500.
 */
export async function readJsonObject(req: NextRequest | Request, maxChars = 1_500_000): Promise<Record<string, unknown>> {
  let raw: string
  try { raw = await req.text() } catch { return {} }
  if (!raw || raw.length > maxChars) return {}
  try {
    const v: unknown = JSON.parse(raw)
    return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {}
  } catch { return {} }
}
