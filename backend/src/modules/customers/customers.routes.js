import { Router } from 'express'
import { authenticate } from '../../middleware/auth.js'
import { changePassword, createAddress, deleteAddress, getProfile, listAddresses, listFavorites, toggleFavorite, updateAddress, updateProfile } from './customers.controller.js'

export const customersRouter = Router()
customersRouter.use(authenticate)
customersRouter.get('/profile', getProfile)
customersRouter.patch('/profile', updateProfile)
customersRouter.patch('/password', changePassword)
customersRouter.get('/addresses', listAddresses)
customersRouter.post('/addresses', createAddress)
customersRouter.patch('/addresses/:id', updateAddress)
customersRouter.delete('/addresses/:id', deleteAddress)
customersRouter.get('/favorites', listFavorites)
customersRouter.post('/favorites', toggleFavorite)
