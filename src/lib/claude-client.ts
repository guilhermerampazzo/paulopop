/**
 * Cliente Claude API para corretorpaulopop.com
 * Funções centralizadas para comunicação com Claude
 */

import Anthropic from '@anthropic-ai/sdk'

// Instância única do cliente (singleton)
let claudeClient: Anthropic | null = null

export function getClaudeClient(): Anthropic {
  if (!claudeClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY não configurada em .env.local')
    }

    claudeClient = new Anthropic({
      apiKey,
    })
  }

  return claudeClient
}

export interface ClaudeCallOptions {
  maxTokens?: number
  temperature?: number
}

/**
 * Chamada padrão para Claude
 * @param userMessage Mensagem do usuário
 * @param systemPrompt Instruções do sistema
 * @param options Opções adicionais
 * @returns Texto da resposta
 */
export async function callClaude(
  userMessage: string,
  systemPrompt: string,
  options: ClaudeCallOptions = {}
): Promise<string> {
  const client = getClaudeClient()

  const {
    maxTokens = parseInt(process.env.CLAUDE_MAX_TOKENS || '4096'),
    temperature = 0.7,
  } = options

  try {
    const message = await client.messages.create({
      model: process.env.CLAUDE_MODEL || 'claude-3-5-sonnet-20241022',
      max_tokens: maxTokens,
      system: systemPrompt,
      temperature,
      messages: [
        {
          role: 'user',
          content: userMessage,
        },
      ],
    })

    // Extrair texto da resposta
    const textContent = message.content.find((block) => block.type === 'text')
    if (!textContent || textContent.type !== 'text') {
      throw new Error('Resposta do Claude sem conteúdo de texto')
    }

    return textContent.text
  } catch (error) {
    // Re-throw com contexto melhorado
    if (error instanceof Anthropic.APIError) {
      throw new Error(`Claude API Error: ${error.message} (Status: ${error.status})`)
    }
    throw error
  }
}

/**
 * Extrai JSON de uma string de resposta do Claude
 * @param response Resposta em texto
 * @returns Objeto JSON parseado
 */
export function extractJSON<T = Record<string, unknown>>(response: string): T {
  try {
    // Tenta encontrar um objeto JSON válido na resposta
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('Nenhum JSON encontrado na resposta')
    }

    return JSON.parse(jsonMatch[0]) as T
  } catch (error) {
    throw new Error(
      `Erro ao fazer parse da resposta Claude: ${error instanceof Error ? error.message : 'desconhecido'}`
    )
  }
}

/**
 * Log de uso de tokens (para monitoramento)
 */
export interface TokenUsage {
  inputTokens: number
  outputTokens: number
  totalTokens: number
  estimatedCost: number
}

export function estimateTokenCost(
  inputTokens: number,
  outputTokens: number
): TokenUsage {
  // Preços do Claude 3.5 Sonnet (em dólares por 1M tokens)
  const INPUT_PRICE = 3 // $3 por 1M input tokens
  const OUTPUT_PRICE = 15 // $15 por 1M output tokens

  const inputCost = (inputTokens / 1_000_000) * INPUT_PRICE
  const outputCost = (outputTokens / 1_000_000) * OUTPUT_PRICE

  return {
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    estimatedCost: inputCost + outputCost,
  }
}
