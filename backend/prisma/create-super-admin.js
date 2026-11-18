import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) })

try {
  const name = process.env.SUPER_ADMIN_NAME?.trim()
  const email = process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase()
  const password = process.env.SUPER_ADMIN_PASSWORD
  if (!name || !email || !password || password.length < 14) {
    throw new Error('Defina SUPER_ADMIN_NAME, SUPER_ADMIN_EMAIL e SUPER_ADMIN_PASSWORD com pelo menos 14 caracteres no .env.')
  }

  const passwordHash = await bcrypt.hash(password, 12)
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash, role: 'SUPER_ADMIN', active: true, tokenVersion: { increment: 1 } },
    create: { name, email, passwordHash, role: 'SUPER_ADMIN', active: true },
    select: { email: true, role: true },
  })
  console.info(`Conta ${user.role} provisionada para ${user.email}. A senha foi lida do ambiente e não será exibida.`)
} finally {
  await prisma.$disconnect()
}
