import { useEffect, useMemo, useState } from 'react'
import { authenticateCustomer, clearCart, createAddress, createOrder, getCustomerToken, listAddresses, listOrders, removeCartItem, setCartItemQuantity, setCustomerToken } from '../services/storeApi.js'
import { digitsOnly, isValidCpf } from '../utils/validation.js'

const money = (value) => Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const emptyAddress = { recipient: '', street: '', number: '', complement: '', reference: '', neighborhood: '', city: '', state: '', postalCode: '', isDefault: true }

export default function CartDrawer({ cart, setCart, onClose, cartError }) {
  const [view, setView] = useState('cart')
  const [token, setToken] = useState(getCustomerToken())
  const [addresses, setAddresses] = useState([])
  const [addressId, setAddressId] = useState('')
  const [address, setAddress] = useState(emptyAddress)
  const [newAddress, setNewAddress] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('PIX')
  const [authMode, setAuthMode] = useState('login')
  const [credentials, setCredentials] = useState({ name: '', email: '', cpf: '', phone: '', password: '', passwordConfirmation: '' })
  const [showPassword, setShowPassword] = useState(false)
  const [orders, setOrders] = useState([])
  const [result, setResult] = useState(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const subtotal = useMemo(() => cart.reduce((sum, item) => sum + item.price * item.quantity, 0), [cart])
  const shipping = subtotal >= 399 || subtotal === 0 ? 0 : 24.9
  const itemsCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  useEffect(() => {
    if (!token) return
    listAddresses().then((items) => { setAddresses(items); if (items[0]) setAddressId(items.find((item) => item.isDefault)?.id ?? items[0].id) }).catch((cause) => setError(cause.message))
  }, [token])

  async function remove(item) { setBusy(true); setError(''); try { setCart(await removeCartItem(item.cartItemId)) } catch (cause) { setError(cause.message) } finally { setBusy(false) } }
  async function changeQuantity(item, quantity) { setBusy(true); setError(''); try { setCart(quantity === 0 ? await removeCartItem(item.cartItemId) : await setCartItemQuantity(item.cartItemId, quantity)) } catch (cause) { setError(cause.message) } finally { setBusy(false) } }
  async function authenticate(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      const path = authMode === 'login' ? '/auth/login' : '/auth/register'
      if (authMode === 'register' && !isValidCpf(credentials.cpf)) throw new Error('Confira o CPF informado.')
      if (authMode === 'register' && digitsOnly(credentials.phone).length < 10) throw new Error('Informe um celular com DDD.')
      if (authMode === 'register' && credentials.password !== credentials.passwordConfirmation) throw new Error('As senhas não conferem.')
      const input = authMode === 'login' ? { email: credentials.email, password: credentials.password } : { ...credentials, cpf: digitsOnly(credentials.cpf), phone: digitsOnly(credentials.phone) }
      const response = await authenticateCustomer(path, input)
      setCustomerToken(response.token)
      if (response.user.role === 'ADMIN' || response.user.role === 'SUPER_ADMIN') { window.location.assign('/admin'); return }
      setToken(response.token); setView('checkout')
    } catch (cause) { setError(cause.message) } finally { setBusy(false) }
  }
  async function checkout(event) {
    event.preventDefault(); setBusy(true); setError('')
    try {
      let destination = addressId
      if (newAddress || !destination) {
        const saved = await createAddress({ ...address, postalCode: address.postalCode.replace(/\D/g, ''), isDefault: addresses.length === 0 || address.isDefault })
        destination = saved.id
        setAddresses((current) => [...current, saved]); setAddressId(saved.id); setNewAddress(false)
      }
      const response = await createOrder({ addressId: destination, paymentMethod, items: cart.map((item) => ({ variantId: item.variantId, quantity: item.quantity })) })
      setResult(response); setView('result')
      try { await clearCart(); setCart([]) } catch { setError('O pedido foi registrado, mas a sacola não foi limpa. Não confirme o mesmo pedido novamente; atualize a sacola antes de uma nova compra.') }
    } catch (cause) { setError(cause.message) } finally { setBusy(false) }
  }
  async function showOrders() { setBusy(true); setError(''); try { setOrders(await listOrders()); setView('orders') } catch (cause) { setError(cause.message) } finally { setBusy(false) } }

  return <div className="overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><aside className="cart-drawer checkout-drawer" role="dialog" aria-modal="true" aria-label={view === 'cart' ? 'Sua sacola' : 'Finalizar compra'}>
    <div className="cart-heading"><div><span className="eyebrow">PEDRADA CALÇADOS</span><h2>{view === 'cart' ? `Sua sacola (${itemsCount})` : view === 'checkout' ? 'Finalizar pedido' : view === 'orders' ? 'Meus pedidos' : 'Pedido registrado'}</h2></div><button onClick={onClose} aria-label="Fechar sacola">×</button></div>
    {(error || (view === 'cart' && cartError)) && <p className="checkout-error" role="alert">{error || cartError}</p>}
    {view === 'cart' && <>{cart.length ? <><div className="cart-items">{cart.map((item) => <div className="cart-item" key={item.cartItemId}><img src={item.image} alt={`${item.name}`} /><div><b>{item.brand}</b><span>{item.name}</span><small>{item.color} · tam. {item.size}</small><div className="cart-quantity"><button disabled={busy} onClick={() => changeQuantity(item, item.quantity - 1)} aria-label="Diminuir quantidade">−</button><span>{item.quantity}</span><button disabled={busy || item.quantity >= item.stock} onClick={() => changeQuantity(item, item.quantity + 1)} aria-label="Aumentar quantidade">+</button></div><strong>{money(item.price * item.quantity)}</strong></div><button disabled={busy} aria-label={`Remover ${item.name}`} onClick={() => remove(item)}>×</button></div>)}</div><div className="cart-total"><span>Subtotal</span><b>{money(subtotal)}</b><span>Frete</span><b>{shipping === 0 ? 'Grátis' : money(shipping)}</b><small>{subtotal >= 399 ? 'Frete grátis aplicado.' : 'Frete de R$ 24,90 nesta demonstração; cálculo por CEP depende de transportadora configurada.'}</small><button onClick={() => setView(token ? 'checkout' : 'auth')}>Continuar para entrega <span>↗</span></button>{token && <button className="orders-link" onClick={showOrders}>Acompanhar meus pedidos</button>}</div></> : <div className="cart-empty"><span>♧</span><p>Sua sacola está vazia.<br />Escolha seu próximo par na loja.</p><button onClick={onClose}>Continuar comprando</button>{token && <button className="orders-link" onClick={showOrders}>Ver meus pedidos</button>}</div>}</>}
    {view === 'auth' && <form className="checkout-form" onSubmit={authenticate}><p>Entre ou crie sua conta para salvar endereço e acompanhar o pedido.</p>{authMode === 'register' && <><label>Nome completo<input required minLength="2" autoComplete="name" value={credentials.name} onChange={(event) => setCredentials({ ...credentials, name: event.target.value })} /></label><label>CPF<input required inputMode="numeric" placeholder="000.000.000-00" autoComplete="off" value={credentials.cpf} onChange={(event) => setCredentials({ ...credentials, cpf: event.target.value })} /></label><label>Celular com DDD<input required type="tel" autoComplete="tel" placeholder="(11) 99999-9999" value={credentials.phone} onChange={(event) => setCredentials({ ...credentials, phone: event.target.value })} /></label></>}<label>E-mail<input type="email" required autoComplete="email" value={credentials.email} onChange={(event) => setCredentials({ ...credentials, email: event.target.value })} /></label><label>Senha<span className="cart-password-wrap"><input type={showPassword ? 'text' : 'password'} required minLength={authMode === 'register' ? 12 : 1} autoComplete={authMode === 'login' ? 'current-password' : 'new-password'} value={credentials.password} onChange={(event) => setCredentials({ ...credentials, password: event.target.value })} /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? 'Ocultar' : 'Mostrar'}</button></span></label>{authMode === 'register' && <label>Confirmar senha<input type={showPassword ? 'text' : 'password'} required minLength="12" autoComplete="new-password" value={credentials.passwordConfirmation} onChange={(event) => setCredentials({ ...credentials, passwordConfirmation: event.target.value })} /><small>Mínimo 12 caracteres, com maiúscula, minúscula, número e símbolo.</small></label>}{authMode === 'login' && <a className="cart-forgot-link" href="/account/forgot?return=checkout">Esqueci minha senha</a>}<button disabled={busy}>{busy ? 'Aguarde…' : authMode === 'login' ? 'Entrar' : 'Criar conta'}</button><button type="button" className="text-button" onClick={() => authMode === 'login' ? window.location.assign('/account/register?return=checkout') : setAuthMode('login')}>{authMode === 'login' ? 'Ainda não tenho conta' : 'Já tenho conta'}</button><a className="cart-forgot-link" href={`/account/${authMode === 'login' ? 'login' : 'register'}?return=checkout`}>Abrir página completa de acesso</a></form>}
    {view === 'checkout' && <form className="checkout-form" onSubmit={checkout}><h3>Endereço de entrega</h3>{addresses.length > 0 && !newAddress && <><label>Escolha um endereço<select required value={addressId} onChange={(event) => setAddressId(event.target.value)}>{addresses.map((item) => <option key={item.id} value={item.id}>{item.recipient} · {item.street}, {item.number} — {item.city}/{item.state}</option>)}</select></label><button type="button" className="text-button" onClick={() => { setNewAddress(true); setAddressId('') }}>Adicionar outro endereço</button></>}{(newAddress || addresses.length === 0) && <div className="address-fields">{[['recipient','Destinatário'],['postalCode','CEP'],['street','Rua'],['number','Número'],['complement','Complemento'],['neighborhood','Bairro'],['city','Cidade'],['state','UF'],['reference','Ponto de referência']].map(([key,label]) => <label key={key}>{label}<input required={!['complement','reference'].includes(key)} maxLength={key === 'state' ? 2 : undefined} autoComplete={key === 'postalCode' ? 'postal-code' : undefined} onBlur={key === 'postalCode' ? async () => { const cep = digitsOnly(address.postalCode); if (cep.length === 8) { try { const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`); const result = await response.json(); if (!result.erro) setAddress((current) => ({ ...current, street: result.logradouro || current.street, neighborhood: result.bairro || current.neighborhood, city: result.localidade || current.city, state: result.uf || current.state })) } catch { setError('Não foi possível consultar o CEP. Preencha o endereço manualmente.') } } } : undefined} value={address[key]} onChange={(event) => setAddress({ ...address, [key]: event.target.value })} /></label>)}</div>}<h3>Forma de pagamento</h3><label className="payment-choice"><input type="radio" name="payment" value="PIX" checked={paymentMethod === 'PIX'} onChange={(event) => setPaymentMethod(event.target.value)} /> PIX <small>Cobrança depende da configuração do gateway.</small></label><label className="payment-choice"><input type="radio" name="payment" value="CREDIT_CARD" checked={paymentMethod === 'CREDIT_CARD'} onChange={(event) => setPaymentMethod(event.target.value)} /> Cartão de crédito <small>Checkout seguro depende da configuração do gateway. Não informe dados do cartão nesta loja.</small></label><div className="checkout-summary"><span>Produtos</span><b>{money(subtotal)}</b><span>Frete</span><b>{shipping === 0 ? 'Grátis' : money(shipping)}</b><strong>Total</strong><strong>{money(subtotal + shipping)}</strong></div><button disabled={busy || !cart.length}>{busy ? 'Registrando pedido…' : 'Confirmar pedido'}</button><p className="gateway-notice">Sem gateway configurado, o pedido ficará aguardando pagamento e nenhuma cobrança será enviada.</p></form>}
    {view === 'orders' && <div className="customer-orders">{orders.length ? orders.map((order) => <article key={order.id}><div><b>Pedido {order.number}</b><span>{new Date(order.createdAt).toLocaleDateString('pt-BR')} · {order.status.replaceAll('_',' ')}</span></div><strong>{money(order.total)}</strong><small>{order.items.map((item) => `${item.productName} · ${item.size} × ${item.quantity}`).join(' / ')}</small></article>) : <p>Você ainda não tem pedidos.</p>}<button onClick={() => setView('cart')}>Voltar à sacola</button></div>}
    {view === 'result' && result && <div className="order-result"><span>✓</span><h3>Pedido {result.order.number} registrado</h3><p>Status: <b>{result.order.status.replaceAll('_',' ')}</b></p><p>{result.payment.message}</p><p className="gateway-notice">O registro do pedido foi salvo, mas a cobrança PIX/cartão não foi iniciada porque o gateway não está configurado.</p><button onClick={showOrders}>Acompanhar pedido</button><button className="text-button" onClick={onClose}>Voltar à loja</button></div>}
  </aside></div>
}
