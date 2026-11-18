import { Router } from 'express'
import { paymentGatewayStatus } from './gateway.js'

export const paymentsRouter = Router()
paymentsRouter.get('/readiness', (_req, res) => res.json(paymentGatewayStatus()))
