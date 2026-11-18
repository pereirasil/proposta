import { prisma } from '../../lib/prisma.js'
import { z } from 'zod'
import { basename, join } from 'node:path'
import { unlink } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { productCreateSchema, productUpdateSchema, stockMovementSchema } from './products.schemas.js'

const includeCard = { brand: true, category: true, images: { orderBy: { position: 'asc' } }, variants: { where: { active: true }, select: { id: true, sku: true, color: true, size: true, stock: true, active: true } } }
const uploadDir = fileURLToPath(new URL('../../../uploads/', import.meta.url))

export async function listProducts(req, res) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
  const pageSize = Math.min(48, Math.max(1, Number.parseInt(req.query.limit, 10) || 12))
  const where = { active: true }
  if (req.query.category) where.category = { slug: String(req.query.category) }
  if (req.query.search) where.OR = [{ name: { contains: String(req.query.search), mode: 'insensitive' } }, { brand: { name: { contains: String(req.query.search), mode: 'insensitive' } } }]
  if (req.query.featured === 'true') where.featured = true
  if (req.query.new === 'true') where.isNew = true
  if (req.query.sale === 'true') where.onSale = true
  const [items, total] = await Promise.all([prisma.product.findMany({ where, include: includeCard, orderBy: { createdAt: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }), prisma.product.count({ where })])
  res.json({ items, pagination: { page, pageSize, total, pages: Math.ceil(total / pageSize) } })
}

export async function listAdminProducts(req, res) {
  const search = String(req.query.search ?? '').trim()
  const items = await prisma.product.findMany({ where: search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { sku: { contains: search, mode: 'insensitive' } }] } : {}, include: includeCard, orderBy: { updatedAt: 'desc' }, take: 200 })
  res.json({ items })
}

export async function listCategories(_req, res) {
  const items = await prisma.category.findMany({ where: { active: true }, include: { _count: { select: { products: true } } }, orderBy: { name: 'asc' } })
  res.json({ items })
}

export async function listAdminCategories(_req, res) {
  const items = await prisma.category.findMany({ include: { _count: { select: { products: true } } }, orderBy: { name: 'asc' } })
  res.json({ items })
}

export async function listBrands(_req, res) {
  const items = await prisma.brand.findMany({ orderBy: { name: 'asc' } })
  res.json({ items })
}

export async function createBrand(req, res) {
  const input = z.object({ name: z.string().trim().min(2).max(100) }).parse(req.body)
  const brand = await prisma.brand.create({ data: input })
  await prisma.auditLog.create({ data: { actorId: req.user.id, action: 'BRAND_CREATED', entity: 'Brand', entityId: brand.id, ipAddress: req.ip } })
  res.status(201).json({ brand })
}

const categoryInput = z.object({ name: z.string().trim().min(2).max(100), slug: z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/), active: z.boolean().optional() })

export async function createCategory(req, res) {
  const input = categoryInput.parse(req.body)
  const category = await prisma.category.create({ data: input })
  await prisma.auditLog.create({ data: { actorId: req.user.id, action: 'CATEGORY_CREATED', entity: 'Category', entityId: category.id, ipAddress: req.ip } })
  res.status(201).json({ category })
}

export async function updateCategory(req, res) {
  const input = categoryInput.partial().parse(req.body)
  const category = await prisma.category.update({ where: { id: req.params.id }, data: input })
  await prisma.auditLog.create({ data: { actorId: req.user.id, action: 'CATEGORY_UPDATED', entity: 'Category', entityId: category.id, ipAddress: req.ip } })
  res.json({ category })
}

export async function deactivateCategory(req, res) {
  const category = await prisma.category.update({ where: { id: req.params.id }, data: { active: false } })
  await prisma.auditLog.create({ data: { actorId: req.user.id, action: 'CATEGORY_DEACTIVATED', entity: 'Category', entityId: category.id, ipAddress: req.ip } })
  res.json({ category })
}

export async function getProduct(req, res) {
  const lookup = z.string().uuid().safeParse(req.params.id).success ? { id: req.params.id } : { slug: req.params.id }
  const product = await prisma.product.findFirst({ where: { ...lookup, active: true }, include: { brand: true, category: true, images: { orderBy: { position: 'asc' } }, variants: { where: { active: true } } } })
  if (!product) return res.status(404).json({ error: 'Produto não encontrado.' })
  res.json({ product })
}

export async function createProduct(req, res) {
  const input = productCreateSchema.parse(req.body)
  if (input.salePrice && input.salePrice >= input.price) return res.status(400).json({ error: 'O preço promocional precisa ser menor que o preço original.' })
  if (input.onSale && !input.salePrice) return res.status(400).json({ error: 'Informe um preço promocional para destacar este produto como oferta.' })
  const { images, variants, ...data } = input
  const product = await prisma.product.create({ data: { ...data, images: { create: images.map((image, position) => ({ ...image, position })) }, variants: { create: variants.map((variant) => ({ ...variant, ...(variant.stock > 0 && { movements: { create: { type: 'IN', quantity: variant.stock, reason: 'Estoque inicial de cadastro', actorId: req.user.id } } }) })) } }, include: includeCard })
  await prisma.auditLog.create({ data: { actorId: req.user.id, action: 'PRODUCT_CREATED', entity: 'Product', entityId: product.id, ipAddress: req.ip } })
  res.status(201).json({ product })
}

export async function updateProduct(req, res) {
  const input = productUpdateSchema.parse(req.body)
  if (input.salePrice && input.price && input.salePrice >= input.price) return res.status(400).json({ error: 'O preço promocional precisa ser menor que o preço original.' })
  const { images, variants, ...data } = input
  let removedImages = []
  const product = await prisma.$transaction(async (tx) => {
    if (images) {
      removedImages = await tx.productImage.findMany({ where: { productId: req.params.id }, select: { url: true } })
      await tx.productImage.deleteMany({ where: { productId: req.params.id } })
    }
    if (variants) {
      const existing = await tx.productVariant.findMany({ where: { productId: req.params.id }, select: { id: true, sku: true, stock: true, active: true } })
      const existingBySku = new Map(existing.map((variant) => [variant.sku, variant]))
      const requestedSkus = new Set(variants.map((variant) => variant.sku))
      for (const variant of variants) {
        const current = existingBySku.get(variant.sku)
        if (current) {
          await tx.productVariant.update({ where: { id: current.id }, data: { color: variant.color, size: variant.size, active: true, ...(!current.active && variant.stock > 0 && { stock: { increment: variant.stock } }) } })
          if (!current.active && variant.stock > 0) await tx.stockMovement.create({ data: { variantId: current.id, type: 'IN', quantity: variant.stock, reason: 'Estoque da variação reativada', actorId: req.user.id } })
        }
        else await tx.productVariant.create({ data: { ...variant, productId: req.params.id, ...(variant.stock > 0 && { movements: { create: { type: 'IN', quantity: variant.stock, reason: 'Estoque inicial de cadastro', actorId: req.user.id } } }) } })
      }
      for (const current of existing.filter((variant) => variant.active && !requestedSkus.has(variant.sku))) {
        await tx.productVariant.update({ where: { id: current.id }, data: { active: false, stock: 0 } })
        if (current.stock > 0) await tx.stockMovement.create({ data: { variantId: current.id, type: 'OUT', quantity: -current.stock, reason: 'Variação desativada no cadastro do produto', actorId: req.user.id } })
      }
    }
    const current = await tx.product.findUniqueOrThrow({ where: { id: req.params.id }, select: { price: true, salePrice: true } })
    const effectivePrice = data.price ?? Number(current.price)
    const effectiveSale = Object.hasOwn(data, 'salePrice') ? data.salePrice : current.salePrice === null ? null : Number(current.salePrice)
    if (effectiveSale !== null && effectiveSale >= effectivePrice) throw Object.assign(new Error('O preço promocional precisa ser menor que o preço original.'), { status: 400 })
    if (data.onSale === true && effectiveSale === null) throw Object.assign(new Error('Informe um preço promocional para destacar este produto como oferta.'), { status: 400 })
    return tx.product.update({ where: { id: req.params.id }, data: { ...data, ...(images && { images: { create: images.map((image, position) => ({ ...image, position })) } }) }, include: includeCard })
  })
  for (const image of removedImages) {
    if (!image.url.startsWith('/uploads/')) continue
    const stillUsed = await prisma.productImage.count({ where: { url: image.url } })
    if (!stillUsed) await unlink(join(uploadDir, basename(image.url))).catch(() => {})
  }
  await prisma.auditLog.create({ data: { actorId: req.user.id, action: 'PRODUCT_UPDATED', entity: 'Product', entityId: product.id, ipAddress: req.ip } })
  res.json({ product })
}

export async function deactivateProduct(req, res) {
  const product = await prisma.product.update({ where: { id: req.params.id }, data: { active: false } })
  await prisma.auditLog.create({ data: { actorId: req.user.id, action: 'PRODUCT_DEACTIVATED', entity: 'Product', entityId: product.id, ipAddress: req.ip } })
  res.json({ product })
}

export async function listStock(req, res) {
  const variants = await prisma.productVariant.findMany({ where: { active: true, stock: { lte: 5 }, product: { active: true } }, include: { product: { select: { name: true, sku: true, brand: { select: { name: true } } } } }, orderBy: { stock: 'asc' } })
  res.json({ items: variants })
}

export async function moveStock(req, res) {
  const input = stockMovementSchema.parse(req.body)
  const result = await prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findUniqueOrThrow({ where: { id: req.params.variantId } })
    const delta = input.type === 'IN' ? input.quantity : input.type === 'OUT' ? -input.quantity : input.quantity - variant.stock
    const newStock = variant.stock + delta
    if (newStock < 0) throw Object.assign(new Error('Estoque insuficiente.'), { status: 409 })
    const updated = await tx.productVariant.update({ where: { id: variant.id }, data: { stock: newStock } })
    const movement = await tx.stockMovement.create({ data: { variantId: variant.id, type: input.type, quantity: delta, reason: input.reason, actorId: req.user.id } })
    return { variant: updated, movement }
  })
  res.status(201).json(result)
}
