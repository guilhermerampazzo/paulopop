import path from 'path'
import fs from 'fs/promises'
import { v4 as uuidv4 } from 'uuid'

// Em dev: './public/uploads' (relativo à raiz do projeto)
// Em Docker: '/app/public/uploads' (definido em docker-compose.yml)
// ATENÇÃO: não configure UPLOAD_DIR como caminho absoluto fora de public/ ao rodar localmente
const UPLOAD_BASE = process.env.UPLOAD_DIR ?? path.join(process.cwd(), 'public', 'uploads')

export async function saveImage(file: File): Promise<{ url: string; thumbnailUrl: string }> {
  const bytes = await file.arrayBuffer()
  return saveImageBuffer(Buffer.from(bytes))
}

/** Grava uma imagem já em memória (ex.: baixada na importação) como WebP + miniatura. */
export async function saveImageBuffer(buffer: Buffer): Promise<{ url: string; thumbnailUrl: string }> {
  const sharp = (await import('sharp')).default

  const dir = path.isAbsolute(UPLOAD_BASE)
    ? path.join(UPLOAD_BASE, 'images')
    : path.join(process.cwd(), UPLOAD_BASE, 'images')
  await fs.mkdir(dir, { recursive: true })

  const ext = 'webp'
  const filename = `${uuidv4()}.${ext}`
  const thumbFilename = `thumb_${filename}`

  // Imagem principal (max 1920px, qualidade 85)
  await sharp(buffer)
    .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 85 })
    .toFile(path.join(dir, filename))

  // Thumbnail (400px)
  await sharp(buffer)
    .resize(400, 300, { fit: 'cover' })
    .webp({ quality: 75 })
    .toFile(path.join(dir, thumbFilename))

  return {
    url: `/uploads/images/${filename}`,
    thumbnailUrl: `/uploads/images/${thumbFilename}`,
  }
}

export async function saveDocument(file: File): Promise<{ url: string; size: number }> {
  const bytes = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)

  const dir = path.isAbsolute(UPLOAD_BASE)
    ? path.join(UPLOAD_BASE, 'documents')
    : path.join(process.cwd(), UPLOAD_BASE, 'documents')
  await fs.mkdir(dir, { recursive: true })

  const originalExt = file.name.split('.').pop() ?? 'bin'
  const filename = `${uuidv4()}.${originalExt}`

  await fs.writeFile(path.join(dir, filename), buffer)

  return {
    url: `/uploads/documents/${filename}`,
    size: buffer.length,
  }
}

export async function deleteFile(url: string): Promise<void> {
  // URL ex: /uploads/images/xxx.webp → segments: ['images', 'xxx.webp']
  const segments = url.replace(/^\/uploads\//, '').split('/')
  const fullPath = path.isAbsolute(UPLOAD_BASE)
    ? path.join(UPLOAD_BASE, ...segments)
    : path.join(process.cwd(), UPLOAD_BASE, ...segments)
  try {
    await fs.unlink(fullPath)
  } catch {
    // Arquivo pode não existir, ignorar
  }
}

/**
 * v1.4 — lê do disco um arquivo de /uploads (URL relativa gravada no banco). Devolve null se não existir
 * ou se o caminho sair da pasta de uploads.
 */
export async function readUploadFile(url: string): Promise<Buffer | null> {
  if (!url.startsWith('/uploads/')) return null
  const segments = url.replace(/^\/uploads\//, '').split('?')[0].split('/')
  if (segments.some(s => s === '..' || s === '' || s.includes('\0'))) return null
  const base = path.resolve(path.isAbsolute(UPLOAD_BASE) ? UPLOAD_BASE : path.join(process.cwd(), UPLOAD_BASE))
  const full = path.resolve(base, ...segments)
  if (!full.startsWith(base + path.sep)) return null
  try { return await fs.readFile(full) } catch { return null }
}
