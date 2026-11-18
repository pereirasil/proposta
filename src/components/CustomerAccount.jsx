import { useEffect, useState } from 'react'
import { ArrowLeft, Eye, EyeOff, LogOut, MapPin, Package, ShieldCheck, UserRound, Heart, KeyRound } from 'lucide-react'
import { apiUrl } from '../services/products.js'
import { authenticateCustomer, changePassword, createAddress, deleteAddress, getCustomerToken, getProfile, listAddresses, listFavorites, listOrders, setCustomerToken, storeRequest, toggleFavorite, updateAddress, updateProfile } from '../services/storeApi.js'
import { digitsOnly, isValidCpf, normalizeBrazilPhone } from '../utils/validation.js'
import './customer-account.css'

const nav = [
  ['profile', 'Meus dados', UserRound],
  ['addresses', 'Meus endereços', MapPin],
  ['orders', 'Meus pedidos', Package],
  ['favorites', 'Meus favoritos', Heart],
  ['password', 'Alterar senha', KeyRound],
]
const addressBlank = { label: '', recipient: '', postalCode: '', street: '', number: '', complement: '', reference: '', neighborhood: '', city: '', state: '', isDefault: false }
const money = (value) => Number(value ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

export default function CustomerAccount() {
  const token = getCustomerToken()
  const path = window.location.pathname.replace(/\/$/, '') || '/account'
  const params = new URLSearchParams(window.location.search)
  const [page, setPage] = useState(path.endsWith('/register') ? 'register' : path.endsWith('/forgot') ? 'forgot' : path.endsWith('/reset') ? 'reset' : token ? 'account' : 'login')
  const [tab, setTab] = useState('profile')
  const [profile, setProfile] = useState(null)
  const [addresses, setAddresses] = useState([])
  const [orders, setOrders] = useState([])
  const [favorites, setFavorites] = useState([])
  const [auth, setAuth] = useState({ name: '', email: '', cpf: '', phone: '', password: '', passwordConfirmation: '', address: { postalCode: '', street: '', number: '', complement: '', neighborhood: '', city: '', state: '', reference: '' } })
  const [showPassword, setShowPassword] = useState(false)
  const [profileEdit, setProfileEdit] = useState({ name: '', email: '', phone: '' })
  const [addressForm, setAddressForm] = useState(null)
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', password: '', passwordConfirmation: '' })
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [recoveryConfigured, setRecoveryConfigured] = useState(null)
  const [resetPasswordForm, setResetPasswordForm] = useState({ password: '', passwordConfirmation: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  useEffect(() => {
    if (!token) return
    Promise.all([getProfile(), listAddresses(), listOrders(), listFavorites()]).then(([user, userAddresses, userOrders, userFavorites]) => {
      setProfile(user); setProfileEdit({ name: user.name, email: user.email, phone: user.phone ?? '' })
      setAddresses(userAddresses); setOrders(userOrders); setFavorites(userFavorites)
      if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') window.location.replace('/admin')
    }).catch((cause) => {
      if (cause.message.includes('Sessão') || cause.message.includes('Autenticação')) { setCustomerToken(''); setPage('login') }
      else setError(cause.message)
    })
  }, [token])

  useEffect(() => {
    if (page !== 'forgot') return
    fetch(`${apiUrl}/auth/recovery/readiness`).then((response) => response.json()).then((data) => setRecoveryConfigured(data.configured)).catch(() => setRecoveryConfigured(false))
  }, [page])

  function go(nextPage) {
    const routes = { login: '/account/login', register: '/account/register', forgot: '/account/forgot', reset: '/account/reset', account: '/account' }
    window.history.replaceState({}, '', routes[nextPage] ?? '/account')
    setPage(nextPage); setError(''); setNotice('')
  }

  async function submitAuth(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      if (page === 'register' && !isValidCpf(auth.cpf)) throw new Error('Confira o CPF informado.')
      if (page === 'register' && !/^\d{10,11}$/.test(normalizeBrazilPhone(auth.phone))) throw new Error('Informe um celular com DDD, por exemplo (11) 99999-9999.')
      if (page === 'register' && auth.password !== auth.passwordConfirmation) throw new Error('As senhas não conferem.')
      const registration = { ...auth, cpf: digitsOnly(auth.cpf), phone: normalizeBrazilPhone(auth.phone), address: { ...auth.address, postalCode: digitsOnly(auth.address.postalCode) } }
      const result = await authenticateCustomer(page === 'login' ? '/auth/login' : '/auth/register', page === 'login' ? { email: auth.email, password: auth.password } : registration)
      if (result.user.role === 'ADMIN' || result.user.role === 'SUPER_ADMIN') { setCustomerToken(result.token); window.location.assign('/admin'); return }
      setCustomerToken(result.token)
      if (params.get('return') === 'checkout' || sessionStorage.getItem('pedrada-return-to-checkout') === '1') { sessionStorage.removeItem('pedrada-return-to-checkout'); window.location.assign('/?checkout=1'); return }
      window.location.assign('/account')
    } catch (cause) { setError(cause.message) } finally { setBusy(false) }
  }

  async function requestReset(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      if (recoveryConfigured === false) throw new Error('O envio de e-mails ainda não está configurado neste ambiente. Fale com a loja para recuperar o acesso.')
      const result = await storeRequest('/auth/recovery/request', { method: 'POST', body: JSON.stringify({ email: recoveryEmail }) })
      setNotice(result.message)
    } catch (cause) { setError(cause.message) } finally { setBusy(false) }
  }

  async function resetPassword(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      const result = await storeRequest('/auth/recovery/reset', { method: 'POST', body: JSON.stringify({ token: params.get('token'), ...resetPasswordForm }) })
      setCustomerToken(result.token); setNotice('Senha redefinida. Sua conta está aberta.'); window.location.assign('/account')
    } catch (cause) { setError(cause.message) } finally { setBusy(false) }
  }

  async function saveProfile(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try { const result = await updateProfile({ ...profileEdit, phone: digitsOnly(profileEdit.phone) }); setProfile(result); setNotice('Seus dados foram atualizados.') }
    catch (cause) { setError(cause.message) } finally { setBusy(false) }
  }

  async function saveAddress(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      const payload = { ...addressForm, postalCode: digitsOnly(addressForm.postalCode) }
      const saved = addressForm.id ? await updateAddress(addressForm.id, payload) : await createAddress(payload)
      setAddresses((items) => addressForm.id ? items.map((item) => item.id === saved.id ? saved : saved.isDefault ? { ...item, isDefault: false } : item) : [...items.map((item) => saved.isDefault ? { ...item, isDefault: false } : item), saved])
      setAddressForm(null); setNotice('Endereço salvo.')
    } catch (cause) { setError(cause.message) } finally { setBusy(false) }
  }

  async function removeAddress(address) {
    if (!window.confirm(`Excluir o endereço ${address.street}, ${address.number}?`)) return
    try { await deleteAddress(address.id); setAddresses((items) => items.filter((item) => item.id !== address.id)); setNotice('Endereço removido.') }
    catch (cause) { setError(cause.message) }
  }

  async function saveNewPassword(event) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('')
    try {
      if (passwordForm.password !== passwordForm.passwordConfirmation) throw new Error('As senhas não conferem.')
      const result = await changePassword(passwordForm); setCustomerToken(result.token); setPasswordForm({ currentPassword: '', password: '', passwordConfirmation: '' }); setNotice('Senha alterada e outras sessões encerradas.')
    } catch (cause) { setError(cause.message) } finally { setBusy(false) }
  }

  async function removeFavorite(productId) {
    try { await toggleFavorite(productId); setFavorites((items) => items.filter((item) => item.productId !== productId)) }
    catch (cause) { setError(cause.message) }
  }

  async function lookupCep() {
    const cep = digitsOnly(addressForm?.postalCode)
    if (cep.length !== 8) return
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      if (!response.ok) throw new Error('Serviço de CEP temporariamente indisponível.')
      const result = await response.json()
      if (result.erro) throw new Error('CEP não encontrado. Preencha o endereço manualmente.')
      setAddressForm((current) => ({ ...current, street: result.logradouro || current.street, neighborhood: result.bairro || current.neighborhood, city: result.localidade || current.city, state: result.uf || current.state }))
    } catch (cause) { setError(cause.message) }
  }

  async function lookupRegisterCep() {
    const cep = digitsOnly(auth.address.postalCode)
    if (cep.length !== 8) return
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      if (!response.ok) throw new Error('Serviço de CEP temporariamente indisponível.')
      const result = await response.json()
      if (result.erro) throw new Error('CEP não encontrado. Preencha o endereço manualmente.')
      setAuth((current) => ({ ...current, address: { ...current.address, street: result.logradouro || current.address.street, neighborhood: result.bairro || current.address.neighborhood, city: result.localidade || current.address.city, state: result.uf || current.address.state } }))
      setError('')
    } catch (cause) { setError(cause.message) }
  }

  function logout() { setCustomerToken(''); window.location.assign('/') }

  if (page === 'login' || page === 'register') return <AuthLayout onBack={() => window.location.assign('/')}>
    <span className="account-eyebrow">PEDRADA CALÇADOS · SUA CONTA</span><h1>{page === 'login' ? 'Que bom ter você de volta.' : 'Crie sua conta Pedrada.'}</h1><p className="account-lead">{page === 'login' ? 'Entre para acompanhar seus pedidos e guardar seus endereços.' : 'Seus dados ficam protegidos e só você pode acessar sua conta.'}</p>
    <form className="account-form" onSubmit={submitAuth}>
      {page === 'register' && <>
        <Field label="Nome completo" required autoComplete="name" value={auth.name} onChange={(value) => setAuth({ ...auth, name: value })} />
        <div className="account-form-grid">
          <Field label="CPF" required inputMode="numeric" autoComplete="off" placeholder="000.000.000-00" value={auth.cpf} onChange={(value) => setAuth({ ...auth, cpf: value })} />
          <Field label="Celular com DDD" required inputMode="tel" autoComplete="tel" placeholder="(11) 99999-9999 ou +55..." value={auth.phone} onChange={(value) => setAuth({ ...auth, phone: value })} />
        </div>
      </>}
      <Field label="E-mail" type="email" required autoComplete="email" value={auth.email} onChange={(value) => setAuth({ ...auth, email: value })} />
      {page === 'register' && <section className="register-address-block">
        <div><h2>Endereço de entrega</h2><p>Informe onde podemos entregar seus pedidos.</p></div>
        <div className="account-form-grid">
          <Field label="CEP" required inputMode="numeric" autoComplete="postal-code" placeholder="00000-000" value={auth.address.postalCode} onChange={(value) => setAuth((current) => ({ ...current, address: { ...current.address, postalCode: value } }))} onBlur={lookupRegisterCep} />
          <Field label="Rua ou avenida" required autoComplete="address-line1" value={auth.address.street} onChange={(value) => setAuth((current) => ({ ...current, address: { ...current.address, street: value } }))} />
          <Field label="Número" required autoComplete="address-line2" value={auth.address.number} onChange={(value) => setAuth((current) => ({ ...current, address: { ...current.address, number: value } }))} />
          <Field label="Complemento (opcional)" value={auth.address.complement} onChange={(value) => setAuth((current) => ({ ...current, address: { ...current.address, complement: value } }))} />
          <Field label="Bairro" required autoComplete="address-level3" value={auth.address.neighborhood} onChange={(value) => setAuth((current) => ({ ...current, address: { ...current.address, neighborhood: value } }))} />
          <Field label="Cidade" required autoComplete="address-level2" value={auth.address.city} onChange={(value) => setAuth((current) => ({ ...current, address: { ...current.address, city: value } }))} />
          <Field label="Estado (UF)" required maxLength={2} autoCapitalize="characters" autoComplete="address-level1" placeholder="SP" value={auth.address.state} onChange={(value) => setAuth((current) => ({ ...current, address: { ...current.address, state: value.toUpperCase() } }))} />
          <Field label="Ponto de referência (opcional)" value={auth.address.reference} onChange={(value) => setAuth((current) => ({ ...current, address: { ...current.address, reference: value } }))} />
        </div>
      </section>}
      <PasswordField label="Senha" value={auth.password} visible={showPassword} toggle={() => setShowPassword((value) => !value)} onChange={(value) => setAuth({ ...auth, password: value })} autoComplete={page === 'login' ? 'current-password' : 'new-password'} required minLength={page === 'register' ? 12 : 1} />
      {page === 'register' && <PasswordField label="Confirmar senha" value={auth.passwordConfirmation} visible={showPassword} toggle={() => setShowPassword((value) => !value)} onChange={(value) => setAuth({ ...auth, passwordConfirmation: value })} autoComplete="new-password" required minLength={12} />}
      {error && <p className="account-error" role="alert">{error}</p>}
      <button className="account-primary" disabled={busy}>{busy ? 'Aguarde…' : page === 'login' ? 'Entrar na minha conta' : 'Criar minha conta'}</button>
    </form>
    {page === 'login' ? <div className="account-switch"><button onClick={() => go('forgot')}>Esqueci minha senha</button><span>Primeira vez por aqui? <button onClick={() => go('register')}>Criar uma conta</button></span></div> : <div className="account-switch"><span>Já tem conta? <button onClick={() => go('login')}>Entrar</button></span></div>}
  </AuthLayout>

  if (page === 'forgot' || page === 'reset') return <AuthLayout onBack={() => go('login')}><span className="account-eyebrow">SEGURANÇA PEDRADA</span><h1>{page === 'forgot' ? 'Vamos recuperar seu acesso.' : 'Escolha uma nova senha.'}</h1>{page === 'forgot' ? <><p className="account-lead">Informe o e-mail da sua conta. Enviaremos um link seguro que expira em 30 minutos.</p>{recoveryConfigured === false && <p className="account-info">O envio de e-mails ainda não está configurado neste ambiente. Fale com a loja para recuperar o acesso.</p>}<form className="account-form" onSubmit={requestReset}><Field label="E-mail" type="email" required value={recoveryEmail} onChange={setRecoveryEmail} />{error && <p className="account-error" role="alert">{error}</p>}{notice && <p className="account-success" role="status">{notice}</p>}<button className="account-primary" disabled={busy || recoveryConfigured === false}>{busy ? 'Enviando…' : 'Enviar link de recuperação'}</button></form></> : <><p className="account-lead">O link só pode ser usado uma vez e expira em 30 minutos.</p><form className="account-form" onSubmit={resetPassword}><PasswordField label="Nova senha" value={resetPasswordForm.password} visible={showPassword} toggle={() => setShowPassword((value) => !value)} onChange={(value) => setResetPasswordForm({ ...resetPasswordForm, password: value })} required minLength={12} autoComplete="new-password" /><PasswordField label="Confirmar nova senha" value={resetPasswordForm.passwordConfirmation} visible={showPassword} toggle={() => setShowPassword((value) => !value)} onChange={(value) => setResetPasswordForm({ ...resetPasswordForm, passwordConfirmation: value })} required minLength={12} autoComplete="new-password" />{error && <p className="account-error" role="alert">{error}</p>}<button className="account-primary" disabled={busy}>{busy ? 'Salvando…' : 'Redefinir senha'}</button></form></>}</AuthLayout>

  if (!token) return <AuthLayout onBack={() => window.location.assign('/')}><span className="account-eyebrow">SUA CONTA PEDRADA</span><h1>Entre para ver sua conta.</h1><p className="account-lead">Acesse seus dados, endereços, favoritos e pedidos em um só lugar.</p><button className="account-primary" onClick={() => go('login')}>Entrar</button><div className="account-switch"><span>Novo por aqui? <button onClick={() => go('register')}>Criar uma conta</button></span></div></AuthLayout>

  return <main className="customer-account"><header className="customer-account-header"><a className="wordmark" href="/">pedrada<span>.</span><small>CALÇADOS</small></a><a href="/" className="account-back"><ArrowLeft size={16} /> Voltar à loja</a></header><div className="customer-account-body"><aside className="customer-sidebar"><span className="account-eyebrow">MINHA CONTA</span><h1>Olá, {profile?.name?.split(' ')[0] ?? 'cliente'}.</h1><nav>{nav.map(([id, label, Icon]) => <button className={tab === id ? 'active' : ''} key={id} onClick={() => { setTab(id); setNotice(''); setError('') }}><Icon size={17} />{label}</button>)}</nav><button className="customer-logout" onClick={logout}><LogOut size={16} /> Sair da conta</button></aside><section className="customer-content">{error && <p className="account-error" role="alert">{error}</p>}{notice && <p className="account-success" role="status">{notice}</p>}
    {tab === 'profile' && <section className="account-panel"><div className="account-panel-heading"><div><h2>Meus dados</h2><p>Informações visíveis apenas para você.</p></div><ShieldCheck size={19} /></div><form className="account-form" onSubmit={saveProfile}><div className="account-form-grid"><Field label="Nome completo" required value={profileEdit.name} onChange={(value) => setProfileEdit({ ...profileEdit, name: value })} /><Field label="E-mail" type="email" required value={profileEdit.email} onChange={(value) => setProfileEdit({ ...profileEdit, email: value })} /><Field label="CPF" value={profile?.cpf ?? ''} disabled /><Field label="Celular com DDD" inputMode="tel" value={profileEdit.phone} onChange={(value) => setProfileEdit({ ...profileEdit, phone: value })} /></div><button className="account-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar dados'}</button></form></section>}
    {tab === 'addresses' && <section className="account-panel"><div className="account-panel-heading"><div><h2>Meus endereços</h2><p>Gerencie os locais de entrega da sua conta.</p></div><button className="account-secondary" onClick={() => setAddressForm({ ...addressBlank })}>Adicionar endereço +</button></div>{addresses.length ? <div className="account-address-list">{addresses.map((address) => <article key={address.id}><div><b>{address.label || address.recipient}{address.isDefault && <span className="default-address">PADRÃO</span>}</b><span>{address.recipient}</span><span>{address.street}, {address.number}{address.complement ? ` · ${address.complement}` : ''}</span>{address.reference && <span>Referência: {address.reference}</span>}<span>{address.neighborhood} · {address.city}/{address.state} · CEP {address.postalCode}</span></div><div><button onClick={() => setAddressForm({ ...address })}>Editar</button><button className="danger-link" onClick={() => removeAddress(address)}>Excluir</button></div></article>)}</div> : <EmptyState message="Você ainda não salvou endereços." action="Adicionar endereço" onClick={() => setAddressForm({ ...addressBlank })} />}</section>}
    {tab === 'orders' && <section className="account-panel"><div className="account-panel-heading"><div><h2>Meus pedidos</h2><p>Acompanhe pedidos e consulte seu histórico de compras.</p></div><Package size={19} /></div>{orders.length ? <div className="account-order-list">{orders.map((order) => <details key={order.id}><summary><span><b>{order.number}</b><small>{new Date(order.createdAt).toLocaleDateString('pt-BR')} · {order.status.replaceAll('_', ' ')}</small></span><strong>{money(order.total)}</strong></summary><div className="order-detail-lines">{order.items.map((item) => <p key={item.id}>{item.productName} · {item.color}, nº {item.size} × {item.quantity}<b>{money(Number(item.unitPrice) * item.quantity)}</b></p>)}<p>Subtotal<b>{money(order.subtotal)}</b></p><p>Desconto<b>{money(order.discount)}</b></p><p>Frete<b>{Number(order.shipping) ? money(order.shipping) : 'Grátis'}</b></p><p className="tracking-line">Status atual: {order.status.replaceAll('_', ' ')}</p><div className="order-timeline">{order.history.map((entry) => <span key={entry.id}>{new Date(entry.createdAt).toLocaleDateString('pt-BR')} · {entry.status.replaceAll('_', ' ')}{entry.note ? ` · ${entry.note}` : ''}</span>)}</div></div></details>)}</div> : <EmptyState message="Você ainda não tem pedidos." action="Ver tênis" onClick={() => window.location.assign('/')} />}</section>}
    {tab === 'favorites' && <section className="account-panel"><div className="account-panel-heading"><div><h2>Meus favoritos</h2><p>Os pares que você guardou para depois.</p></div><Heart size={19} /></div>{favorites.length ? <div className="favorite-list">{favorites.map(({ product }) => <article key={product.id}><img src={imageUrl(product.images[0]?.url)} alt={product.name} /><div><b>{product.brand.name}</b><span>{product.name}</span><strong>{money(product.salePrice ?? product.price)}</strong></div><button onClick={() => removeFavorite(product.id)}>Remover</button></article>)}</div> : <EmptyState message="Sua lista de favoritos está vazia." action="Explorar a loja" onClick={() => window.location.assign('/')} />}</section>}
    {tab === 'password' && <section className="account-panel"><div className="account-panel-heading"><div><h2>Alterar senha</h2><p>Use uma senha forte que você ainda não usa em outros serviços.</p></div><KeyRound size={19} /></div><form className="account-form password-change-form" onSubmit={saveNewPassword}><Field label="Senha atual" type="password" required autoComplete="current-password" value={passwordForm.currentPassword} onChange={(value) => setPasswordForm({ ...passwordForm, currentPassword: value })} /><Field label="Nova senha" type="password" required minLength={12} autoComplete="new-password" value={passwordForm.password} onChange={(value) => setPasswordForm({ ...passwordForm, password: value })} /><Field label="Confirmar nova senha" type="password" required minLength={12} autoComplete="new-password" value={passwordForm.passwordConfirmation} onChange={(value) => setPasswordForm({ ...passwordForm, passwordConfirmation: value })} /><PasswordRule /> <button className="account-primary" disabled={busy}>{busy ? 'Atualizando…' : 'Alterar senha'}</button></form></section>}
    </section></div>
    {addressForm && <AddressModal address={addressForm} setAddress={setAddressForm} onClose={() => setAddressForm(null)} onSubmit={saveAddress} busy={busy} onLookupCep={lookupCep} />}
  </main>
}

function AuthLayout({ children, onBack }) { return <main className="account-auth-page"><header><a className="wordmark" href="/">pedrada<span>.</span><small>CALÇADOS</small></a><button className="account-back" onClick={onBack}><ArrowLeft size={16} /> Voltar</button></header><div className="account-auth-card">{children}</div><footer>Seus dados são tratados com segurança pela Pedrada Calçados.</footer></main> }
function Field({ label, value, onChange, ...props }) { return <label className="account-field">{label}<input value={value} onChange={(event) => onChange?.(event.target.value)} {...props} />{props.disabled && label === 'CPF' && <small>Para corrigir seu CPF, fale com o atendimento.</small>}</label> }
function PasswordField({ label, value, onChange, visible, toggle, ...props }) { return <label className="account-field">{label}<span className="password-input-wrap"><input type={visible ? 'text' : 'password'} value={value} onChange={(event) => onChange(event.target.value)} {...props} /><button type="button" onClick={toggle} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}>{visible ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>{props.minLength === 12 && <small>Mínimo 12 caracteres, com maiúscula, minúscula, número e símbolo.</small>}</label> }
function PasswordRule() { return <p className="password-rule">Use ao menos 12 caracteres, com letra maiúscula, minúscula, número e símbolo.</p> }
function EmptyState({ message, action, onClick }) { return <div className="account-empty"><p>{message}</p><button className="account-secondary" onClick={onClick}>{action}</button></div> }
function imageUrl(url) { return url?.startsWith('/') ? `${apiUrl.replace(/\/api\/?$/, '')}${url}` : url ?? '' }
function AddressModal({ address, setAddress, onClose, onSubmit, busy, onLookupCep }) { return <div className="account-modal-shade" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}><form className="account-address-modal" onSubmit={onSubmit}><header><h2>{address.id ? 'Editar endereço' : 'Adicionar endereço'}</h2><button type="button" onClick={onClose} aria-label="Fechar">×</button></header><div className="account-form-grid">{[['label','Apelido','Ex.: Casa'],['recipient','Destinatário','Nome de quem recebe'],['postalCode','CEP','00000-000'],['street','Rua ou avenida',''],['number','Número',''],['complement','Complemento',''],['neighborhood','Bairro',''],['city','Cidade',''],['state','Estado (UF)',''],['reference','Ponto de referência (opcional)','']].map(([key,label,placeholder]) => <label className={`account-field ${['street','reference'].includes(key) ? 'account-wide-field' : ''}`} key={key}>{label}<input required={!['label','complement','reference'].includes(key)} maxLength={key === 'state' ? 2 : undefined} inputMode={key === 'postalCode' ? 'numeric' : undefined} autoComplete={key === 'postalCode' ? 'postal-code' : undefined} placeholder={placeholder} value={address[key] ?? ''} onBlur={key === 'postalCode' ? onLookupCep : undefined} onChange={(event) => setAddress({ ...address, [key]: event.target.value })} /></label>)}</div><label className="address-default"><input type="checkbox" checked={Boolean(address.isDefault)} onChange={(event) => setAddress({ ...address, isDefault: event.target.checked })} /> Definir como endereço padrão</label><footer><button type="button" className="account-secondary" onClick={onClose}>Cancelar</button><button className="account-primary" disabled={busy}>{busy ? 'Salvando…' : 'Salvar endereço'}</button></footer></form></div> }
