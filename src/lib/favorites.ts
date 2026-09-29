/**
 * v1.3 — favoritos e comparação (até 3) guardados no localStorage do visitante.
 * Todas as leituras/gravações têm try/catch (modo privado, storage bloqueado, SSR).
 * Emite o evento `pp:favorites` / `pp:compare` na janela para sincronizar componentes.
 */

export const FAVORITES_KEY = 'pp:favorites'
export const COMPARE_KEY = 'pp:compare'
export const COMPARE_MAX = 3

function read(key: string): string[] {
  try {
    if (typeof window === 'undefined') return []
    const raw = window.localStorage.getItem(key)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list.filter((v): v is string => typeof v === 'string') : []
  } catch {
    return []
  }
}

function write(key: string, list: string[]) {
  try {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(key, JSON.stringify(list))
    window.dispatchEvent(new CustomEvent(key, { detail: list }))
  } catch {
    /* storage indisponível */
  }
}

export function getFavorites(): string[] { return read(FAVORITES_KEY) }
export function isFavorite(id: string): boolean { return getFavorites().includes(id) }
export function toggleFavorite(id: string): boolean {
  const list = getFavorites()
  const has = list.includes(id)
  write(FAVORITES_KEY, has ? list.filter(v => v !== id) : [...list, id].slice(-200))
  return !has
}

export function getCompare(): string[] { return read(COMPARE_KEY) }
export function isCompared(id: string): boolean { return getCompare().includes(id) }
/** Devolve { ok, list }: ok=false quando já há 3 imóveis na comparação. */
export function toggleCompare(id: string): { ok: boolean; active: boolean; list: string[] } {
  const list = getCompare()
  if (list.includes(id)) {
    const next = list.filter(v => v !== id)
    write(COMPARE_KEY, next)
    return { ok: true, active: false, list: next }
  }
  if (list.length >= COMPARE_MAX) return { ok: false, active: false, list }
  const next = [...list, id]
  write(COMPARE_KEY, next)
  return { ok: true, active: true, list: next }
}

/** Assina mudanças (mesma aba via CustomEvent; outras abas via `storage`). */
export function subscribe(key: string, cb: (list: string[]) => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const onCustom = () => cb(read(key))
  const onStorage = (e: StorageEvent) => { if (e.key === key) cb(read(key)) }
  window.addEventListener(key, onCustom)
  window.addEventListener('storage', onStorage)
  return () => { window.removeEventListener(key, onCustom); window.removeEventListener('storage', onStorage) }
}
