import test from 'node:test'
import assert from 'node:assert/strict'
import { createPaymentIntent, paymentGatewayStatus } from '../src/modules/payments/gateway.js'

test('não afirma que uma cobrança foi feita sem adaptador de gateway', async () => {
  assert.deepEqual(paymentGatewayStatus(), {
    configured: false,
    provider: null,
    methods: ['PIX', 'CREDIT_CARD'],
    message: 'Nenhum adaptador de pagamento está configurado. Cadastre as credenciais do provedor e implemente seu adaptador antes de cobrar clientes.',
  })
  const result = await createPaymentIntent({ orderId: 'test', amount: 120, method: 'PIX' })
  assert.equal(result.status, 'NOT_CONFIGURED')
  assert.equal(result.configured, false)
})
