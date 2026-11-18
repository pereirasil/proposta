const apiBase = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'
const apiOrigin = apiBase.replace(/\/api\/?$/, '')

export async function fetchProducts() {
  const response = await fetch(`${apiBase}/products?limit=48`)
  if (!response.ok) throw new Error('Não foi possível carregar o catálogo.')
  const result = await response.json()
  return result.items.map((product) => ({
    id: product.slug,
    name: product.name,
    brand: product.brand.name,
    price: Number(product.salePrice ?? product.price),
    oldPrice: product.salePrice ? Number(product.price) : null,
    category: product.category.name === 'Masculino' ? 'Masculino' : product.category.name === 'Feminino' ? 'Feminino' : 'Unissex',
    badge: product.salePrice ? 'OFERTA' : product.isNew ? 'LANÇAMENTO' : product.featured ? 'MAIS VENDIDO' : '',
    color: 'sand',
    image: product.images[0]?.url?.startsWith('/') ? `${apiOrigin}${product.images[0].url}` : product.images[0]?.url,
    images: product.images.map((image) => ({ ...image, url: image.url.startsWith('/') ? `${apiOrigin}${image.url}` : image.url })),
    featured: product.featured,
    isNew: product.isNew,
    onSale: product.onSale,
    variants: product.variants,
  }))
}

export const apiUrl = apiBase
