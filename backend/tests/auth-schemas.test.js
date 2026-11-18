import test from 'node:test'
import assert from 'node:assert/strict'
import { isValidCpfForTests, registerSchema, resetPasswordSchema } from '../src/modules/auth/auth.schemas.js'

test('valida CPF e rejeita sequências repetidas ou dígitos inválidos', () => {
  assert.equal(isValidCpfForTests('529.982.247-25'), true)
  assert.equal(isValidCpfForTests('111.111.111-11'), false)
  assert.equal(isValidCpfForTests('529.982.247-24'), false)
})

test('cadastro exige telefone, CPF válido e senha confirmada com política forte', () => {
  const valid = { name: 'Cliente Teste', email: 'cliente@example.com', cpf: '52998224725', phone: '+55 (11) 98765-4321', password: 'SenhaForte!2026', passwordConfirmation: 'SenhaForte!2026', address: { postalCode: '01001-000', street: 'Praça da Sé', number: '1', complement: '', neighborhood: 'Sé', city: 'São Paulo', state: 'sp', reference: '' } }
  const parsed = registerSchema.safeParse(valid)
  assert.equal(parsed.success, true)
  assert.equal(parsed.data.phone, '11987654321')
  assert.equal(parsed.data.address.postalCode, '01001000')
  assert.equal(parsed.data.address.state, 'SP')
  assert.equal(registerSchema.safeParse({ ...valid, cpf: '11111111111' }).success, false)
  assert.equal(registerSchema.safeParse({ ...valid, passwordConfirmation: 'OutraSenha!2026' }).success, false)
  assert.equal(registerSchema.safeParse({ ...valid, password: 'weak', passwordConfirmation: 'weak' }).success, false)
  assert.equal(registerSchema.safeParse({ ...valid, address: undefined }).success, false)
})

test('recuperação rejeita senha sem confirmação correta ou token curto', () => {
  const valid = { token: 'x'.repeat(43), password: 'SenhaForte!2026', passwordConfirmation: 'SenhaForte!2026' }
  assert.equal(resetPasswordSchema.safeParse(valid).success, true)
  assert.equal(resetPasswordSchema.safeParse({ ...valid, token: 'short' }).success, false)
  assert.equal(resetPasswordSchema.safeParse({ ...valid, passwordConfirmation: 'OutraSenha!2026' }).success, false)
})
