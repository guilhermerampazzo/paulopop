/**
 * v1.3 — Gera os ícones do PWA (public/icons/icon-192.png, icon-512.png e maskable-512.png)
 * com sharp: fundo azul-marinho #1e3a8a e as iniciais "PP" em branco.
 * Uso: npx tsx scripts/gen-pwa-icons.ts  (ou node --loader … / ts-node)
 */
import sharp from 'sharp'
import { mkdirSync } from 'fs'
import { join } from 'path'

const OUT = join(process.cwd(), 'public', 'icons')

function svg(size: number, padding = 0): string {
  const font = Math.round(size * 0.42)
  const r = Math.round(size * 0.18)
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <rect width="${size}" height="${size}" rx="${padding ? 0 : r}" fill="#1e3a8a"/>
  <rect x="${size * 0.08}" y="${size * 0.08}" width="${size * 0.84}" height="${size * 0.84}" rx="${r}" fill="#172554" opacity="0.35"/>
  <text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle" font-family="Inter, Arial, Helvetica, sans-serif" font-weight="800" font-size="${font}" fill="#ffffff" letter-spacing="-${Math.round(font * 0.04)}">PP</text>
  <rect x="${size * 0.3}" y="${size * 0.78}" width="${size * 0.4}" height="${Math.max(4, size * 0.03)}" rx="${size * 0.015}" fill="#ea580c"/>
</svg>`
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  for (const size of [192, 512]) {
    await sharp(Buffer.from(svg(size))).png().toFile(join(OUT, `icon-${size}.png`))
  }
  // maskable: sem cantos arredondados (a plataforma aplica a máscara)
  await sharp(Buffer.from(svg(512, 1))).png().toFile(join(OUT, 'maskable-512.png'))
  await sharp(Buffer.from(svg(180))).png().toFile(join(OUT, 'apple-touch-icon.png'))
  console.log('Ícones gerados em', OUT)
}

main().catch(e => { console.error(e); process.exit(1) })
