import express from 'express'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import helmet from 'helmet'
import rateLimit from 'express-rate-limit'
import { env } from './config/env.js'
import { prisma } from './lib/prisma.js'
import { errorHandler, notFound } from './middleware/errors.js'
import { adminRouter } from './modules/admin/admin.routes.js'
import { authRouter } from './modules/auth/auth.routes.js'
import { ordersRouter } from './modules/orders/orders.routes.js'
import { productsRouter } from './modules/products/products.routes.js'
import { customersRouter } from './modules/customers/customers.routes.js'
import { reports } from './modules/admin/reports.controller.js'
import { authenticate, allowRoles } from './middleware/auth.js'
import { imagesRouter } from './modules/products/images.routes.js'
import { cartRouter } from './modules/cart/cart.routes.js'
import { paymentsRouter } from './modules/payments/payments.routes.js'


const app = express()
app.disable('x-powered-by')
app.set('trust proxy', 1)
app.use(helmet())
app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: false }))
app.use(express.json({ limit: '1mb' }))
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }))
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, limit: 12, standardHeaders: 'draft-8', legacyHeaders: false }))
app.get('/api/health', async (_req, res) => {
  try { await prisma.$queryRaw`SELECT 1`; res.json({ status: 'ok', database: 'connected' }) }
  catch { res.status(503).json({ status: 'unavailable', database: 'disconnected' }) }
})
app.use('/api/auth', authRouter)
app.use('/api/products', productsRouter)
app.use('/api/cart', cartRouter)
app.use('/api/payments', paymentsRouter)
app.use('/api/admin/product-images', imagesRouter)
app.use('/uploads', express.static(fileURLToPath(new URL('../uploads/', import.meta.url)), { maxAge: '30d', immutable: true, dotfiles: 'deny', index: false }))
app.use('/api/orders', ordersRouter)
app.use('/api/admin', adminRouter)
app.use('/api/customers', customersRouter)
app.get('/api/admin/reports', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), reports)
app.use(notFound)
app.use(errorHandler)

const server = app.listen(env.PORT, () => console.info(`Pedrada API ouvindo na porta ${env.PORT}`))
async function shutdown() { server.close(); await prisma.$disconnect(); process.exit(0) }
process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
