import jwt from 'jsonwebtoken'
import { env } from '../config/env.js'
import { prisma } from '../lib/prisma.js'

export async function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, '')
  if (!token) return res.status(401).json({ error: 'Autenticação necessária.' })
  try {
    const payload = jwt.verify(token, env.JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: payload.sub }, select: { id: true, name: true, email: true, role: true, active: true, tokenVersion: true } })
    if (!user?.active || user.tokenVersion !== (payload.tokenVersion ?? 0)) return res.status(401).json({ error: 'Sessão inválida ou expirada.' })
    delete user.tokenVersion
    req.user = user
    next()
  } catch {
    return res.status(401).json({ error: 'Sessão inválida ou expirada.' })
  }
}

export const allowRoles = (...roles) => (req, res, next) => {
  if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ error: 'Você não tem permissão para esta ação.' })
  next()
}
