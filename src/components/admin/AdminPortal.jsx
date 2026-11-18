import { useCallback, useEffect, useState } from 'react'
import { Activity, ArrowDownToLine, ArrowLeft, Box, ChevronDown, ChevronRight, CircleAlert, ClipboardList, LayoutDashboard, LogOut, Package, Search, ShieldCheck, ShoppingBag, Users } from 'lucide-react'
import { motion } from 'framer-motion'
import { setCustomerToken } from '../../services/storeApi.js'
import './admin.css'

const api = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'
const currency = (value) => Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const nav = [
  { id: 'dashboard', label: 'Visão geral', icon: LayoutDashboard },
  { id: 'orders', label: 'Pedidos', icon: ShoppingBag },
  { id: 'products', label: 'Produtos e estoque', icon: Package },
  { id: 'categories', label: 'Categorias', icon: Box },
  { id: 'customers', label: 'Clientes', icon: Users },
  { id: 'reports', label: 'Relatórios', icon: Activity },
]

async function request(path, token, options = {}) {
  const response = await fetch(`${api}${path}`, { ...options, headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...options.headers } })
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? 'Não foi possível concluir a solicitação.')
  return response.status === 204 ? null : response.json()
}

export default function AdminPortal() {
  const [token, setToken] = useState(() => sessionStorage.getItem('pedrada-admin-token') ?? '')
  const [user, setUser] = useState(null)
  const [page, setPage] = useState('dashboard')
  const [data, setData] = useState(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [search, setSearch] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [productForm, setProductForm] = useState(null)
  const [categoryForm, setCategoryForm] = useState(null)

  const load = useCallback(async (section = page, authToken = token) => {
    if (!authToken) return
    setBusy(true); setError('')
    try {
      if (section === 'dashboard') setData(await request('/admin/dashboard', authToken))
      if (section === 'orders') setData(await request('/orders/admin', authToken))
      if (section === 'customers') setData(await request(`/admin/customers?search=${encodeURIComponent(search)}`, authToken))
      if (section === 'products') {
        const [catalog, stock, categories, brands] = await Promise.all([request('/products/admin/all?limit=200', authToken), request('/products/admin/stock/low', authToken), request('/products/admin/categories', authToken), request('/products/brands', authToken)])
        setData({ catalog: catalog.items, stock: stock.items, categories: categories.items, brands: brands.items })
      }
      if (section === 'categories') setData(await request('/products/admin/categories', authToken))
      if (section === 'reports') setData(await request('/admin/reports', authToken))
    } catch (cause) { setError(cause.message); if (cause.message.includes('Sessão')) signOut() }
    finally { setBusy(false) }
  }, [page, token, search])

  useEffect(() => {
    const customerToken = sessionStorage.getItem('pedrada-customer-token')
    if (!token && customerToken) {
      request('/auth/me', customerToken).then(({ user: current }) => {
        if (['ADMIN', 'SUPER_ADMIN'].includes(current.role)) {
          sessionStorage.removeItem('pedrada-customer-token')
          sessionStorage.setItem('pedrada-admin-token', customerToken)
          setToken(customerToken)
        } else window.location.replace('/account')
      }).catch(() => sessionStorage.removeItem('pedrada-customer-token'))
      return
    }
    if (token) request('/auth/me', token).then(({ user: current }) => {
      if (['ADMIN', 'SUPER_ADMIN'].includes(current.role)) setUser(current)
      else {
        sessionStorage.removeItem('pedrada-admin-token')
        setCustomerToken(token)
        window.location.replace('/account')
      }
    }).catch((cause) => { setError(cause.message); signOut() })
  }, [token])
  useEffect(() => { if (!user) return undefined; const timer = window.setTimeout(() => load(page), 0); return () => window.clearTimeout(timer) }, [user, page, load])

  function signOut() { sessionStorage.removeItem('pedrada-admin-token'); setToken(''); setUser(null); setData(null) }
  async function login(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const result = await request('/auth/login', '', { method: 'POST', body: JSON.stringify({ email, password }) })
      if (['ADMIN', 'SUPER_ADMIN'].includes(result.user.role)) {
        setCustomerToken('')
        sessionStorage.setItem('pedrada-admin-token', result.token)
        setToken(result.token); setUser(result.user)
      } else {
        sessionStorage.removeItem('pedrada-admin-token')
        setCustomerToken(result.token)
        window.location.assign('/account')
      }
    }
    catch (cause) { setError(cause.message) } finally { setBusy(false) }
  }
  async function updateStatus(order, status) { try { await request(`/orders/admin/${order.id}/status`, token, { method: 'PATCH', body: JSON.stringify({ status, note: `Atualizado por ${user.name}` }) }); await load('orders') } catch (cause) { setError(cause.message) } }
  async function updateCustomer(customer, active) { try { await request(`/admin/customers/${customer.id}`, token, { method: 'PATCH', body: JSON.stringify({ active }) }); await load('customers') } catch (cause) { setError(cause.message) } }
  async function movement(variant) {
    const quantity = Number(window.prompt(`Quantidade para ${variant.product.name}, tam. ${variant.size}:`))
    if (!Number.isInteger(quantity) || quantity < 1) return
    try { await request(`/products/admin/stock/${variant.id}/movements`, token, { method: 'POST', body: JSON.stringify({ type: 'IN', quantity, reason: 'Entrada de estoque pelo painel' }) }); await load('products') } catch (cause) { setError(cause.message) }
  }
  function editProduct(product = null) {
    setError('')
    setProductForm(product ? { ...product, brandName: product.brand.name, price: String(product.price), salePrice: product.salePrice ? String(product.salePrice) : '', images: product.images.map((image) => ({ url: image.url, alt: image.alt ?? '' })), variants: product.variants.map((variant) => ({ sku: variant.sku, color: variant.color, size: variant.size, stock: variant.stock })) } : { name: '', slug: '', description: '', sku: '', barcode: '', price: '', salePrice: '', categoryId: data?.categories?.[0]?.id ?? '', brandId: '', brandName: '', featured: false, isNew: false, onSale: false, active: true, images: [], variants: [{ sku: '', color: '', size: '37', stock: 0 }] })
  }
  async function saveProduct(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      let brandId = productForm.brandId
      if (!brandId && productForm.brandName.trim()) brandId = (await request('/products/brands', token, { method: 'POST', body: JSON.stringify({ name: productForm.brandName.trim() }) })).brand.id
      const payload = { name: productForm.name, slug: productForm.slug || productForm.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), description: productForm.description, sku: productForm.sku, barcode: productForm.barcode || null, price: Number(productForm.price), salePrice: productForm.salePrice ? Number(productForm.salePrice) : null, categoryId: productForm.categoryId, brandId, featured: productForm.featured, isNew: productForm.isNew, onSale: Boolean(productForm.salePrice), active: productForm.active, images: productForm.images, variants: productForm.variants.map((variant) => ({ ...variant, stock: Number(variant.stock) })) }
      await request(productForm.id ? `/products/${productForm.id}` : '/products', token, { method: productForm.id ? 'PATCH' : 'POST', body: JSON.stringify(payload) })
      setProductForm(null); await load('products')
    } catch (cause) { setError(cause.message) } finally { setBusy(false) }
  }
  async function uploadImages(files) {
    if (!files.length) return
    setBusy(true); setError('')
    try {
      const form = new FormData(); [...files].forEach((file) => form.append('images', file))
      const response = await fetch(`${api}/admin/product-images`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form })
      const body = await response.json()
      if (!response.ok) throw new Error(body.error ?? 'Falha ao enviar imagens.')
      setProductForm((current) => ({ ...current, images: [...current.images, ...body.items] }))
    } catch (cause) { setError(cause.message) } finally { setBusy(false) }
  }
  async function deactivateProduct(product) {
    if (!window.confirm(`Desativar “${product.name}”? O produto deixa de aparecer na loja, mas pedidos anteriores são preservados.`)) return
    try { await request(`/products/${product.id}`, token, { method: 'DELETE' }); await load('products') } catch (cause) { setError(cause.message) }
  }
  function editCategory(category = null) { setCategoryForm(category ? { ...category } : { name: '', slug: '', active: true }) }
  async function saveCategory(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const slug = categoryForm.slug || categoryForm.name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
      await request(categoryForm.id ? `/products/categories/${categoryForm.id}` : '/products/categories', token, { method: categoryForm.id ? 'PATCH' : 'POST', body: JSON.stringify({ name: categoryForm.name, slug, active: categoryForm.active }) })
      setCategoryForm(null); await load('categories')
    } catch (cause) { setError(cause.message) } finally { setBusy(false) }
  }
  async function deactivateCategory(category) {
    if (!window.confirm(`Desativar a categoria “${category.name}”?`)) return
    try { await request(`/products/categories/${category.id}`, token, { method: 'DELETE' }); await load('categories') } catch (cause) { setError(cause.message) }
  }
  async function exportReport() {
    try {
      const response = await fetch(`${api}/admin/reports?format=csv`, { headers: { Authorization: `Bearer ${token}` } })
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error ?? 'Falha ao exportar relatório.')
      const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = 'pedrada-resumo.csv'; link.click(); URL.revokeObjectURL(url)
    } catch (cause) { setError(cause.message) }
  }

  if (!user) return <main className="admin-login-page"><a className="admin-back" href="/"><ArrowLeft size={16} /> Voltar à loja</a><form className="admin-login" onSubmit={login}><span className="admin-mark">PEDRADA <b>MINHA CONTA</b></span><ShieldCheck size={28} /><h1>Entrar na sua conta</h1><p>Após entrar, você será direcionado para a área da sua conta.</p><label>E-mail<input type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} /></label><label>Senha<input type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} /></label>{error && <div className="admin-error" role="alert">{error}</div>}<button disabled={busy}>{busy ? 'Entrando…' : 'Entrar'} <ChevronRight size={16} /></button><div className="admin-auth-links"><span>Não tem uma conta?</span><a href="/account/register">Criar conta de cliente</a></div></form></main>

  return <div className="admin-shell"><aside className="admin-sidebar"><a className="admin-logo" href="/">pedrada<span>.</span><small>PAINEL DE GESTÃO</small></a><div className="admin-nav-label">MENU PRINCIPAL</div><nav>{nav.map(({ id, label, icon: Icon }) => <button className={page === id ? 'selected' : ''} key={id} onClick={() => setPage(id)}><Icon size={17} />{label}{page === id && <ChevronRight size={15} />}</button>)}</nav><div className="admin-sidebar-bottom"><div className="admin-user"><span>{user.name.slice(0, 1).toUpperCase()}</span><div><b>{user.name}</b><small>{user.role === 'SUPER_ADMIN' ? 'Super administrador' : 'Administrador'}</small></div></div><button className="admin-logout" onClick={signOut}><LogOut size={16} /> Sair</button></div></aside>
    <motion.main className="admin-main" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}><header className="admin-topbar"><div><span className="eyebrow">PEDRADA CALÇADOS / ADMIN</span><h1>{nav.find((item) => item.id === page)?.label}</h1></div><a href="/" className="view-store">Ver loja <ArrowLeft size={15} /></a></header>{error && <div className="admin-error" role="alert">{error}<button onClick={() => setError('')}>×</button></div>}{busy && <div className="admin-loading">Atualizando dados…</div>}
      {page === 'dashboard' && data?.stats && <><section className="admin-stats">{[['Faturamento', currency(data.stats.revenue), Activity], ['Pedidos', data.stats.orders, ClipboardList], ['Clientes', data.stats.customers, Users], ['Produtos ativos', data.stats.products, Box], ['Estoque baixo', data.stats.lowStock, CircleAlert]].map(([label, value, Icon]) => <article key={label}><span><Icon size={17} /></span><small>{label}</small><strong>{value}</strong></article>)}</section><section className="admin-panel"><div className="admin-panel-heading"><div><h2>Pedidos recentes</h2><p>Acompanhe as últimas compras da loja.</p></div><button onClick={() => setPage('orders')}>Ver pedidos <ChevronRight size={15} /></button></div><OrdersTable items={data.recentOrders ?? []} onStatus={updateStatus} /></section><section className="admin-panel"><div className="admin-panel-heading"><div><h2>Produtos mais vendidos</h2><p>Itens com mais unidades vendidas.</p></div></div><div className="top-sellers">{data.bestSellers?.map((item) => <div key={item.productId}><span>{item.productName}</span><b>{item._sum.quantity} un.</b></div>)}</div></section></>}
      {page === 'orders' && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Pedidos</h2><p>Atualize o andamento dos pedidos registrados.</p></div></div><OrdersTable items={data?.items ?? []} onStatus={updateStatus} /></section>}
      {page === 'customers' && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Clientes</h2><p>Pesquisa por nome, e-mail ou CPF.</p></div><label className="admin-search"><Search size={15} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar cliente" /></label></div><div className="admin-table-wrap"><table><thead><tr><th>Cliente</th><th>E-mail</th><th>Pedidos</th><th>Conta</th><th>Ação</th></tr></thead><tbody>{data?.items?.map((customer) => <tr key={customer.id}><td>{customer.name}</td><td>{customer.email}</td><td>{customer._count.orders}</td><td><Status value={customer.active ? 'Ativa' : 'Inativa'} /></td><td><button className="table-action" onClick={() => updateCustomer(customer, !customer.active)}>{customer.active ? 'Desativar' : 'Ativar'}</button></td></tr>)}</tbody></table>{!data?.items?.length && <p className="admin-empty">Nenhum cliente encontrado.</p>}</div></section>}
      {page === 'products' && <><section className="admin-panel"><div className="admin-panel-heading"><div><h2>Catálogo</h2><p>Cadastre, edite e desative produtos, imagens e variações.</p></div><button type="button" className="primary-admin-button" onClick={() => editProduct()}>Adicionar produto +</button></div><div className="admin-table-wrap"><table><thead><tr><th>Produto</th><th>Marca</th><th>Categoria</th><th>Preço</th><th>Estoque</th><th>Status</th><th>Ações</th></tr></thead><tbody>{data?.catalog?.map((product) => <tr key={product.id}><td>{product.name}</td><td>{product.brand.name}</td><td>{product.category.name}</td><td>{currency(product.salePrice ?? product.price)}</td><td>{product.variants.reduce((sum, variant) => sum + variant.stock, 0)} pares</td><td><Status value={product.active ? 'Ativo' : 'Inativo'} /></td><td><button className="table-action" onClick={() => editProduct(product)}>Editar</button>{product.active && <button className="table-action danger" onClick={() => deactivateProduct(product)}>Desativar</button>}</td></tr>)}</tbody></table>{!data?.catalog?.length && <p className="admin-empty">Nenhum produto cadastrado.</p>}</div></section><section className="admin-panel"><div className="admin-panel-heading"><div><h2>Estoque baixo</h2><p>Variações com até cinco pares disponíveis.</p></div></div><div className="admin-table-wrap"><table><thead><tr><th>Produto</th><th>SKU</th><th>Cor / tamanho</th><th>Disponível</th><th></th></tr></thead><tbody>{data?.stock?.map((variant) => <tr key={variant.id}><td>{variant.product.name}</td><td>{variant.sku}</td><td>{variant.color} / {variant.size}</td><td><Status value={`${variant.stock} pares`} /></td><td><button className="table-action" onClick={() => movement(variant)}>Registrar entrada</button></td></tr>)}</tbody></table>{!data?.stock?.length && <p className="admin-empty">Nenhum item com estoque baixo.</p>}</div></section>{productForm && <div className="admin-modal-backdrop"><form className="product-editor" onSubmit={saveProduct}><header><div><span className="eyebrow">CATÁLOGO PEDRADA</span><h2>{productForm.id ? 'Editar produto' : 'Novo produto'}</h2></div><button type="button" onClick={() => setProductForm(null)} aria-label="Fechar">×</button></header><div className="product-editor-grid"><label>Nome<input required value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} /></label><label>Slug<input placeholder="gerado pelo nome se vazio" value={productForm.slug} onChange={(e) => setProductForm({ ...productForm, slug: e.target.value })} /></label><label>SKU do produto<input required value={productForm.sku} onChange={(e) => setProductForm({ ...productForm, sku: e.target.value })} /></label><label>Código de barras<input value={productForm.barcode ?? ''} onChange={(e) => setProductForm({ ...productForm, barcode: e.target.value })} /></label><label className="brand-field">Marca<BrandCombobox brands={data?.brands ?? []} value={productForm.brandName ?? productForm.brand?.name ?? ''} onChange={(brandName) => { const existing = data?.brands?.find((brand) => brand.name.toLocaleLowerCase() === brandName.trim().toLocaleLowerCase()); setProductForm({ ...productForm, brandName, brandId: existing?.id ?? '' }) }} /></label><label>Categoria<select required value={productForm.categoryId} onChange={(e) => setProductForm({ ...productForm, categoryId: e.target.value })}><option value="">Selecione</option>{data?.categories?.filter((category) => category.active || category.id === productForm.categoryId).map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label>Preço (R$)<input type="number" min="0.01" step="0.01" required value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} /></label><label>Preço promocional (R$)<input type="number" min="0.01" step="0.01" value={productForm.salePrice} onChange={(e) => setProductForm({ ...productForm, salePrice: e.target.value })} /></label><label className="wide-field">Descrição<textarea required rows="3" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })} /></label></div><div className="editor-block"><h3>Imagens do produto</h3><label className="upload-control">Enviar imagens (JPEG, PNG ou WebP · até 6 MB cada)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(e) => uploadImages(e.target.files)} /></label><div className="image-previews">{productForm.images.map((image, index) => <div key={`${image.url}-${index}`}><img src={image.url.startsWith('http') ? image.url : `${api.replace(/\/api$/, '')}${image.url}`} alt={image.alt ?? ''} /><input aria-label="Texto alternativo" placeholder="Texto alternativo" value={image.alt ?? ''} onChange={(e) => setProductForm({ ...productForm, images: productForm.images.map((item, i) => i === index ? { ...item, alt: e.target.value } : item) })} /><button type="button" onClick={() => setProductForm({ ...productForm, images: productForm.images.filter((_, i) => i !== index) })}>Remover</button></div>)}</div></div><div className="editor-block"><div className="admin-panel-heading"><div><h3>Cores, numerações e estoque</h3><p>O estoque de variações existentes só muda pelo histórico de movimentações.</p></div><button type="button" className="table-action" onClick={() => setProductForm({ ...productForm, variants: [...productForm.variants, { sku: '', color: '', size: '', stock: 0 }] })}>Adicionar variação +</button></div>{productForm.variants.map((variant, index) => <div className="variant-editor" key={`${index}-${variant.sku}`}><label>SKU<input required value={variant.sku} onChange={(e) => setProductForm({ ...productForm, variants: productForm.variants.map((item, i) => i === index ? { ...item, sku: e.target.value } : item) })} /></label><label>Cor<input required value={variant.color} onChange={(e) => setProductForm({ ...productForm, variants: productForm.variants.map((item, i) => i === index ? { ...item, color: e.target.value } : item) })} /></label><label>Número<input required value={variant.size} onChange={(e) => setProductForm({ ...productForm, variants: productForm.variants.map((item, i) => i === index ? { ...item, size: e.target.value } : item) })} /></label><label>Estoque inicial<input type="number" min="0" disabled={Boolean(productForm.id && data?.catalog?.find((product) => product.id === productForm.id)?.variants.some((item) => item.sku === variant.sku))} value={variant.stock} onChange={(e) => setProductForm({ ...productForm, variants: productForm.variants.map((item, i) => i === index ? { ...item, stock: Number(e.target.value) } : item) })} /></label><button type="button" className="table-action danger" disabled={productForm.variants.length < 2} onClick={() => setProductForm({ ...productForm, variants: productForm.variants.filter((_, i) => i !== index) })}>×</button></div>)}</div><div className="editor-checks"><label><input type="checkbox" checked={productForm.featured} onChange={(e) => setProductForm({ ...productForm, featured: e.target.checked })} /> Destaque</label><label><input type="checkbox" checked={productForm.isNew} onChange={(e) => setProductForm({ ...productForm, isNew: e.target.checked })} /> Lançamento</label><label><input type="checkbox" checked={productForm.active} onChange={(e) => setProductForm({ ...productForm, active: e.target.checked })} /> Ativo</label></div><footer><button type="button" className="table-action" onClick={() => setProductForm(null)}>Cancelar</button><button disabled={busy} className="primary-admin-button">{busy ? 'Salvando…' : 'Salvar produto'}</button></footer></form></div>}</>}
      {page === 'categories' && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Categorias</h2><p>Organize as vitrines e os filtros da loja.</p></div><button className="primary-admin-button" onClick={() => editCategory()}>Nova categoria +</button></div><div className="admin-table-wrap"><table><thead><tr><th>Nome</th><th>Slug</th><th>Produtos relacionados</th><th>Status</th><th>Ações</th></tr></thead><tbody>{data?.items?.map((category) => <tr key={category.id}><td>{category.name}</td><td>{category.slug}</td><td>{category._count.products}</td><td><Status value={category.active ? 'Ativa' : 'Inativa'} /></td><td><button className="table-action" onClick={() => editCategory(category)}>Editar</button>{category.active && <button className="table-action danger" onClick={() => deactivateCategory(category)}>Desativar</button>}</td></tr>)}</tbody></table></div>{categoryForm && <div className="admin-modal-backdrop"><form className="category-editor" onSubmit={saveCategory}><header><h2>{categoryForm.id ? 'Editar categoria' : 'Nova categoria'}</h2><button type="button" onClick={() => setCategoryForm(null)}>×</button></header><label>Nome<input required value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} /></label><label>Slug<input placeholder="gerado pelo nome se vazio" value={categoryForm.slug} onChange={(e) => setCategoryForm({ ...categoryForm, slug: e.target.value })} /></label>{categoryForm.id && <label className="category-active"><input type="checkbox" checked={categoryForm.active} onChange={(e) => setCategoryForm({ ...categoryForm, active: e.target.checked })} /> Categoria ativa</label>}<footer><button type="button" className="table-action" onClick={() => setCategoryForm(null)}>Cancelar</button><button className="primary-admin-button" disabled={busy}>Salvar categoria</button></footer></form></div>}</section>}
      {page === 'reports' && <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Resumo de vendas</h2><p>Indicadores gerais e exportação CSV.</p></div><button className="export-button" onClick={exportReport}><ArrowDownToLine size={15} /> Exportar CSV</button></div><div className="report-summary"><div><small>Faturamento confirmado</small><b>{currency(data?.revenue)}</b></div><div><small>Ticket médio</small><b>{currency(data?.averageTicket)}</b></div><div><small>Pedidos</small><b>{data?.orders ?? 0}</b></div><div><small>Clientes</small><b>{data?.customers ?? 0}</b></div></div><h3 className="status-title">Pedidos por status</h3>{data?.orderStatuses?.map((item) => <div className="report-status" key={item.status}><span>{item.status.replaceAll('_', ' ')}</span><b>{item._count._all}</b></div>)}</section>}
    </motion.main></div>
}

function BrandCombobox({ brands, value, onChange }) {
  const [open, setOpen] = useState(false)
  const filteredBrands = brands.filter((brand) => brand.name.toLocaleLowerCase().includes(value.trim().toLocaleLowerCase()))
  return <div className={`brand-combobox ${open ? 'is-open' : ''}`} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false) }}>
    <div className="brand-combobox-input"><input required role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls="brand-options" autoComplete="off" placeholder="Digite ou selecione uma marca" value={value} onFocus={() => setOpen(true)} onChange={(event) => { onChange(event.target.value); setOpen(true) }} /><button type="button" aria-label={open ? 'Fechar opções de marcas' : 'Mostrar marcas cadastradas'} aria-expanded={open} onClick={() => setOpen((current) => !current)}><ChevronDown size={15} /></button></div>
    {open && <div className="brand-combobox-options" id="brand-options" role="listbox">{filteredBrands.length ? filteredBrands.map((brand) => <button type="button" role="option" aria-selected={value === brand.name} key={brand.id} onClick={() => { onChange(brand.name); setOpen(false) }}>{brand.name}<span>{value === brand.name ? 'Selecionada' : ''}</span></button>) : <p>Nova marca será cadastrada ao salvar.</p>}</div>}
  </div>
}

function Status({ value }) { return <span className="status-pill">{value}</span> }
function OrdersTable({ items, onStatus }) { const transitions = { PENDING_PAYMENT: ['CANCELLED'], PAID: ['PREPARING'], PREPARING: ['SHIPPED'], SHIPPED: ['DELIVERED'], DELIVERED: [], CANCELLED: [] }; return <div className="admin-table-wrap"><table><thead><tr><th>Pedido</th><th>Cliente</th><th>Data</th><th>Total</th><th>Status</th><th>Atualizar</th></tr></thead><tbody>{items?.map((order) => <tr key={order.id}><td>#{order.number}</td><td>{order.user?.name ?? '—'}</td><td>{new Date(order.createdAt).toLocaleDateString('pt-BR')}</td><td>{currency(order.total)}</td><td><Status value={order.status.replaceAll('_', ' ')} /></td><td><select aria-label={`Atualizar pedido ${order.number}`} value="" disabled={!transitions[order.status]?.length} onChange={(event) => event.target.value && onStatus(order, event.target.value)}><option value="">Alterar…</option>{(transitions[order.status] ?? []).map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>)}</select></td></tr>)}</tbody></table>{!items?.length && <p className="admin-empty">Ainda não há pedidos registrados.</p>}</div> }
