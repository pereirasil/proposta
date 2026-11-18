export const money = (value) => Math.round(value * 100) / 100

export function calculateShipping(subtotal) {
  return subtotal >= 399 ? 0 : 24.9
}

export function calculateDiscount(subtotal, coupon) {
  if (!coupon) return 0
  return coupon.percentage ? money(subtotal * Number(coupon.percentage) / 100) : Math.min(subtotal, Number(coupon.amount ?? 0))
}

const orderTransitions = Object.freeze({
  PENDING_PAYMENT: ['CANCELLED'],
  PAID: ['PREPARING'],
  PREPARING: ['SHIPPED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
})

export function canTransitionOrder(from, to) {
  return orderTransitions[from]?.includes(to) ?? false
}
