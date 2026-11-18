import { Router } from 'express'
import { authenticate, allowRoles } from '../../middleware/auth.js'
import { createAdmin, dashboard, listAdmins, listCustomers, updateAdmin, updateCustomer } from './admin.controller.js'

export const adminRouter = Router()
adminRouter.use(authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'))
adminRouter.get('/dashboard', dashboard)
adminRouter.get('/customers', listCustomers)
adminRouter.patch('/customers/:id', updateCustomer)
adminRouter.get('/admins', allowRoles('SUPER_ADMIN'), listAdmins)
adminRouter.post('/admins', allowRoles('SUPER_ADMIN'), createAdmin)
adminRouter.patch('/admins/:id', allowRoles('SUPER_ADMIN'), updateAdmin)
