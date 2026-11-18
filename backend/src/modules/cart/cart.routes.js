import { Router } from 'express'
import { emptyCart, putCartItem, readCart, removeCartItem, setCartItemQuantity } from './cart.controller.js'

export const cartRouter = Router()
cartRouter.get('/', readCart)
cartRouter.post('/items', putCartItem)
cartRouter.patch('/items/:id', setCartItemQuantity)
cartRouter.delete('/items/:id', removeCartItem)
cartRouter.delete('/', emptyCart)
