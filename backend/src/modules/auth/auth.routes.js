import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { authenticate } from '../../middleware/auth.js'
import { login, me, register } from './auth.controller.js'
import { recoveryReadiness, requestPasswordReset, resetPassword } from './recovery.controller.js'

export const authRouter = Router()
const recoveryLimit = rateLimit({ windowMs: 60 * 60 * 1000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false })
authRouter.post('/register', register)
authRouter.post('/login', login)
authRouter.get('/me', authenticate, me)
authRouter.get('/recovery/readiness', recoveryReadiness)
authRouter.post('/recovery/request', recoveryLimit, requestPasswordReset)
authRouter.post('/recovery/reset', recoveryLimit, resetPassword)
