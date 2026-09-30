/** v1.4 — pedido pronto para colar no Claude (o conector precisa estar ligado na conta do corretor). */
export function buildClaudePrompt(study: { id: string; title: string; targetSamples: number }, rules: string | null | undefined): string {
  const lines = [
    `Use o conector "Corretor Paulo Pop" para pesquisar amostras do estudo de mercado "${study.title}" (estudo_id: ${study.id}).`,
    '',
    'Siga esta ordem:',
    '1. ler_estudo — veja o imóvel avaliando, os filtros e as amostras que já existem (inclusive as recusadas).',
    '2. buscar_no_site — a busca sempre começa pelo corretorpaulopop.com.',
    '3. proxima_quadra — pesquise a quadra indicada nos portais da vez (WImóveis, DF Imóveis e OLX primeiro).',
    '4. Abra cada anúncio que servir, leia preço, área privativa, quartos, vagas, andar e data, e chame registrar_candidatas com o link e o trecho do anúncio.',
    '5. registrar_busca para cada portal pesquisado (mesmo quando nada serviu).',
    '6. proxima_quadra com concluir_atual=true e repita até ela responder concluido=true.',
    '',
    `Meta: ${study.targetSamples} amostras. Não estime nenhum dado: o que o anúncio não mostrar fica vazio. Não aprove, não publique e não apague nada — eu confiro as candidatas no painel.`,
  ]
  if (rules) lines.push('', `Minhas regras para esta pesquisa: ${rules}`)
  lines.push('', 'No final, me diga quantas candidatas registrou, de quais quadras, e o que não encontrou.')
  return lines.join('\n')
}
