import { Router } from 'express'
import { authenticate, allowRoles } from '../../middleware/auth.js'
import { createBrand, createCategory, createProduct, deactivateCategory, deactivateProduct, getProduct, listAdminCategories, listAdminProducts, listBrands, listCategories, listProducts, listStock, moveStock, updateCategory, updateProduct } from './products.controller.js'

export const productsRouter = Router()
productsRouter.get('/', listProducts)
productsRouter.get('/categories', listCategories)
productsRouter.get('/brands', listBrands)
productsRouter.get('/admin/all', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), listAdminProducts)
productsRouter.get('/admin/categories', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), listAdminCategories)
productsRouter.post('/brands', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), createBrand)
productsRouter.post('/categories', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), createCategory)
productsRouter.patch('/categories/:id', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), updateCategory)
productsRouter.delete('/categories/:id', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), deactivateCategory)
productsRouter.get('/:id', getProduct)
productsRouter.post('/', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), createProduct)
productsRouter.patch('/:id', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), updateProduct)
productsRouter.delete('/:id', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), deactivateProduct)
productsRouter.get('/admin/stock/low', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), listStock)
productsRouter.post('/admin/stock/:variantId/movements', authenticate, allowRoles('SUPER_ADMIN', 'ADMIN'), moveStock)
