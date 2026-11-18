import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'

const sessionSchema = z.string().uuid()
const itemSchema = z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(20) })
const cartInclude = { items: { where: { variant: { active: true, product: { active: true } } }, include: { variant: { include: { product: { include: { brand: true, images: { orderBy: { position: 'asc' }, take: 1 } } } } } } } }

async function getCart(req) {
  const sessionId = sessionSchema.parse(req.get('x-cart-session'))
  return prisma.cart.upsert({ where: { sessionId }, create: { sessionId }, update: {}, include: cartInclude })
}

export async function readCart(req, res) {
  res.json({ cart: await getCart(req) })
}

export async function putCartItem(req, res) {
  const input = itemSchema.parse(req.body)
  const cart = await getCart(req)
  const item = await prisma.$transaction(async (tx) => {
    const variant = await tx.productVariant.findFirst({ where: { id: input.variantId, active: true, product: { active: true } }, include: { product: true } })
    if (!variant) throw Object.assign(new Error('Esta numeração não está disponível.'), { status: 404 })
    const existing = await tx.cartItem.findUnique({ where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } } })
    const quantity = (existing?.quantity ?? 0) + input.quantity
    if (quantity > variant.stock) throw Object.assign(new Error(`Há somente ${variant.stock} pares disponíveis neste tamanho.`), { status: 409 })
    return tx.cartItem.upsert({ where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } }, create: { cartId: cart.id, variantId: variant.id, quantity }, update: { quantity } })
  })
  res.status(201).json({ item, cart: await getCart(req) })
}

export async function setCartItemQuantity(req, res) {
  const { quantity } = z.object({ quantity: z.number().int().min(1).max(20) }).parse(req.body)
  const cart = await getCart(req)
  const result = await prisma.$transaction(async (tx) => {
    const item = await tx.cartItem.findFirst({ where: { id: req.params.id, cartId: cart.id }, include: { variant: true } })
    if (!item) throw Object.assign(new Error('Item não encontrado na sacola.'), { status: 404 })
    if (!item.variant.active || quantity > item.variant.stock) throw Object.assign(new Error(`Há somente ${item.variant.stock} pares disponíveis neste tamanho.`), { status: 409 })
    return tx.cartItem.update({ where: { id: item.id }, data: { quantity } })
  })
  res.json({ item: result, cart: await getCart(req) })
}

export async function removeCartItem(req, res) {
  const cart = await getCart(req)
  await prisma.cartItem.deleteMany({ where: { id: req.params.id, cartId: cart.id } })
  res.json({ cart: await getCart(req) })
}

export async function emptyCart(req, res) {
  const cart = await getCart(req)
  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } })
  res.status(204).end()
}
