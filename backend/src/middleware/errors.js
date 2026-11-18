export function notFound(req, res) {
  res.status(404).json({ error: 'Rota não encontrada.' })
}

export function errorHandler(error, req, res, next) {
  void next
  if (error?.name === 'MulterError') return res.status(400).json({ error: error.code === 'LIMIT_FILE_SIZE' ? 'Cada imagem pode ter até 6 MB.' : 'Limite de arquivos excedido.' })
  if (error?.name === 'ZodError') return res.status(400).json({ error: error.issues?.[0]?.message ?? 'Confira os dados informados.', details: error.issues })
  if (error?.code === 'P2002') return res.status(409).json({ error: 'Já existe um registro com esses dados.' })
  if (error?.code === 'P2025') return res.status(404).json({ error: 'Registro não encontrado.' })
  if (error?.status && error.status >= 400 && error.status < 500) return res.status(error.status).json({ error: error.message })
  if (process.env.NODE_ENV !== 'production') console.error(error)
  res.status(500).json({ error: 'Ocorreu um erro interno.' })
}
