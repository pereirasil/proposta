import { z } from 'zod'

export function isValidCpf(rawCpf) {
  const cpf = String(rawCpf ?? '').replace(/\D/g, '')
  if (cpf.length !== 11 || /^([0-9])\1{10}$/.test(cpf)) return false
  const digit = (length) => {
    const sum = cpf.slice(0, length).split('').reduce((total, value, index) => total + Number(value) * (length + 1 - index), 0)
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10])
}

export function normalizeBrazilPhone(rawPhone) {
  const digits = String(rawPhone ?? '').replace(/\D/g, '')
  return digits.startsWith('55') && (digits.length === 12 || digits.length === 13) ? digits.slice(2) : digits
}

export const strongPasswordSchema = z.string().min(12).max(72)
  .regex(/[a-z]/, 'A senha precisa ter uma letra minúscula.')
  .regex(/[A-Z]/, 'A senha precisa ter uma letra maiúscula.')
  .regex(/[0-9]/, 'A senha precisa ter um número.')
  .regex(/[^A-Za-z0-9]/, 'A senha precisa ter um símbolo.')

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(190).transform((value) => value.toLowerCase()),
  password: strongPasswordSchema,
  passwordConfirmation: z.string().min(1),
  cpf: z.string().transform((value) => value.replace(/\D/g, '')).refine(isValidCpf, 'Informe um CPF válido.'),
  phone: z.string().transform(normalizeBrazilPhone).refine((value) => /^\d{10,11}$/.test(value), 'Informe um celular com DDD.'),
  address: z.object({
    postalCode: z.string().transform((value) => value.replace(/\D/g, '')).refine((value) => /^\d{8}$/.test(value), 'Informe um CEP válido.'),
    street: z.string().trim().min(2, 'Informe a rua ou avenida.').max(160),
    number: z.string().trim().min(1, 'Informe o número.').max(20),
    complement: z.string().max(120).optional(),
    neighborhood: z.string().trim().min(2, 'Informe o bairro.').max(100),
    city: z.string().trim().min(2, 'Informe a cidade.').max(100),
    state: z.string().trim().regex(/^[A-Za-z]{2}$/, 'Informe a UF com duas letras.').transform((value) => value.toUpperCase()),
    reference: z.string().max(180).optional(),
  }),
}).superRefine((value, context) => {
  if (value.password !== value.passwordConfirmation) context.addIssue({ code: 'custom', path: ['passwordConfirmation'], message: 'As senhas não conferem.' })
})

export const loginSchema = z.object({
  email: z.string().trim().email().transform((value) => value.toLowerCase()),
  password: z.string().min(1).max(72),
})

export const forgotPasswordSchema = z.object({ email: z.string().trim().email().transform((value) => value.toLowerCase()) })
export const resetPasswordSchema = z.object({ token: z.string().min(40).max(200), password: strongPasswordSchema, passwordConfirmation: z.string().min(1) }).superRefine((value, context) => {
  if (value.password !== value.passwordConfirmation) context.addIssue({ code: 'custom', path: ['passwordConfirmation'], message: 'As senhas não conferem.' })
})

export const isValidCpfForTests = isValidCpf
