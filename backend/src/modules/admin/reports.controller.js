import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'

const rangeSchema = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() })
const csvValue = (value) => {
  const text = String(value ?? '')
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
  return `"${safe.replaceAll('"', '""')}"`
}

export async function reports(req, res) {
  const { from, to } = rangeSchema.parse(req.query)
  const createdAt = { ...(from && { gte: from }), ...(to && { lte: to }) }
  const where = Object.keys(createdAt).length ? { createdAt } : {}
  const [orders, users, products, statusGroups, bestSellers] = await Promise.all([
    prisma.order.findMany({ where, include: { items: true, user: { select: { name: true, email: true } } }, orderBy: { createdAt: 'desc' } }),
    prisma.user.count({ where: { role: 'CUSTOMER', ...(Object.keys(createdAt).length ? { createdAt } : {}) } }),
    prisma.product.findMany({ where: { active: true }, include: { brand: true, variants: true } }),
    prisma.order.groupBy({ by: ['status'], where, _count: { _all: true } }),
    prisma.orderItem.groupBy({ by: ['productId', 'productName'], where: { order: where }, _sum: { quantity: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 20 }),
  ])
  const paid = orders.filter((order) => ['PAID', 'PREPARING', 'SHIPPED', 'DELIVERED'].includes(order.status))
  const revenue = paid.reduce((sum, order) => sum + Number(order.total), 0)
  const quantities = new Map(bestSellers.map((item) => [item.productId, item._sum.quantity ?? 0]))
  const reportType = String(req.query.type ?? 'summary')
  let rows
  if (reportType === 'inventory') rows = [['Produto', 'Marca', 'SKU', 'Cor', 'Numeração', 'Estoque'], ...products.flatMap((product) => product.variants.map((variant) => [product.name, product.brand.name, variant.sku, variant.color, variant.size, variant.stock]))]
  else if (reportType === 'orders') rows = [['Pedido', 'Data', 'Cliente', 'E-mail', 'Status', 'Subtotal', 'Desconto', 'Frete', 'Total'], ...orders.map((order) => [order.number, order.createdAt.toISOString(), order.user.name, order.user.email, order.status, order.subtotal, order.discount, order.shipping, order.total])]
  else if (reportType === 'products') rows = [['Produto', 'Unidades vendidas'], ...bestSellers.map((item) => [item.productName, item._sum.quantity ?? 0])]
  else rows = [['Indicador', 'Valor'], ['Faturamento confirmado', revenue.toFixed(2)], ['Pedidos no período', orders.length], ['Ticket médio', (paid.length ? revenue / paid.length : 0).toFixed(2)], ['Clientes cadastrados no período', users], ['Produtos ativos', products.length], ['Produtos pouco vendidos', products.filter((product) => !quantities.has(product.id)).length], ...statusGroups.map((item) => [`Pedidos ${item.status}`, item._count._all])]
  if (req.query.format === 'csv') {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="pedrada-${reportType}.csv"`)
    return res.send(`\uFEFF${rows.map((row) => row.map(csvValue).join(';')).join('\r\n')}`)
  }
  res.json({ type: reportType, revenue, orders: orders.length, averageTicket: paid.length ? revenue / paid.length : 0, customers: users, products: products.length, lowStock: products.reduce((sum, product) => sum + product.variants.filter((variant) => variant.active && variant.stock <= 3).length, 0), orderStatuses: statusGroups, bestSellers })
}
