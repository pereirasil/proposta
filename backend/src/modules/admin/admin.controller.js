import { prisma } from '../../lib/prisma.js'

export async function dashboard(_req, res) {
  const [paidOrders, totalOrders, customerCount, productCount, lowStock, recentOrders, bestSellers] = await Promise.all([
    prisma.order.findMany({ where: { status: { in: ['PAID', 'PREPARING', 'SHIPPED', 'DELIVERED'] } }, select: { total: true } }),
    prisma.order.count(),
    prisma.user.count({ where: { role: 'CUSTOMER' } }),
    prisma.product.count({ where: { active: true } }),
    prisma.productVariant.count({ where: { active: true, stock: { lte: 3 }, product: { active: true } } }),
    prisma.order.findMany({ take: 8, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } }, items: true } }),
    prisma.orderItem.groupBy({ by: ['productId', 'productName'], _sum: { quantity: true }, orderBy: { _sum: { quantity: 'desc' } }, take: 5 }),
  ])
  res.json({ stats: { revenue: paidOrders.reduce((sum, order) => sum + Number(order.total), 0), orders: totalOrders, customers: customerCount, products: productCount, lowStock }, recentOrders, bestSellers })
}

export async function listCustomers(req, res) {
  const search = String(req.query.search ?? '').trim()
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1)
  const where = { role: 'CUSTOMER', ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }, { cpf: { contains: search } }] } : {}) }
  const [items, total] = await Promise.all([prisma.user.findMany({ where, select: { id: true, name: true, email: true, phone: true, active: true, createdAt: true, _count: { select: { orders: true } } }, orderBy: { createdAt: 'desc' }, skip: (page - 1) * 25, take: 25 }), prisma.user.count({ where })])
  res.json({ items, pagination: { page, pageSize: 25, total, pages: Math.ceil(total / 25) } })
}

export async function updateCustomer(req, res) {
  const { z } = await import('zod')
  const { active } = z.object({ active: z.boolean() }).parse(req.body)
  const user = await prisma.user.update({ where: { id: req.params.id, role: 'CUSTOMER' }, data: { active }, select: { id: true, name: true, email: true, active: true } })
  await prisma.auditLog.create({ data: { actorId: req.user.id, action: active ? 'CUSTOMER_ACTIVATED' : 'CUSTOMER_DEACTIVATED', entity: 'User', entityId: user.id, ipAddress: req.ip } })
  res.json({ user })
}

export async function listAdmins(_req, res) {
  const admins = await prisma.user.findMany({ where: { role: { in: ['ADMIN', 'SUPER_ADMIN'] } }, select: { id: true, name: true, email: true, role: true, active: true, createdAt: true }, orderBy: { createdAt: 'asc' } })
  res.json({ items: admins })
}

export async function createAdmin(req, res) {
  const { name, email, password, role = 'ADMIN' } = req.body
  const { z } = await import('zod')
  const bcrypt = (await import('bcryptjs')).default
  const input = z.object({ name: z.string().trim().min(2), email: z.string().email().transform((value) => value.toLowerCase()), password: z.string().min(14).max(72), role: z.enum(['ADMIN', 'SUPER_ADMIN']).default('ADMIN') }).parse({ name, email, password, role })
  const user = await prisma.user.create({ data: { name: input.name, email: input.email, passwordHash: await bcrypt.hash(input.password, 12), role: input.role }, select: { id: true, name: true, email: true, role: true, active: true } })
  await prisma.auditLog.create({ data: { actorId: req.user.id, action: 'ADMIN_CREATED', entity: 'User', entityId: user.id, ipAddress: req.ip } })
  res.status(201).json({ user })
}

export async function updateAdmin(req, res) {
  const { z } = await import('zod')
  const input = z.object({ name: z.string().trim().min(2).optional(), email: z.string().email().transform((value) => value.toLowerCase()).optional(), password: z.string().min(14).max(72).optional(), active: z.boolean().optional(), role: z.enum(['ADMIN', 'SUPER_ADMIN']).optional() }).refine((value) => Object.keys(value).length > 0).parse(req.body)
  if (req.params.id === req.user.id && input.active === false) return res.status(400).json({ error: 'Você não pode desativar sua própria conta.' })
  const bcrypt = (await import('bcryptjs')).default
  const data = { ...input }
  if (data.password) { data.passwordHash = await bcrypt.hash(data.password, 12); delete data.password }
  const user = await prisma.user.update({ where: { id: req.params.id, role: { in: ['ADMIN', 'SUPER_ADMIN'] } }, data, select: { id: true, name: true, email: true, role: true, active: true } })
  await prisma.auditLog.create({ data: { actorId: req.user.id, action: 'ADMIN_UPDATED', entity: 'User', entityId: user.id, ipAddress: req.ip } })
  res.json({ user })
}
