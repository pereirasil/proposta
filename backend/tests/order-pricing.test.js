import test from 'node:test'
import assert from 'node:assert/strict'
import { calculateDiscount, calculateShipping, canTransitionOrder, money } from '../src/modules/orders/pricing.js'

test('calcula frete conforme valor mínimo anunciado', () => {
  assert.equal(calculateShipping(398.99), 24.9)
  assert.equal(calculateShipping(399), 0)
})

test('arredonda descontos percentuais e limita desconto fixo ao subtotal', () => {
  assert.equal(calculateDiscount(199.99, { percentage: 10, amount: null }), 20)
  assert.equal(calculateDiscount(20, { percentage: null, amount: 25 }), 20)
  assert.equal(calculateDiscount(20, null), 0)
  assert.equal(money(10.005), 10.01)
})

test('só permite transições de pedido que não confirmam pagamento manualmente', () => {
  assert.equal(canTransitionOrder('PENDING_PAYMENT', 'CANCELLED'), true)
  assert.equal(canTransitionOrder('PAID', 'PREPARING'), true)
  assert.equal(canTransitionOrder('PENDING_PAYMENT', 'PAID'), false)
  assert.equal(canTransitionOrder('DELIVERED', 'CANCELLED'), false)
})
