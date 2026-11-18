import { Router } from 'express'
import { authenticate, allowRoles } from '../../middleware/auth.js'
import { createOrder, listAdminOrders, myOrders, updateOrderStatus } from './orders.controller.js'

export const ordersRouter = Router()
ordersRouter.use(authenticate)
ordersRouter.post('/', createOrder)
ordersRouter.get('/mine', myOrders)
ordersRouter.get('/admin', allowRoles('SUPER_ADMIN', 'ADMIN'), listAdminOrders)
ordersRouter.patch('/admin/:id/status', allowRoles('SUPER_ADMIN', 'ADMIN'), updateOrderStatus)
