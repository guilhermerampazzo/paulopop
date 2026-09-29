/**
 * v1.3 — helper de YouTube sem dependências de servidor (pode ser importado em client components).
 */

/** Converte URLs do YouTube (watch, youtu.be, shorts, embed, live) para /embed/. */
export function youtubeEmbedUrl(url: string): string | null {
  const u = String(url ?? '').trim()
  if (!u) return null
  const m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/)
  if (!m) return null
  return `https://www.youtube.com/embed/${m[1]}`
}

/** Shorts/Reels → vídeo vertical (9:16). */
export function isVerticalVideoUrl(url: string): boolean {
  return /shorts\/|\/reel(s)?\/|tiktok\.com/i.test(String(url ?? ''))
}
