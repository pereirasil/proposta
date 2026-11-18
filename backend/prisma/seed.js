import dotenv from 'dotenv'
import { fileURLToPath } from 'node:url'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
dotenv.config({ path: fileURLToPath(new URL('../../.env', import.meta.url)) })
const shoes = [
  ['Air Max Pulse', 'Nike', 'masculino', 899.9, 1099.9, 'photo-1542291026-7eec264c27ff', true, false],
  ['Ultraboost Light', 'Adidas', 'feminino', 999.9, null, 'photo-1608231387042-66d1773070a5', false, true],
  ['574 Core', 'New Balance', 'masculino', 649.9, 799.9, 'photo-1539185441755-769473a23570', true, false],
  ['Chuck 70 Vintage', 'Converse', 'unissex', 429.9, null, 'photo-1495555961986-6d4c1ecb7be3', false, false],
  ['Gel-Kayano 30', 'ASICS', 'feminino', 899.9, 1049.9, 'photo-1552346154-21d32810aba3', false, false],
  ['Classic Leather', 'Reebok', 'masculino', 499.9, null, 'photo-1549298916-b41d501d3772', false, false],
  ['Forum Low', 'Adidas', 'feminino', 699.9, 799.9, 'photo-1600185365483-26d7a4cc7519', false, true],
  ['Air Force 1 07', 'Nike', 'masculino', 799.9, null, 'photo-1600269452121-4f2416e55c28', true, false],
  ['574 Platform', 'New Balance', 'feminino', 729.9, null, 'photo-1551107696-a4b0c5a0d9a2', false, true],
  ['Old Skool', 'Vans', 'unissex', 449.9, 529.9, 'photo-1525966222134-fcfa99b8ae77', false, false],
  ['Cloud 5', 'On', 'masculino', 899.9, null, 'photo-1460353581641-37baddab0fa2', false, true],
  ['Dunk Low Next Nature', 'Nike', 'feminino', 749.9, null, 'photo-1556048219-bb6978360b84', true, true],
]

try {
  for (const [name, brandName, categoryName, price, salePrice, image, featured, isNew] of shoes) {
    const category = await prisma.category.upsert({ where: { slug: categoryName }, update: {}, create: { name: categoryName[0].toUpperCase() + categoryName.slice(1), slug: categoryName } })
    const brand = await prisma.brand.upsert({ where: { name: brandName }, update: {}, create: { name: brandName } })
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
    const product = await prisma.product.upsert({ where: { slug }, update: {}, create: { name, slug, description: `${name}: conforto, qualidade e estilo para acompanhar você.`, sku: `PD-${slug.toUpperCase()}`, price, salePrice, onSale: Boolean(salePrice), featured, isNew, categoryId: category.id, brandId: brand.id, images: { create: [{ url: `https://images.unsplash.com/${image}?auto=format&fit=crop&w=720&q=85`, alt: `${name} ${brandName}` }] }, variants: { create: ['37', '38', '39', '40', '41', '42', '43'].map((size) => ({ sku: `PD-${slug.toUpperCase()}-${size}`, color: 'Original', size, stock: 5, movements: { create: { type: 'IN', quantity: 5, reason: 'Estoque inicial da demonstração' } } })) } } })
    console.info(`Seed: ${product.name}`)
  }

  const { SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME, SUPER_ADMIN_PASSWORD } = process.env
  if (!SUPER_ADMIN_EMAIL || !SUPER_ADMIN_NAME || !SUPER_ADMIN_PASSWORD || SUPER_ADMIN_PASSWORD.length < 14) throw new Error('Configure SUPER_ADMIN_EMAIL, SUPER_ADMIN_NAME e SUPER_ADMIN_PASSWORD (mínimo 14 caracteres) no .env antes de executar o seed.')
  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 12)
  await prisma.user.upsert({ where: { email: SUPER_ADMIN_EMAIL.toLowerCase() }, update: { name: SUPER_ADMIN_NAME, passwordHash, role: 'SUPER_ADMIN', active: true }, create: { name: SUPER_ADMIN_NAME, email: SUPER_ADMIN_EMAIL.toLowerCase(), passwordHash, role: 'SUPER_ADMIN' } })
  console.info(`Super admin configurado: ${SUPER_ADMIN_EMAIL}`)
} finally { await prisma.$disconnect() }
