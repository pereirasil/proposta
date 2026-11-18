import { z } from 'zod'

export const orderSchema = z.object({
  addressId: z.string().uuid(),
  paymentMethod: z.enum(['PIX', 'CREDIT_CARD']),
  couponCode: z.string().trim().max(60).optional(),
  items: z.array(z.object({ variantId: z.string().uuid(), quantity: z.number().int().min(1).max(20) })).min(1).max(40),
})

export const statusSchema = z.object({ status: z.enum(['PENDING_PAYMENT', 'PAID', 'PREPARING', 'SHIPPED', 'DELIVERED', 'CANCELLED']), note: z.string().max(500).optional() })
