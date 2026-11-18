import { prisma } from '../../lib/prisma.js'
import { orderSchema, statusSchema } from './orders.schemas.js'
import { createPaymentIntent } from '../payments/gateway.js'
import { randomUUID } from 'node:crypto'
import { calculateDiscount, calculateShipping, canTransitionOrder, money } from './pricing.js'

export async function createOrder(req, res) {
  const input = orderSchema.parse(req.body)
  const result = await prisma.$transaction(async (tx) => {
    const address = await tx.address.findFirst({ where: { id: input.addressId, userId: req.user.id } })
    if (!address) throw Object.assign(new Error('Endereço não encontrado.'), { status: 400 })
    const uniqueIds = [...new Set(input.items.map((item) => item.variantId))]
    const variants = await tx.productVariant.findMany({ where: { id: { in: uniqueIds }, active: true, product: { active: true } }, include: { product: true } })
    if (variants.length !== uniqueIds.length) throw Object.assign(new Error('Um ou mais produtos não estão disponíveis.'), { status: 409 })
    const byId = new Map(variants.map((variant) => [variant.id, variant]))
    let subtotal = 0
    const snapshots = input.items.map((item) => {
      const variant = byId.get(item.variantId)
      if (variant.stock < item.quantity) throw Object.assign(new Error(`Estoque insuficiente para ${variant.product.name}, tamanho ${variant.size}.`), { status: 409 })
      const unitPrice = Number(variant.product.salePrice ?? variant.product.price)
      subtotal += unitPrice * item.quantity
      return { ...item, variant, unitPrice }
    })
    const coupon = input.couponCode ? await tx.coupon.findFirst({ where: { code: input.couponCode.toUpperCase(), active: true, OR: [{ startsAt: null }, { startsAt: { lte: new Date() } }], AND: [{ OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] }] } }) : null
    if (input.couponCode && (!coupon || (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit))) throw Object.assign(new Error('Cupom inválido ou expirado.'), { status: 400 })
    const discount = calculateDiscount(subtotal, coupon)
    const shipping = calculateShipping(subtotal)
    const order = await tx.order.create({ data: { number: `PD-${Date.now().toString(36).toUpperCase()}-${randomUUID().slice(0, 8).toUpperCase()}`, userId: req.user.id, addressId: address.id, paymentMethod: input.paymentMethod, subtotal, discount, shipping, total: money(subtotal - discount + shipping), couponId: coupon?.id, shippingSnapshot: { recipient: address.recipient, street: address.street, number: address.number, complement: address.complement, neighborhood: address.neighborhood, city: address.city, state: address.state, postalCode: address.postalCode }, items: { create: snapshots.map(({ variant, quantity, unitPrice }) => ({ productId: variant.productId, variantId: variant.id, productName: variant.product.name, sku: variant.sku, color: variant.color, size: variant.size, quantity, unitPrice })) }, payments: { create: { method: input.paymentMethod, amount: money(subtotal - discount + shipping), status: 'PENDING' } }, history: { create: { status: 'PENDING_PAYMENT', note: 'Pedido criado.' } } }, include: { items: true, payments: true } })
    for (const { variant, quantity } of snapshots) {
      const updated = await tx.productVariant.updateMany({ where: { id: variant.id, stock: { gte: quantity } }, data: { stock: { decrement: quantity } } })
      if (!updated.count) throw Object.assign(new Error('Estoque atualizado durante a compra. Revise seu carrinho.'), { status: 409 })
      await tx.stockMovement.create({ data: { variantId: variant.id, type: 'OUT', quantity: -quantity, reason: 'Pedido confirmado', reference: order.id, actorId: req.user.id } })
    }
    if (coupon) await tx.coupon.update({ where: { id: coupon.id }, data: { usedCount: { increment: 1 } } })
    return order
  })
  let payment
  try { payment = await createPaymentIntent({ orderId: result.id, amount: Number(result.total), method: input.paymentMethod, customerId: req.user.id }) }
  catch { payment = { status: 'NOT_CONFIGURED', configured: false, message: 'Pedido registrado, mas a cobrança não foi iniciada. Verifique a configuração do gateway antes de tentar novamente.' } }
  res.status(201).json({ order: result, payment: { status: 'PENDING', ...payment } })
}

export async function myOrders(req, res) {
  const orders = await prisma.order.findMany({ where: { userId: req.user.id }, include: { items: true, payments: { select: { method: true, status: true, amount: true } }, history: { orderBy: { createdAt: 'asc' } } }, orderBy: { createdAt: 'desc' } })
  res.json({ items: orders })
}

export async function listAdminOrders(req, res) {
  const status = req.query.status
  const orders = await prisma.order.findMany({ where: status ? { status } : {}, include: { user: { select: { id: true, name: true, email: true } }, items: true }, orderBy: { createdAt: 'desc' }, take: 100 })
  res.json({ items: orders })
}

export async function updateOrderStatus(req, res) {
  const input = statusSchema.parse(req.body)
  const updated = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUniqueOrThrow({ where: { id: req.params.id }, include: { items: true } })
    if (!canTransitionOrder(order.status, input.status)) throw Object.assign(new Error(`Transição inválida: ${order.status} para ${input.status}.`), { status: 409 })
    if (input.status === 'CANCELLED') {
      for (const item of order.items) {
        await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } })
        await tx.stockMovement.create({ data: { variantId: item.variantId, type: 'IN', quantity: item.quantity, reason: 'Estorno de cancelamento', reference: order.id, actorId: req.user.id } })
      }
    }
    const saved = await tx.order.update({ where: { id: order.id }, data: { status: input.status, history: { create: { status: input.status, note: input.note, actorId: req.user.id } } } })
    if (input.status === 'CANCELLED') await tx.payment.updateMany({ where: { orderId: order.id, status: 'PENDING' }, data: { status: 'CANCELLED' } })
    await tx.auditLog.create({ data: { actorId: req.user.id, action: 'ORDER_STATUS_CHANGED', entity: 'Order', entityId: order.id, metadata: { from: order.status, to: input.status } } })
    return saved
  })
  res.json({ order: updated })
}
