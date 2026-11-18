import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { env } from '../../config/env.js'
import { prisma } from '../../lib/prisma.js'
import { loginSchema, registerSchema } from './auth.schemas.js'

export function issueSessionToken(user) {
  return jwt.sign({ role: user.role, tokenVersion: user.tokenVersion ?? 0 }, env.JWT_SECRET, { subject: user.id, expiresIn: env.JWT_EXPIRES_IN, issuer: 'pedrada-api', audience: 'pedrada-store' })
}

export async function register(req, res) {
  const input = registerSchema.parse(req.body)
  const existing = await prisma.user.findFirst({ where: { OR: [{ email: input.email }, { cpf: input.cpf }] }, select: { email: true, cpf: true } })
  if (existing) return res.status(409).json({ error: existing.email === input.email ? 'Este e-mail já está cadastrado.' : 'Este CPF já está cadastrado.' })
  const passwordHash = await bcrypt.hash(input.password, 12)
  const userRecord = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({ data: { name: input.name, email: input.email, passwordHash, cpf: input.cpf, phone: input.phone }, select: { id: true, name: true, email: true, role: true, tokenVersion: true } })
    await tx.address.create({ data: { ...input.address, recipient: input.name, userId: user.id, isDefault: true } })
    await tx.auditLog.create({ data: { actorId: user.id, action: 'ACCOUNT_REGISTERED', entity: 'User', entityId: user.id, ipAddress: req.ip } })
    return user
  })
  const user = { id: userRecord.id, name: userRecord.name, email: userRecord.email, role: userRecord.role }
  res.status(201).json({ user, token: issueSessionToken(userRecord) })
}

export async function login(req, res) {
  const input = loginSchema.parse(req.body)
  const userRecord = await prisma.user.findUnique({ where: { email: input.email } })
  if (!userRecord?.active || !(await bcrypt.compare(input.password, userRecord.passwordHash))) return res.status(401).json({ error: 'E-mail ou senha inválidos.' })
  const user = { id: userRecord.id, name: userRecord.name, email: userRecord.email, role: userRecord.role }
  res.json({ user, token: issueSessionToken(userRecord) })
}

export async function me(req, res) {
  res.json({ user: req.user })
}
