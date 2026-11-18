import test from 'node:test'
import assert from 'node:assert/strict'
import { productUpdateSchema } from '../src/modules/products/products.schemas.js'

test('edição parcial não reaplica valores padrão nem reativa um produto', () => {
  assert.deepEqual(productUpdateSchema.parse({ name: 'Novo nome' }), { name: 'Novo nome' })
})

test('edição aceita limpar promoção e código de barras explicitamente', () => {
  const parsed = productUpdateSchema.parse({ salePrice: null, barcode: null, onSale: false })
  assert.equal(parsed.salePrice, null)
  assert.equal(parsed.barcode, null)
  assert.equal(parsed.onSale, false)
})
