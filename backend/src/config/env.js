import { z } from 'zod'
import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'

dotenv.config({ path: fileURLToPath(new URL('../../../.env', import.meta.url)) })

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('1h'),
  CLIENT_ORIGIN: z.string().url().default('http://localhost:5173'),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.string().transform((value) => value === 'true').default('false'),
  SMTP_USER: z.string().optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_FROM: z.preprocess((value) => value === '' ? undefined : value, z.string().email().optional()),
  SMTP_TRANSPORT_MODULE: z.string().optional(),
})

export const env = schema.parse(process.env)

const databaseUrl = new URL(env.DATABASE_URL)
const invalidDatabaseMarkers = ['USUARIO', 'SENHA', 'HOST', 'NOME_DO_BANCO']
if (invalidDatabaseMarkers.some((marker) => env.DATABASE_URL.includes(marker)) || !databaseUrl.hostname || databaseUrl.pathname === '/') {
  throw new Error('DATABASE_URL ainda contém valores de exemplo. Configure usuário, senha, host e nome reais do PostgreSQL no .env.')
}
