# Pedrada Tênis

Loja React/Vite preservada e ampliada com uma API Express, PostgreSQL e Prisma. A implementação foi organizada em etapas para permitir que o catálogo existente continue abrindo mesmo enquanto a API e o banco são configurados.

## Etapas implementadas

1. **Fundação:** React/Vite preservado, API Express modular, PostgreSQL/Prisma, migrations, seed, JWT/bcrypt, validação Zod, rate limiting, Helmet/CORS e autorização de funções no backend.
2. **Loja e administração:** catálogo da API com fallback informativo, carrinho persistido por sessão, seleção de tamanho/cor, checkout autenticado, gestão de endereços, pedidos e histórico. Painel em `/admin` com catálogo, produtos, categorias, clientes, estoque, pedidos e relatórios.
3. **Imagens:** upload administrativo restrito a JPEG/PNG/WebP, decodificação, correção de orientação e conversão para WebP otimizado. Os arquivos ficam em `backend/uploads` e precisam de armazenamento persistente no deploy.
4. **Pagamentos:** checkout oferece PIX e cartão. A camada de gateway e endpoint `/api/payments/readiness` informam o estado; sem adaptador/credenciais, nenhuma cobrança é iniciada e o pedido fica `PENDING_PAYMENT`. Não há formulário que colete número de cartão. Boleto não é aceito pela API; o enum legado permanece apenas para compatibilidade com registros/migrations antigos.
5. **Conta do cliente:** login e cadastro em `/account/login` e `/account/register`, CPF e celular validados, senha forte com bcrypt, área Minha Conta com perfil, endereços, favoritos, pedidos e troca de senha. No checkout, o carrinho é mantido por sessão e a autenticação retorna ao fluxo de entrega. Recuperação de senha usa token aleatório armazenado como hash, de uso único, com expiração de 30 minutos.

**Falta para produção:** implementar um adaptador real de gateway e webhooks de pagamento, configurar uma transportadora/cálculo real de CEP e armazenar uploads em serviço persistente. O preço de frete atual é uma regra explícita de demonstração (R$ 24,90 abaixo de R$ 399; grátis a partir de R$ 399). Sem gateway, não marque pedidos como pagos; o painel impede a confirmação manual.

## Requisitos

- Node.js 20 ou superior
- PostgreSQL 14 ou superior
- Credenciais e adaptador implementado de um provedor de pagamento para cobranças reais
- Para redefinição de senha por e-mail: instale/configure Nodemailer (ou um transporte compatível) e informe `SMTP_TRANSPORT_MODULE` (por exemplo, `nodemailer`), `SMTP_HOST`, `SMTP_FROM` e, conforme o provedor, `SMTP_USER`, `SMTP_PASSWORD`, `SMTP_PORT` e `SMTP_SECURE`. Sem esse transporte e credenciais, a página informa que a recuperação por e-mail não está habilitada.

## Configuração local

1. Copie `backend/.env.example` para `.env` na raiz e substitua os marcadores por dados reais do PostgreSQL. `DATABASE_URL` deve ter o formato `postgresql://usuario:senha@host:5432/nome_do_banco?schema=public`; não deixe `USUARIO`, `SENHA`, `HOST` ou `NOME_DO_BANCO` no valor. Defina `SUPER_ADMIN_NAME`, `SUPER_ADMIN_EMAIL`, uma senha exclusiva de pelo menos 14 caracteres e `JWT_SECRET` (mínimo de 32 caracteres aleatórios).
2. Instale dependências com `npm install`.
3. Gere o cliente Prisma e aplique as migrations: `npm run db:generate` e `npm run db:migrate` (local) ou `npm run db:deploy` (deploy).
4. Crie/atualize o super administrador com `npm run db:super-admin`. Para carregar os produtos de exemplo também, execute `npm run db:seed`.
5. Inicie frontend e API juntos com `npm run dev:all`, ou separadamente com `npm run dev:ui` e `npm run dev:api`, sempre a partir da raiz do projeto. `npm run dev:all` exige que o PostgreSQL esteja ativo e acessível; o frontend usa a porta 5173 estritamente para não mostrar uma porta alternativa que não corresponda ao `CLIENT_ORIGIN`.

Para provisionar ou trocar a senha do super administrador sem rodar o seed de produtos, configure `SUPER_ADMIN_NAME`, `SUPER_ADMIN_EMAIL` e `SUPER_ADMIN_PASSWORD` no `.env` (mínimo de 14 caracteres) e execute `npm run db:super-admin`. Esse comando invalida sessões anteriores quando atualiza uma conta existente e não imprime a senha.

A loja abre em `http://localhost:5173`; o painel fica em `http://localhost:5173/admin`; a API fica em `http://localhost:3333/api`. O endpoint `/api/health` informa a conexão com PostgreSQL. `CLIENT_ORIGIN` configura a origem permitida pelo CORS e `VITE_API_URL` pode substituir a URL pública da API.

## API disponível

- `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`; recuperação em `GET /api/auth/recovery/readiness`, `POST /api/auth/recovery/request` e `POST /api/auth/recovery/reset`
- `GET /api/products`, `GET /api/products/:id`, categorias e marcas; criação/edição/desativação exigem ADMIN ou SUPER_ADMIN
- `GET/POST/PATCH/DELETE /api/cart`, com sessão UUID mantida pelo navegador e estoque validado no servidor
- Perfil e senha em `/api/customers/profile` e `/api/customers/password`; CRUD de endereços em `/api/customers/addresses`, favoritos em `/api/customers/favorites`. O CEP é consultado pelo navegador no ViaCEP e pode ser preenchido manualmente se o serviço estiver indisponível.
- `POST /api/orders`, `GET /api/orders/mine`; lista e atualização administrativa em `/api/orders/admin`. O pedido preserva endereço e preço e reduz estoque em uma transação; cancelar pedido não pago devolve as unidades na mesma transação.
- `/api/admin/dashboard`, `/api/admin/customers`, `/api/admin/admins`, `/api/admin/reports`
- CRUD de produto/categoria, upload de imagens e estoque baixo/movimentações em `/api/products/admin` e `/api/admin/product-images`
- `GET /api/payments/readiness` informa honestamente se o gateway está conectado (atualmente `configured: false`).

Rotas administrativas verificam JWT e função no backend; clientes são redirecionados para Minha Conta. Senhas são armazenadas com bcrypt, tokens são invalidados quando a senha muda, e dados recebidos são validados com Zod. CPF é retornado apenas ao próprio cliente autenticado e não é incluído na listagem do painel. Headers de segurança, CORS e limites de requisição são aplicados.

## Verificações

Execute `npm test`, `npm run lint`, `npm run build`, `npm run db:generate` e `DATABASE_URL=... npx prisma validate --schema backend/prisma/schema.prisma`. Use `npm run db:deploy` para confirmar as migrations numa base de teste/deploy. Os testes automatizados cobrem cálculo de frete/descontos e transições de status; os fluxos integrados precisam de PostgreSQL ativo.

Fotos enviadas são reprocessadas pelo servidor (máximo 8 arquivos por envio, 6 MB cada, dimensões até 8000×8000 px) e servidas em `/uploads`. Configure volume persistente para `backend/uploads` antes de publicar.
