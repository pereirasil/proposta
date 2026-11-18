import { z } from 'zod'

const imageSchema = z.object({ url: z.string().url().or(z.string().regex(/^\/uploads\/[a-f0-9-]+\.(?:jpg|png|webp)$/i)), alt: z.string().max(180).optional() })
const variantSchema = z.object({ sku: z.string().trim().min(2).max(80), color: z.string().trim().min(1).max(60), size: z.string().trim().min(1).max(12), stock: z.number().int().nonnegative() })

const productShape = z.object({
  name: z.string().trim().min(2).max(180),
  slug: z.string().trim().min(2).max(190).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().trim().min(5).max(10000),
  sku: z.string().trim().min(2).max(80),
  barcode: z.union([z.string().trim().max(80), z.null()]).optional(),
  price: z.coerce.number().positive(),
  salePrice: z.union([z.coerce.number().positive(), z.null()]).optional(),
  categoryId: z.string().uuid(),
  brandId: z.string().uuid(),
  featured: z.boolean().default(false),
  isNew: z.boolean().default(false),
  onSale: z.boolean().default(false),
  active: z.boolean().default(true),
  images: z.array(imageSchema).default([]),
  variants: z.array(variantSchema).min(1),
})

function validateVariants(value, context) {
  if (!value.variants) return
  const skus = new Set()
  const combinations = new Set()
  value.variants.forEach((variant, index) => {
    if (skus.has(variant.sku)) context.addIssue({ code: 'custom', path: ['variants', index, 'sku'], message: 'O SKU da variação precisa ser único.' })
    if (combinations.has(`${variant.color.toLowerCase()}|${variant.size.toLowerCase()}`)) context.addIssue({ code: 'custom', path: ['variants', index], message: 'Cor e numeração não podem se repetir.' })
    skus.add(variant.sku); combinations.add(`${variant.color.toLowerCase()}|${variant.size.toLowerCase()}`)
  })
}

export const productCreateSchema = productShape.superRefine(validateVariants)
export const productUpdateSchema = productShape.partial().extend({
  featured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  onSale: z.boolean().optional(),
  active: z.boolean().optional(),
  images: z.array(imageSchema).optional(),
  variants: z.array(variantSchema).min(1).optional(),
}).superRefine(validateVariants)

export const stockMovementSchema = z.object({
  type: z.enum(['IN', 'OUT', 'ADJUSTMENT']),
  quantity: z.number().int().positive(),
  reason: z.string().trim().min(3).max(240),
})
