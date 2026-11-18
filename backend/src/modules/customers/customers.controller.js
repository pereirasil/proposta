import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { prisma } from '../../lib/prisma.js'
import { issueSessionToken } from '../auth/auth.controller.js'
import { normalizeBrazilPhone, strongPasswordSchema } from '../auth/auth.schemas.js'

const addressShape = z.object({ label: z.string().max(60).optional(), recipient: z.string().trim().min(2).max(120), street: z.string().trim().min(2).max(160), number: z.string().trim().min(1).max(20), complement: z.string().max(120).optional(), reference: z.string().max(180).optional(), neighborhood: z.string().trim().min(2).max(100), city: z.string().trim().min(2).max(100), state: z.string().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()), postalCode: z.string().regex(/^\d{8}$/), isDefault: z.boolean().default(false) })
const addressSchema = addressShape
const addressUpdateSchema = addressShape.partial().extend({ isDefault: z.boolean().optional() })

const profileSchema = z.object({ name: z.string().trim().min(2).max(120).optional(), email: z.string().trim().email().max(190).transform((value) => value.toLowerCase()).optional(), phone: z.string().transform(normalizeBrazilPhone).refine((value) => /^\d{10,11}$/.test(value), 'Informe um celular com DDD.').optional() }).refine((value) => Object.keys(value).length > 0)

export async function getProfile(req, res) {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: req.user.id }, select: { id: true, name: true, email: true, cpf: true, phone: true, role: true, createdAt: true } })
  res.json({ user })
}

export async function updateProfile(req, res) {
  const input = profileSchema.parse(req.body)
  if (input.email) {
    const duplicate = await prisma.user.findFirst({ where: { email: input.email, id: { not: req.user.id } }, select: { id: true } })
    if (duplicate) return res.status(409).json({ error: 'Este e-mail já está cadastrado.' })
  }
  const user = await prisma.user.update({ where: { id: req.user.id }, data: input, select: { id: true, name: true, email: true, cpf: true, phone: true, role: true } })
  await prisma.auditLog.create({ data: { actorId: user.id, action: 'CUSTOMER_PROFILE_UPDATED', entity: 'User', entityId: user.id, ipAddress: req.ip } })
  res.json({ user })
}

export async function changePassword(req, res) {
  const schema = z.object({ currentPassword: z.string().min(1).max(72), password: strongPasswordSchema, passwordConfirmation: z.string().min(1) }).superRefine((value, context) => { if (value.password !== value.passwordConfirmation) context.addIssue({ code: 'custom', path: ['passwordConfirmation'], message: 'As senhas não conferem.' }) })
  const input = schema.parse(req.body)
  if (input.password === input.currentPassword) return res.status(400).json({ error: 'Escolha uma senha diferente da atual.' })
  const account = await prisma.user.findUnique({ where: { id: req.user.id }, select: { passwordHash: true } })
  if (!account || !(await bcrypt.compare(input.currentPassword, account.passwordHash))) return res.status(400).json({ error: 'A senha atual está incorreta.' })
  const user = await prisma.user.update({ where: { id: req.user.id }, data: { passwordHash: await bcrypt.hash(input.password, 12), tokenVersion: { increment: 1 } }, select: { id: true, name: true, email: true, role: true, tokenVersion: true } })
  await prisma.auditLog.create({ data: { actorId: user.id, action: 'PASSWORD_CHANGED', entity: 'User', entityId: user.id, ipAddress: req.ip } })
  res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token: issueSessionToken(user) })
}

export async function listAddresses(req, res) {
  const items = await prisma.address.findMany({ where: { userId: req.user.id }, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }] })
  res.json({ items })
}

export async function createAddress(req, res) {
  const input = addressSchema.parse(req.body)
  const item = await prisma.$transaction(async (tx) => {
    if (input.isDefault) await tx.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } })
    return tx.address.create({ data: { ...input, userId: req.user.id, isDefault: input.isDefault } })
  })
  res.status(201).json({ address: item })
}

export async function updateAddress(req, res) {
  const input = addressUpdateSchema.parse(req.body)
  const item = await prisma.$transaction(async (tx) => {
    if (input.isDefault) await tx.address.updateMany({ where: { userId: req.user.id }, data: { isDefault: false } })
    const owned = await tx.address.findFirst({ where: { id: req.params.id, userId: req.user.id }, select: { id: true } })
    if (!owned) throw Object.assign(new Error('Endereço não encontrado.'), { status: 404 })
    return tx.address.update({ where: { id: owned.id }, data: input })
  })
  res.json({ address: item })
}

export async function deleteAddress(req, res) {
  const result = await prisma.address.deleteMany({ where: { id: req.params.id, userId: req.user.id } })
  if (!result.count) return res.status(404).json({ error: 'Endereço não encontrado.' })
  res.status(204).end()
}

export async function listFavorites(req, res) {
  const items = await prisma.favorite.findMany({ where: { userId: req.user.id }, include: { product: { include: { brand: true, category: true, images: { orderBy: { position: 'asc' }, take: 1 } } } }, orderBy: { createdAt: 'desc' } })
  res.json({ items })
}

export async function toggleFavorite(req, res) {
  const input = z.object({ productId: z.string().uuid() }).parse(req.body)
  const key = { userId_productId: { userId: req.user.id, productId: input.productId } }
  const existing = await prisma.favorite.findUnique({ where: key })
  if (existing) { await prisma.favorite.delete({ where: key }); return res.json({ favorited: false }) }
  await prisma.favorite.create({ data: { userId: req.user.id, productId: input.productId } })
  res.status(201).json({ favorited: true })
}
