import { useMemo, useState } from 'react'
import { ArrowRight, ArrowUpRight, Heart, Menu, Search, ShoppingBag, UserRound, X } from 'lucide-react'
import './App.css'

const storeName = 'PR Multimarcas'
const instagramUrl = 'https://www.instagram.com/prmultimarcasss_/'
const whatsappNumber = '5521965599792'
const whatsappLink = (message) => `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`

const categoryTiles = [
  { label: 'Tênis', image: 'photo-1542291026-7eec264c27ff', description: 'Do casual ao esportivo' },
  { label: 'Sapatos', image: 'photo-1495555961986-6d4c1ecb7be3', description: 'Clássicos com personalidade' },
  { label: 'Blusas', image: 'photo-1556821840-3a63f95609a7', description: 'Conforto para todo dia' },
]

const products = [
  { id: 1, name: 'Tênis Casual Street', category: 'Tênis', colors: ['#171717', '#f1eee8', '#77776e'], image: 'photo-1525966222134-fcfa99b8ae77', badge: 'MAIS PEDIDO' },
  { id: 2, name: 'Tênis Esportivo Runner', category: 'Tênis', colors: ['#1e2823', '#e6e1d8', '#252525'], image: 'photo-1542291026-7eec264c27ff', badge: 'DESTAQUE' },
  { id: 3, name: 'Tênis Lifestyle', category: 'Tênis', colors: ['#f4f0e8', '#252525', '#a79b8c'], image: 'photo-1495555961986-6d4c1ecb7be3', badge: '' },
  { id: 4, name: 'Tênis Street', category: 'Tênis', colors: ['#d5d0c6', '#202020'], image: 'photo-1552346154-21d32810aba3', badge: '' },
  { id: 5, name: 'Tênis Clássico', category: 'Tênis', colors: ['#171717', '#f1eee8'], image: 'photo-1525966222134-fcfa99b8ae77', badge: '' },
  { id: 6, name: 'Tênis Urban', category: 'Tênis', colors: ['#77776e', '#252525'], image: 'photo-1542291026-7eec264c27ff', badge: 'NOVO' },
  { id: 7, name: 'Tênis Performance', category: 'Tênis', colors: ['#252525', '#e6e1d8'], image: 'photo-1552346154-21d32810aba3', badge: '' },
  { id: 8, name: 'Tênis Casual Low', category: 'Tênis', colors: ['#f4f0e8', '#171717'], image: 'photo-1495555961986-6d4c1ecb7be3', badge: '' },
  { id: 9, name: 'Tênis Daily', category: 'Tênis', colors: ['#202020', '#d5d0c6'], image: 'photo-1525966222134-fcfa99b8ae77', badge: '' },
  { id: 10, name: 'Tênis Sport', category: 'Tênis', colors: ['#252525', '#f1eee8'], image: 'photo-1542291026-7eec264c27ff', badge: '' },
  { id: 11, name: 'Sapato Casual', category: 'Sapatos', colors: ['#171717', '#6b4b37'], image: 'photo-1531310197839-ccf54634509e', badge: 'CLÁSSICO' },
  { id: 12, name: 'Sapato Social', category: 'Sapatos', colors: ['#171717', '#654832'], image: 'photo-1614252235316-8c857d38b5f4', badge: '' },
  { id: 13, name: 'Mocassim Urbano', category: 'Sapatos', colors: ['#34271f', '#171717'], image: 'photo-1531310197839-ccf54634509e', badge: '' },
  { id: 14, name: 'Sapato Derby', category: 'Sapatos', colors: ['#171717', '#775b45'], image: 'photo-1531310197839-ccf54634509e', badge: '' },
  { id: 15, name: 'Sapato Oxford', category: 'Sapatos', colors: ['#171717', '#654832'], image: 'photo-1614252235316-8c857d38b5f4', badge: 'ELEGANTE' },
  { id: 16, name: 'Loafer Casual', category: 'Sapatos', colors: ['#34271f', '#171717'], image: 'photo-1531310197839-ccf54634509e', badge: '' },
  { id: 17, name: 'Sapato Couro', category: 'Sapatos', colors: ['#171717', '#775b45'], image: 'photo-1531310197839-ccf54634509e', badge: '' },
  { id: 18, name: 'Sapato Daily', category: 'Sapatos', colors: ['#252525', '#6b4b37'], image: 'photo-1614252235316-8c857d38b5f4', badge: '' },
  { id: 19, name: 'Mocassim Clássico', category: 'Sapatos', colors: ['#34271f', '#171717'], image: 'photo-1531310197839-ccf54634509e', badge: '' },
  { id: 20, name: 'Sapato Moderno', category: 'Sapatos', colors: ['#171717', '#775b45'], image: 'photo-1531310197839-ccf54634509e', badge: 'NOVO' },
  { id: 21, name: 'Camiseta Urban', category: 'Blusas', colors: ['#d5d0c6', '#202020', '#82918a'], image: 'photo-1521572163474-6864f9cf17ab', badge: 'MAIS PEDIDA' },
  { id: 22, name: 'Blusa Essencial', category: 'Blusas', colors: ['#f4f0e8', '#252525', '#687366'], image: 'photo-1556821840-3a63f95609a7', badge: '' },
  { id: 23, name: 'Camisa Polo', category: 'Blusas', colors: ['#171717', '#f1eee8', '#253b30'], image: 'photo-1625910513413-5fc45e2b3c5a', badge: 'NOVIDADE' },
  { id: 24, name: 'Moletom Casual', category: 'Blusas', colors: ['#1e2823', '#e6e1d8', '#252525'], image: 'photo-1578681994506-b8f463449011', badge: '' },
  { id: 25, name: 'Camiseta Básica', category: 'Blusas', colors: ['#171717', '#f1eee8', '#77776e'], image: 'photo-1521572163474-6864f9cf17ab', badge: '' },
  { id: 26, name: 'Blusa Street', category: 'Blusas', colors: ['#202020', '#d5d0c6'], image: 'photo-1556821840-3a63f95609a7', badge: '' },
  { id: 27, name: 'Polo Clássica', category: 'Blusas', colors: ['#253b30', '#171717'], image: 'photo-1625910513413-5fc45e2b3c5a', badge: '' },
  { id: 28, name: 'Moletom Urban', category: 'Blusas', colors: ['#252525', '#e6e1d8'], image: 'photo-1578681994506-b8f463449011', badge: 'CONFORTO' },
  { id: 29, name: 'Camiseta Oversized', category: 'Blusas', colors: ['#171717', '#82918a'], image: 'photo-1521572163474-6864f9cf17ab', badge: '' },
  { id: 30, name: 'Blusa Casual', category: 'Blusas', colors: ['#687366', '#f4f0e8'], image: 'photo-1556821840-3a63f95609a7', badge: '' },
]
const photo = (id, width = 900) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=85`

function ProductCard({ product, favorite, onFavorite, onSelect }) {
  return <article className="product-card">
    <button className="product-image" onClick={() => onSelect(product)} aria-label={`Ver ${product.name}`}><img src={photo(product.image, 700)} alt={`${product.name} PR Multimarcas`} loading="lazy" />{product.badge && <span className="badge">{product.badge}</span>}<span className="quick-view">Conhecer produto <ArrowUpRight size={15} /></span></button>
    <div className="product-info"><div className="product-title"><div><span className="brand">PR MULTIMARCAS</span><h3>{product.name}</h3></div><button className={`favorite ${favorite ? 'selected' : ''}`} onClick={() => onFavorite(product.id)} aria-label={`Favoritar ${product.name}`} aria-pressed={favorite}><Heart size={17} fill={favorite ? 'currentColor' : 'none'} /></button></div><p className="product-category">{product.category}</p><div className="product-bottom"><div className="swatches" aria-label={`${product.colors.length} cores disponíveis`}>{product.colors.map((color) => <span key={color} style={{ '--swatch': color }} />)}<small>+ cores</small></div><button className="product-open" onClick={() => onSelect(product)}>Ver opções <ArrowRight size={14} /></button></div><p className="price-note">Consulte opções e valores</p></div>
  </article>
}

function App() {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState('Todos')
  const [favorites, setFavorites] = useState([])
  const [cart, setCart] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [selectedColor, setSelectedColor] = useState('')
  const [selectedSize, setSelectedSize] = useState('')
  const [notice, setNotice] = useState('')
  const sizeOptions = selected?.category === 'Tênis' || selected?.category === 'Sapatos'
    ? ['34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44']
    : ['P', 'M', 'G', 'GG']
  const filtered = useMemo(() => products.filter((product) => (['Todos', 'Favoritos'].includes(active) || product.category === active) && `${product.name} ${product.category}`.toLowerCase().includes(query.toLowerCase())), [active, query])
  const addToCart = () => {
    if (!selectedColor || !selectedSize) { setNotice('Escolha uma cor e um tamanho para continuar.'); return }
    setCart((items) => [...items, { ...selected, color: selectedColor, size: selectedSize }])
    setNotice('Produto adicionado à sacola.')
    setSelected(null); setSelectedColor(''); setSelectedSize('')
  }
  const categories = ['Todos', 'Tênis', 'Sapatos', 'Blusas']
  const checkoutMessage = `Olá! Quero comprar:\n${cart.map((item) => `• ${item.name} — cor ${item.color}, tamanho ${item.size}`).join('\n')}\n\nVim pelo site da ${storeName}.`

  return <div className="store">
    <div className="announcement"><span>PR MULTIMARCAS</span><i /> A Black Friday começou <a href="#black-friday">Descubra a campanha <ArrowUpRight size={12} /></a></div>
    <header className="header"><button className="mobile-menu" aria-label="Menu"><Menu size={20} /></button><a className="wordmark" href="#inicio" aria-label="PR Multimarcas, início">PR<span>MULTIMARCAS</span></a><nav className="main-nav"><a href="#produtos">Tênis</a><a href="#produtos">Sapatos</a><a href="#produtos">Blusas</a><a href="#sobre">A loja</a></nav><div className="header-actions"><label className="search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar produtos" aria-label="Buscar produtos" /></label><a className="icon-action" href="#contato" aria-label="Contato"><UserRound size={19} /></a><button className="icon-action favorite-nav" onClick={() => setActive('Favoritos')} aria-label="Ver favoritos"><Heart size={19} /></button><button className="bag" onClick={() => setCartOpen(true)} aria-label={`Abrir sacola, ${cart.length} itens`}><ShoppingBag size={19} /><i>{cart.length}</i></button></div></header>
    <main>
      <section className="black-friday" id="black-friday"><div className="bf-spark" aria-hidden="true">✳</div><div className="bf-copy"><span className="bf-kicker">PR MULTIMARCAS APRESENTA</span><h1>COMEÇOU A<br /><strong>BLACK FRIDAY</strong></h1><p>Seu próximo look favorito está a um clique.</p><a href="#produtos" onClick={() => setActive('Todos')}>GARANTA SEUS FAVORITOS <ArrowRight size={16} /></a></div><div className="bf-stamp"><span>OFERTAS</span><b>POR<br />TEMPO<br />LIMITADO</b></div><div className="bf-foot">TÊNIS <i /> SAPATOS <i /> BLUSAS <i /> ESCOLHA O SEU</div></section>
      <section className="category-strip" aria-label="Comprar por categoria"><div className="category-intro"><span className="eyebrow">ESCOLHA SUA CATEGORIA</span><h2>Seu estilo começa<br />pela escolha certa.</h2></div>{categoryTiles.map((category) => <button key={category.label} className="category-tile" onClick={() => { setActive(category.label); document.getElementById('produtos')?.scrollIntoView({ behavior: 'smooth' }) }}><img src={photo(category.image, 560)} alt="" /><span className="category-tile-shade" /><span className="category-tile-copy"><b>{category.label}</b><small>{category.description}</small><i>Explorar <ArrowUpRight size={14} /></i></span></button>)}</section>
      <section className="catalog" id="produtos"><div className="section-heading"><div><span className="eyebrow">CURADORIA PR</span><h2>Escolhas que falam<br className="mobile-break" /> por você<span>.</span></h2><p>Peças selecionadas para atualizar seu visual.</p></div><a className="text-link" href={instagramUrl} target="_blank" rel="noreferrer">Ver novidades <ArrowUpRight size={15} /></a></div><nav className="filters" aria-label="Filtrar produtos">{categories.map((category) => <button key={category} className={active === category ? 'active' : ''} onClick={() => setActive(category)}>{category}</button>)}<button className={active === 'Favoritos' ? 'active' : ''} onClick={() => setActive('Favoritos')}>Favoritos</button></nav><div className="product-grid">{(active === 'Favoritos' ? filtered.filter((product) => favorites.includes(product.id)) : filtered).map((product) => <ProductCard key={product.id} product={product} favorite={favorites.includes(product.id)} onFavorite={(id) => setFavorites((items) => items.includes(id) ? items.filter((item) => item !== id) : [...items, id])} onSelect={(item) => { setSelected(item); setSelectedColor(''); setSelectedSize(''); setNotice('') }} />)}</div>{(active === 'Favoritos' ? favorites.length === 0 : filtered.length === 0) && <p className="empty">{active === 'Favoritos' ? 'Seus favoritos aparecerão aqui.' : 'Não encontramos resultados. Experimente outra busca.'}</p>}</section>
      <section className="instagram"><div className="instagram-heading"><div><span className="eyebrow">ACOMPANHE AS NOVIDADES</span><h2>PR Multimarcas<br />no Instagram<span>.</span></h2></div><a className="text-link" href={instagramUrl} target="_blank" rel="noreferrer">@prmultimarcasss_ <ArrowUpRight size={15} /></a></div><div className="instagram-grid">{['photo-1525966222134-fcfa99b8ae77','photo-1542291026-7eec264c27ff','photo-1521572163474-6864f9cf17ab','photo-1552346154-21d32810aba3'].map((image, index) => <a key={image} href={instagramUrl} target="_blank" rel="noreferrer" aria-label={`Ver PR Multimarcas no Instagram, imagem ${index + 1}`}><img src={photo(image, 480)} alt="Produtos de moda da PR Multimarcas" loading="lazy" /><span><ArrowUpRight size={17} /></span></a>)}</div></section>
      <section className="contact-band" id="contato"><div><span className="eyebrow light">TEM UMA DÚVIDA?</span><h2>Vamos conversar.</h2><p>Fale com a equipe PR Multimarcas sobre produtos, tamanhos e entrega.</p></div><a href={whatsappLink('Olá! Vim pelo site da PR Multimarcas e gostaria de atendimento.')} target="_blank" rel="noreferrer">Atendimento pelo WhatsApp <ArrowUpRight size={16} /></a></section>
    </main>
    <footer className="footer"><div className="footer-main"><div className="footer-brand"><a className="wordmark footer-logo" href="#inicio">PR<span>MULTIMARCAS</span></a><p>Seu estilo, do seu jeito.</p><a className="social-link" href={instagramUrl} target="_blank" rel="noreferrer">Instagram <ArrowUpRight size={14} /></a></div><div className="footer-column"><b>EXPLORE</b><a href="#produtos">Tênis</a><a href="#produtos">Sapatos</a><a href="#produtos">Blusas</a></div><div className="footer-column"><b>ATENDIMENTO</b><a href={whatsappLink('Olá! Vim pelo site da PR Multimarcas e gostaria de atendimento.')} target="_blank" rel="noreferrer">WhatsApp</a><a href={instagramUrl} target="_blank" rel="noreferrer">Instagram</a><a href="#contato">Fale conosco</a></div><div className="footer-column"><b>INFORMAÇÕES</b><a href="#contato">Entrega</a><a href="#contato">Trocas e devoluções</a><span>Consulte disponibilidade pelo WhatsApp.</span></div></div><div className="footer-bottom"><span>© {new Date().getFullYear()} PR Multimarcas</span><span>Moda e estilo para você.</span></div></footer>
    {notice && <div className="toast" role="status">{notice}<button onClick={() => setNotice('')} aria-label="Fechar aviso"><X size={15} /></button></div>}
    {cartOpen && <div className="overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false) }}><aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Sua sacola"><div className="cart-heading"><div><span className="eyebrow">PR MULTIMARCAS</span><h2>Sua sacola <span>({cart.length})</span></h2></div><button onClick={() => setCartOpen(false)} aria-label="Fechar sacola"><X size={20} /></button></div>{cart.length ? <><div className="cart-items">{cart.map((item, index) => <div className="cart-item" key={`${item.id}-${index}`}><img src={photo(item.image, 180)} alt="" /><div><b>{item.name}</b><span>{item.color} · tam. {item.size}</span><small>Valor a confirmar</small></div><button aria-label={`Remover ${item.name}`} onClick={() => setCart((items) => items.filter((_, itemIndex) => itemIndex !== index))}><X size={16} /></button></div>)}</div><div className="cart-total"><span>Subtotal</span><b>A confirmar</b><small>Consulte valores, disponibilidade e envio com nossa equipe.</small><a href={whatsappLink(checkoutMessage)} target="_blank" rel="noreferrer">Comprar pelo WhatsApp <ArrowUpRight size={15} /></a></div></> : <div className="cart-empty"><ShoppingBag size={30} /><p>Sua sacola está vazia.<br />Encontre seus próximos favoritos.</p><button onClick={() => setCartOpen(false)}>Continuar explorando</button></div>}</aside></div>}
    {selected && <div className="overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null) }}><section className="product-modal" role="dialog" aria-modal="true" aria-label={`Detalhes de ${selected.name}`}><button className="modal-close" onClick={() => setSelected(null)} aria-label="Fechar"><X size={19} /></button><div className="modal-product-visual" style={{ '--selected-color': selectedColor || '#ffffff' }}><img src={photo(selected.image, 900)} alt={`${selected.name}${selectedColor ? ` na cor selecionada ${selectedColor}` : ''}`} /><span className="color-preview" aria-hidden="true" /></div><div className="modal-info"><span className="eyebrow">PR MULTIMARCAS · {selected.category.toUpperCase()}</span><h2>{selected.name}</h2><p>Escolha suas opções e consulte disponibilidade e valores com nossa equipe.</p><fieldset><legend>Cor</legend><div className="modal-swatches">{selected.colors.map((color) => <button key={color} className={selectedColor === color ? 'chosen' : ''} onClick={() => setSelectedColor(color)} style={{ '--swatch': color }} aria-label={`Selecionar cor ${color}`} aria-pressed={selectedColor === color} />)}</div></fieldset>{selectedColor && <p className="selected-color-label">Cor selecionada <span style={{ '--swatch': selectedColor }} /> {selectedColor.toUpperCase()}</p>}<fieldset><legend>{selected.category === 'Tênis' || selected.category === 'Sapatos' ? 'Numeração' : 'Tamanho'}</legend><div className={`sizes ${sizeOptions.length > 4 ? 'numeric-sizes' : ''}`}>{sizeOptions.map((size) => <button key={size} className={selectedSize === size ? 'chosen' : ''} onClick={() => setSelectedSize(size)}>{size}</button>)}</div></fieldset><button className="modal-add" onClick={addToCart}>Adicionar à sacola <ArrowUpRight size={16} /></button><a className="modal-contact" href={whatsappLink(`Olá! Quero consultar disponibilidade e preço de ${selected.name} (${selected.category}).`)} target="_blank" rel="noreferrer">Consultar disponibilidade e preço pelo WhatsApp</a></div></section></div>}
  </div>
}

export default App
