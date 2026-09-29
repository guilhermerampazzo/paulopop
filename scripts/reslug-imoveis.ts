/**
 * v1.3 — Reaplica a regra de slug com bairro em todos os imóveis.
 * Uso: cd <raiz> && export $(cat .env | xargs) && npx tsx scripts/reslug-imoveis.ts [--dry] [--all]
 *   (ou, sem tsx: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/reslug-imoveis.ts)
 *   --dry  só mostra o que mudaria
 *   --all  força o slug novo mesmo quando o atual já contém o bairro (guarda o antigo em previousSlugs)
 * Slugs antigos vão para `previousSlugs` e a página do imóvel faz redirect 301.
 */
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { buildPropertySlug, proposePropertySlug } from '../src/lib/property-slug'

const connectionString = process.env.DATABASE_URL
if (!connectionString) throw new Error('DATABASE_URL não configurada')
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
const dry = process.argv.includes('--dry')
const all = process.argv.includes('--all')

async function main() {
  const rows = await prisma.property.findMany({
    select: { id: true, ref: true, slug: true, previousSlugs: true, propertyType: true, transactionType: true, neighborhood: true, city: true },
    orderBy: { createdAt: 'asc' },
  })
  const taken = new Set(rows.map(r => r.slug))
  let changed = 0
  for (const r of rows) {
    const input = { propertyType: r.propertyType, transactionType: r.transactionType, neighborhood: r.neighborhood, city: r.city, ref: r.ref }
    const base = all ? buildPropertySlug(input) : proposePropertySlug(r.slug, input)
    if (!base || base === r.slug) continue
    let next = base
    let n = 2
    while (taken.has(next)) next = `${base}-${n++}`
    taken.add(next)
    taken.delete(r.slug)
    const previousSlugs = Array.from(new Set([...(r.previousSlugs ?? []), r.slug])).filter(s => s !== next).slice(-20)
    console.log(`${dry ? '[dry] ' : ''}${r.ref}: ${r.slug} → ${next}`)
    if (!dry) await prisma.property.update({ where: { id: r.id }, data: { slug: next, previousSlugs } })
    changed++
  }
  console.log(`${changed} imóvel(is) ${dry ? 'mudaria(m)' : 'atualizado(s)'} de ${rows.length}.`)
}

main().catch(e => { console.error(e); process.exit(1) }).finally(() => prisma.$disconnect())
