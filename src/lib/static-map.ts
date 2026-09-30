/**
 * v1.4 — mapa estático para a ficha impressa: mosaico de blocos do OpenStreetMap com um marcador.
 * A matemática (projeção Web Mercator) fica separada da rede para poder ser testada.
 */
export const TILE = 256

export function lngToX(lng: number, z: number): number {
  return ((lng + 180) / 360) * Math.pow(2, z) * TILE
}

export function latToY(lat: number, z: number): number {
  const r = (lat * Math.PI) / 180
  return ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * Math.pow(2, z) * TILE
}

export interface TilePlan {
  z: number
  width: number
  height: number
  /** blocos a baixar e onde colar (em px, podem ser negativos) */
  tiles: Array<{ x: number; y: number; left: number; top: number }>
  /** posição do marcador dentro da imagem final */
  marker: { x: number; y: number }
}

/** Planeja o mosaico centrado em (lat, lng). */
export function planStaticMap(lat: number, lng: number, z: number, width: number, height: number): TilePlan {
  const cx = lngToX(lng, z)
  const cy = latToY(lat, z)
  const left = cx - width / 2
  const top = cy - height / 2
  const max = Math.pow(2, z)
  const tiles: TilePlan['tiles'] = []
  for (let tx = Math.floor(left / TILE); tx <= Math.floor((left + width - 1) / TILE); tx++) {
    for (let ty = Math.floor(top / TILE); ty <= Math.floor((top + height - 1) / TILE); ty++) {
      if (ty < 0 || ty >= max) continue
      tiles.push({ x: ((tx % max) + max) % max, y: ty, left: Math.round(tx * TILE - left), top: Math.round(ty * TILE - top) })
    }
  }
  return { z, width, height, tiles, marker: { x: Math.round(width / 2), y: Math.round(height / 2) } }
}

export function validCoords(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 85 && Math.abs(lng) <= 180 && !(lat === 0 && lng === 0)
}
