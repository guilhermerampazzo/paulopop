/**
 * v1.1 — Renderiza o texto simples das páginas legais gravado no painel.
 * Linhas começando com "## " viram títulos; linhas em branco separam parágrafos; "- " vira lista.
 */
export function LegalText({ text }: { text: string }) {
  const blocks = text.replace(/\r/g, '').split(/\n{2,}/)
  return (
    <div className="prose-legal space-y-4 text-gray-700 leading-relaxed">
      {blocks.map((block, i) => {
        const lines = block.split('\n').filter(l => l.trim())
        if (!lines.length) return null
        if (lines.length === 1 && lines[0].startsWith('## ')) {
          return <h2 key={i} className="text-xl font-bold text-[#1e3a8a] mt-8">{lines[0].slice(3)}</h2>
        }
        if (lines.every(l => l.trim().startsWith('- '))) {
          return (
            <ul key={i} className="list-disc pl-6 space-y-1">
              {lines.map((l, j) => <li key={j}>{l.trim().slice(2)}</li>)}
            </ul>
          )
        }
        return <p key={i}>{lines.join(' ')}</p>
      })}
    </div>
  )
}
