import { randomUUID } from 'node:crypto'
import { mkdir, unlink, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Router } from 'express'
import multer from 'multer'
import sharp from 'sharp'
import { authenticate, allowRoles } from '../../middleware/auth.js'

const uploadDir = fileURLToPath(new URL('../../../uploads/', import.meta.url))
const supportedMimes = new Set(['image/jpeg', 'image/png', 'image/webp'])
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 6 * 1024 * 1024, files: 8 }, fileFilter: (_req, file, callback) => callback(null, supportedMimes.has(file.mimetype)) })

export const imagesRouter = Router()
imagesRouter.post('/', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), upload.array('images', 8), async (req, res) => {
  if (!req.files?.length) return res.status(400).json({ error: 'Selecione pelo menos uma imagem JPEG, PNG ou WebP.' })
  await mkdir(uploadDir, { recursive: true })
  const prepared = []
  for (const file of req.files) {
    try {
      const image = sharp(file.buffer, { failOn: 'error', limitInputPixels: 40_000_000 })
      const metadata = await image.metadata()
      const expectedFormat = { 'image/jpeg': 'jpeg', 'image/png': 'png', 'image/webp': 'webp' }[file.mimetype]
      if (metadata.format !== expectedFormat || !metadata.width || !metadata.height || metadata.width > 8000 || metadata.height > 8000 || (metadata.pages ?? 1) > 1) return res.status(400).json({ error: `O arquivo ${file.originalname} não é uma imagem JPEG, PNG ou WebP válida ou excede os limites.` })
      const buffer = await image.rotate().resize({ width: 2200, height: 2200, fit: 'inside', withoutEnlargement: true }).webp({ quality: 86 }).toBuffer()
      prepared.push({ filename: `${randomUUID()}.webp`, buffer, alt: file.originalname.replace(/[^\p{L}\p{N}._ -]/gu, '').slice(0, 180) })
    } catch {
      return res.status(400).json({ error: `Não foi possível decodificar a imagem ${file.originalname}.` })
    }
  }
  const written = []
  try {
    for (const file of prepared) { await writeFile(join(uploadDir, file.filename), file.buffer, { flag: 'wx' }); written.push(file.filename) }
  } catch (error) {
    await Promise.all(written.map((filename) => unlink(join(uploadDir, filename)).catch(() => {})))
    throw error
  }
  const items = prepared.map((file) => ({ url: `/uploads/${file.filename}`, alt: file.alt }))
  const { prisma } = await import('../../lib/prisma.js')
  await prisma.auditLog.create({ data: { actorId: req.user.id, action: 'PRODUCT_IMAGES_UPLOADED', entity: 'ProductImage', metadata: { count: items.length }, ipAddress: req.ip } })
  res.status(201).json({ items })
})
