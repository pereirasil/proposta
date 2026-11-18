import { apiUrl } from './products.js'

const sessionKey = 'pedrada-cart-session'
const tokenKey = 'pedrada-customer-token'

function getCartSession() {
  let id = localStorage.getItem(sessionKey)
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(sessionKey, id) }
  return id
}

export const getCustomerToken = () => sessionStorage.getItem(tokenKey) ?? ''
export const setCustomerToken = (token) => token ? sessionStorage.setItem(tokenKey, token) : sessionStorage.removeItem(tokenKey)

export async function storeRequest(path, options = {}) {
  const token = getCustomerToken()
  const response = await fetch(`${apiUrl}${path}`, { ...options, headers: { 'Content-Type': 'application/json', 'x-cart-session': getCartSession(), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } })
  const body = response.status === 204 ? null : await response.json().catch(() => null)
  if (!response.ok) throw new Error(body?.error ?? 'Não foi possível concluir a solicitação.')
  return body
}

function normalizeCart(cart) {
  return (cart?.items ?? []).map(({ id: cartItemId, variant, quantity }) => ({
    cartItemId, variantId: variant.id, quantity,
    id: variant.product.slug, name: variant.product.name, brand: variant.product.brand.name,
    price: Number(variant.product.salePrice ?? variant.product.price), oldPrice: variant.product.salePrice ? Number(variant.product.price) : null,
    image: variant.product.images[0]?.url?.startsWith('/') ? `${apiUrl.replace(/\/api\/?$/, '')}${variant.product.images[0].url}` : variant.product.images[0]?.url ?? '', color: variant.color, size: variant.size, stock: variant.stock,
  }))
}

export async function loadCart() { return normalizeCart((await storeRequest('/cart')).cart) }
export async function addCartItem(variantId) { return normalizeCart((await storeRequest('/cart/items', { method: 'POST', body: JSON.stringify({ variantId, quantity: 1 }) })).cart) }
export async function removeCartItem(cartItemId) { return normalizeCart((await storeRequest(`/cart/items/${cartItemId}`, { method: 'DELETE' })).cart) }
export async function setCartItemQuantity(cartItemId, quantity) { return normalizeCart((await storeRequest(`/cart/items/${cartItemId}`, { method: 'PATCH', body: JSON.stringify({ quantity }) })).cart) }
export async function clearCart() { await storeRequest('/cart', { method: 'DELETE' }) }
export async function listAddresses() { return (await storeRequest('/customers/addresses')).items }
export async function createAddress(address) { return (await storeRequest('/customers/addresses', { method: 'POST', body: JSON.stringify(address) })).address }
export async function updateAddress(id, address) { return (await storeRequest(`/customers/addresses/${id}`, { method: 'PATCH', body: JSON.stringify(address) })).address }
export async function deleteAddress(id) { await storeRequest(`/customers/addresses/${id}`, { method: 'DELETE' }) }
export async function getProfile() { return (await storeRequest('/customers/profile')).user }
export async function updateProfile(profile) { return (await storeRequest('/customers/profile', { method: 'PATCH', body: JSON.stringify(profile) })).user }
export async function changePassword(passwords) { return storeRequest('/customers/password', { method: 'PATCH', body: JSON.stringify(passwords) }) }
export async function listFavorites() { return (await storeRequest('/customers/favorites')).items }
export async function toggleFavorite(productId) { return storeRequest('/customers/favorites', { method: 'POST', body: JSON.stringify({ productId }) }) }
export async function createOrder(order) { return storeRequest('/orders', { method: 'POST', body: JSON.stringify(order) }) }
export async function listOrders() { return (await storeRequest('/orders/mine')).items }
export async function authenticateCustomer(path, credentials) { return storeRequest(path, { method: 'POST', body: JSON.stringify(credentials) }) }
