import { useMemo, useState } from 'react'
import './App.css'

const products = [
  { id: 1, name: 'Air Max Pulse', brand: 'Nike', price: 899.9, oldPrice: 1099.9, category: 'Masculino', badge: 'MAIS VENDIDO', color: 'sand', image: 'photo-1542291026-7eec264c27ff' },
  { id: 2, name: 'Ultraboost Light', brand: 'Adidas', price: 999.9, category: 'Feminino', badge: 'LANÇAMENTO', color: 'lilac', image: 'photo-1608231387042-66d1773070a5' },
  { id: 3, name: '574 Core', brand: 'New Balance', price: 649.9, oldPrice: 799.9, category: 'Masculino', badge: '−19%', color: 'blue', image: 'photo-1539185441755-769473a23570' },
  { id: 4, name: 'Chuck 70 Vintage', brand: 'Converse', price: 429.9, category: 'Unissex', badge: '', color: 'pink', image: 'photo-1495555961986-6d4c1ecb7be3' },
  { id: 5, name: 'Gel-Kayano 30', brand: 'ASICS', price: 899.9, oldPrice: 1049.9, category: 'Feminino', badge: '−14%', color: 'mint', image: 'photo-1552346154-21d32810aba3' },
  { id: 6, name: 'Classic Leather', brand: 'Reebok', price: 499.9, category: 'Masculino', badge: 'CLÁSSICO', color: 'cream', image: 'photo-1549298916-b41d501d3772' },
  { id: 7, name: 'Forum Low', brand: 'Adidas', price: 699.9, oldPrice: 799.9, category: 'Feminino', badge: 'OFERTA', color: 'orange', image: 'photo-1600185365483-26d7a4cc7519' },
  { id: 8, name: 'Air Force 1 ’07', brand: 'Nike', price: 799.9, category: 'Masculino', badge: 'FAVORITO', color: 'lavender', image: 'photo-1600269452121-4f2416e55c28' },
  { id: 9, name: '574 Platform', brand: 'New Balance', price: 729.9, category: 'Feminino', badge: 'NOVO', color: 'rose', image: 'photo-1551107696-a4b0c5a0d9a2' },
  { id: 10, name: 'Old Skool', brand: 'Vans', price: 449.9, oldPrice: 529.9, category: 'Unissex', badge: '−15%', color: 'sky', image: 'photo-1525966222134-fcfa99b8ae77' },
  { id: 11, name: 'Cloud 5', brand: 'On', price: 899.9, category: 'Masculino', badge: 'LANÇAMENTO', color: 'green', image: 'photo-1460353581641-37baddab0fa2' },
  { id: 12, name: 'Dunk Low Next Nature', brand: 'Nike', price: 749.9, category: 'Feminino', badge: 'EDIÇÃO ESPECIAL', color: 'yellow', image: 'photo-1556048219-bb6978360b84' },
]

const sections = [
  { id: 'mais-vendidos', title: 'Os queridinhos da vez', eyebrow: 'SUCESSO DE VENDAS', subtitle: 'Os pares que todo mundo está usando.', select: (p) => [1, 3, 5, 8, 10, 11].includes(p.id) },
  { id: 'lancamentos', title: 'Novos no pedaço', eyebrow: 'ACABARAM DE CHEGAR', subtitle: 'Novidades para dar um passo à frente.', select: (p) => [2, 4, 9, 11, 12, 7].includes(p.id) },
  { id: 'ofertas', title: 'Seu próximo par, com desconto', eyebrow: 'OPORTUNIDADE BOA', subtitle: 'Preços especiais por tempo limitado.', select: (p) => p.oldPrice },
  { id: 'masculinos', title: 'Feitos para ir mais longe', eyebrow: 'MASCULINO', subtitle: 'Conforto e atitude em cada passo.', select: (p) => p.category === 'Masculino' },
  { id: 'femininos', title: 'Seu ritmo, suas regras', eyebrow: 'FEMININO', subtitle: 'Modelos para acompanhar cada versão sua.', select: (p) => p.category === 'Feminino' },
]

const money = (value) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

function ProductCard({ product, onAdd, added }) {
  return (
    <article className="product-card">
      <div className={`product-image ${product.color}`}>
        <img src={`https://images.unsplash.com/${product.image}?auto=format&fit=crop&w=720&q=85`} alt={`${product.name} da ${product.brand}`} loading="lazy" />
        {product.badge && <span className="badge">{product.badge}</span>}
        <button className="favorite" aria-label={`Favoritar ${product.name}`} aria-pressed={product.favorite} onClick={() => product.onFavorite(product.id)}>{product.favorite ? '♥' : '♡'}</button>
      </div>
      <div className="product-info">
        <span className="brand">{product.brand}</span>
        <h3>{product.name}</h3>
        <p className="category-label">Tênis · {product.category}</p>
        <div className="price-row"><strong>{money(product.price)}</strong>{product.oldPrice && <del>{money(product.oldPrice)}</del>}</div>
        <button className={`add-button ${added ? 'added' : ''}`} onClick={() => onAdd(product.id)}>{added ? 'Adicionado ✓' : 'Adicionar à sacola'} <span>↗</span></button>
      </div>
    </article>
  )
}

function App() {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState('Todos')
  const [cart, setCart] = useState([])
  const [added, setAdded] = useState(null)
  const [favorites, setFavorites] = useState([])
  const [cartOpen, setCartOpen] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const filtered = useMemo(() => products.filter((p) => (active === 'Todos' || p.category === active) && `${p.name} ${p.brand}`.toLowerCase().includes(query.toLowerCase())), [active, query])
  const visibleProducts = (items) => items.map((product) => ({ ...product, favorite: favorites.includes(product.id), onFavorite: (id) => setFavorites((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]) }))
  const add = (id) => { setCart((items) => [...items, id]); setAdded(id); window.setTimeout(() => setAdded(null), 1300) }

  return <div className="store">
    <div className="announcement">FRETE GRÁTIS a partir de R$ 399 <span>·</span> 10% OFF na primeira compra com <b>BEMVINDO10</b></div>
    <header className="header">
      <a className="wordmark" href="#inicio" aria-label="Pedrada Calçados, início">pedrada<span>.</span><small>CALÇADOS</small></a>
      <nav className="main-nav"><a href="#mais-vendidos">Mais vendidos</a><a href="#lancamentos">Lançamentos</a><a href="#ofertas">Ofertas</a><a href="#masculinos">Masculino</a><a href="#femininos">Feminino</a></nav>
      <div className="header-actions"><label className="search"><span>⌕</span><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tênis..." aria-label="Buscar tênis" /></label><button className="bag" aria-label={`Abrir sacola, ${cart.length} itens`} onClick={() => setCartOpen(true)}>♧ <i>{cart.length}</i></button></div>
    </header>
    <main>
      <section className="hero" id="inicio">
        <div className="hero-copy"><span className="eyebrow light">PEDRADA CALÇADOS · ESTILO QUE MARCA</span><h1>Seu estilo<br />é pedrada<span>.</span></h1><p>Os pares certos para chegar com presença. Encontre o seu próximo favorito.</p><a className="hero-cta" href="#lancamentos">Ver lançamentos <span>↗</span></a><div className="hero-note"><span className="note-line" /> Escolha seu próximo par</div></div>
        <div className="hero-art"><img src="https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=1400&q=90" alt="Tênis vermelho esportivo em destaque" /><span className="hero-sticker">SEU<br />RITMO<br /><b>↗</b></span><span className="hero-index">01 / 04</span></div>
        <div className="hero-vertical">PEDRADA CALÇADOS — ESTILO QUE MARCA</div>
      </section>
      <div className="benefits"><div><span>✳</span><p><b>Frete grátis</b><small>acima de R$ 399</small></p></div><div><span>↺</span><p><b>Troca fácil</b><small>até 30 dias</small></p></div><div><span>♡</span><p><b>Compra segura</b><small>seus dados protegidos</small></p></div><div><span>◉</span><p><b>10% na primeira</b><small>use BEMVINDO10</small></p></div></div>
      <section className="catalog" id="catalogo"><div className="catalog-heading"><div><span className="eyebrow">ESCOLHA O SEU PRÓXIMO PAR</span><h2>Encontre seu passo<span>.</span></h2></div><div className="filters">{['Todos', 'Masculino', 'Feminino', 'Unissex'].map((item) => <button key={item} className={active === item ? 'active' : ''} onClick={() => setActive(item)}>{item}</button>)}</div></div>
        {query || active !== 'Todos' ? <section className="shelf search-results"><div className="shelf-heading"><div><span className="eyebrow">{query ? 'RESULTADOS DA BUSCA' : 'SUA SELEÇÃO'}</span><h2>{query ? `Resultados para “${query}”` : active}</h2></div><span className="shelf-count">{filtered.length} modelos <span>↗</span></span></div><div className="product-grid">{visibleProducts(filtered).map((p) => <ProductCard key={p.id} product={p} onAdd={add} added={added === p.id} />)}</div>{filtered.length === 0 && <p className="empty">Não encontramos esse modelo. Tente outra busca.</p>}</section> : sections.map((section) => <section className="shelf" id={section.id} key={section.id}><div className="shelf-heading"><div><span className="eyebrow">{section.eyebrow}</span><h2>{section.title}</h2><p>{section.subtitle}</p></div><a href="#catalogo" className="see-all">Ver coleção <span>↗</span></a></div><div className="product-grid">{visibleProducts(products.filter(section.select)).map((p) => <ProductCard key={p.id} product={p} onAdd={add} added={added === p.id} />)}</div></section>)}
      </section>
      <section className="editorial"><div className="editorial-photo"><img src="https://images.unsplash.com/photo-1520256862855-398228c41684?auto=format&fit=crop&w=1100&q=85" alt="Pessoa em movimento ao ar livre" /></div><div className="editorial-copy"><span className="eyebrow light">MOVIMENTO É DE DENTRO</span><h2>O mundo é<br />o seu caminho.</h2><p>O melhor destino é aquele que você escolhe. Encontre o par que acompanha a sua jornada, no seu tempo e do seu jeito.</p><a href="#catalogo" className="hero-cta">Encontre seu par <span>↗</span></a><span className="editorial-mark">p.</span></div></section>
      <section className="newsletter"><span className="eyebrow">NOVIDADES PEDRADA</span><h2>Novidades que dão vontade de sair.</h2><p>Lançamentos, ofertas e um mimo na primeira compra.</p><form onSubmit={(e) => { e.preventDefault(); setSubscribed(true); e.currentTarget.reset() }}><input type="email" required placeholder="Seu melhor e-mail" aria-label="Seu melhor e-mail" /><button>Quero receber <span>↗</span></button></form>{subscribed && <p className="success-message" role="status">E-mail cadastrado! Você receberá nossas novidades.</p>}</section>
    </main>
    <footer className="footer"><a className="wordmark" href="#inicio">pedrada<span>.</span><small>CALÇADOS</small></a><p>Estilo que marca. <span>© {new Date().getFullYear()} pedrada.calcados</span></p><div><a href="https://www.instagram.com/pedrada.calcados/" target="_blank" rel="noreferrer">Instagram ↗</a><a href="#catalogo">Ajuda ↗</a></div></footer>
    {cartOpen && <div className="overlay" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget) setCartOpen(false) }}><aside className="cart-drawer" role="dialog" aria-modal="true" aria-label="Sua sacola"><div className="cart-heading"><div><span className="eyebrow">PEDRADA CALÇADOS</span><h2>Sua sacola <span>({cart.length})</span></h2></div><button onClick={() => setCartOpen(false)} aria-label="Fechar sacola">×</button></div>{cart.length ? <><div className="cart-items">{cart.map((id, index) => { const product = products.find((item) => item.id === id); return <div className="cart-item" key={`${id}-${index}`}><img src={`https://images.unsplash.com/${product.image}?auto=format&fit=crop&w=180&q=75`} alt="" /><div><b>{product.brand}</b><span>{product.name}</span><strong>{money(product.price)}</strong></div><button aria-label={`Remover ${product.name}`} onClick={() => setCart((items) => items.filter((_, itemIndex) => itemIndex !== index))}>×</button></div> })}</div><div className="cart-total"><span>Subtotal</span><b>{money(cart.reduce((sum, id) => sum + products.find((p) => p.id === id).price, 0))}</b><small>Frete calculado na próxima etapa.</small><button onClick={() => alert('Para finalizar seu pedido, fale com a Pedrada Calçados pelo Instagram.')}>Continuar compra <span>↗</span></button></div></> : <div className="cart-empty"><span>♧</span><p>Sua sacola está esperando<br />pelo seu próximo par.</p><button onClick={() => setCartOpen(false)}>Continuar comprando</button></div>}</aside></div>}
  </div>
}

export default App
