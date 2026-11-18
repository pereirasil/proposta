import { createHash, randomBytes } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { env } from '../../config/env.js'
import { prisma } from '../../lib/prisma.js'
import { issueSessionToken } from './auth.controller.js'
import { emailConfigured, sendPasswordResetEmail } from './mailer.js'
import { forgotPasswordSchema, resetPasswordSchema } from './auth.schemas.js'

const tokenHash = (token) => createHash('sha256').update(token).digest('hex')
const genericMessage = 'Se houver uma conta ativa para esse e-mail, enviaremos um link de redefinição.'

export function recoveryReadiness(_req, res) {
  res.json({ configured: emailConfigured, method: 'SMTP', message: emailConfigured ? 'O envio de redefinição está configurado.' : 'Configure um transporte SMTP, SMTP_HOST e SMTP_FROM para enviar e-mails de redefinição.' })
}

export async function requestPasswordReset(req, res) {
  const { email } = forgotPasswordSchema.parse(req.body)
  if (!emailConfigured) return res.status(503).json({ code: 'EMAIL_NOT_CONFIGURED', error: 'A recuperação por e-mail ainda não está disponível neste ambiente. O serviço SMTP precisa ser configurado.' })
  const user = await prisma.user.findFirst({ where: { email, role: 'CUSTOMER', active: true }, select: { id: true, email: true } })
  if (!user) return res.status(202).json({ message: genericMessage })

  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000)
  await prisma.$transaction([
    prisma.passwordResetToken.updateMany({ where: { userId: user.id, usedAt: null }, data: { usedAt: new Date() } }),
    prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash: tokenHash(token), expiresAt } }),
  ])
  const resetUrl = `${env.CLIENT_ORIGIN}/account/reset?token=${encodeURIComponent(token)}`
  try {
    await sendPasswordResetEmail(user.email, resetUrl)
  } catch {
    await prisma.passwordResetToken.updateMany({ where: { tokenHash: tokenHash(token), usedAt: null }, data: { usedAt: new Date() } })
    if (process.env.NODE_ENV !== 'production') console.error('Falha no envio da recuperação de senha.')
    return res.status(202).json({ message: genericMessage })
  }
  res.status(202).json({ message: genericMessage })
}

export async function resetPassword(req, res) {
  const input = resetPasswordSchema.parse(req.body)
  if (!input.password || input.password.length < 12) return res.status(400).json({ error: 'A senha deve ter pelo menos 12 caracteres.' })
  const now = new Date()
  const hashedToken = tokenHash(input.token)
  const record = await prisma.passwordResetToken.findFirst({ where: { tokenHash: hashedToken, usedAt: null, expiresAt: { gt: now }, user: { active: true, role: 'CUSTOMER' } }, include: { user: { select: { id: true, name: true, email: true, role: true } } } })
  if (!record) return res.status(400).json({ error: 'O link é inválido ou expirou. Solicite outro e-mail de redefinição.' })

  const passwordHash = await bcrypt.hash(input.password, 12)
  const userRecord = await prisma.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.updateMany({ where: { id: record.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } })
    if (!consumed.count) throw Object.assign(new Error('O link é inválido ou já foi usado. Solicite outro e-mail de redefinição.'), { status: 400 })
    const user = await tx.user.update({ where: { id: record.userId }, data: { passwordHash, tokenVersion: { increment: 1 } }, select: { id: true, name: true, email: true, role: true, tokenVersion: true } })
    await tx.passwordResetToken.updateMany({ where: { userId: user.id, id: { not: record.id }, usedAt: null }, data: { usedAt: now } })
    await tx.auditLog.create({ data: { actorId: user.id, action: 'PASSWORD_RESET', entity: 'User', entityId: user.id, ipAddress: req.ip } })
    return user
  })
  const user = { id: userRecord.id, name: userRecord.name, email: userRecord.email, role: userRecord.role }
  res.json({ user, token: issueSessionToken(userRecord) })
}
