import { env } from '../../config/env.js'

export const emailConfigured = Boolean(env.SMTP_HOST && env.SMTP_FROM && env.SMTP_TRANSPORT_MODULE)

export async function sendPasswordResetEmail(email, resetUrl) {
  if (!emailConfigured) throw new Error('SMTP não está configurado.')
  const { default: nodemailer } = await import(env.SMTP_TRANSPORT_MODULE)
  const transporter = nodemailer.createTransport({ host: env.SMTP_HOST, port: env.SMTP_PORT, secure: env.SMTP_SECURE,
    ...(env.SMTP_USER && env.SMTP_PASSWORD ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } } : {}) })
  await transporter.sendMail({
    from: env.SMTP_FROM,
    to: email,
    subject: 'Redefina sua senha · Pedrada Calçados',
    text: `Use este link para criar uma nova senha. Ele expira em 30 minutos: ${resetUrl}`,
    html: `<p>Recebemos um pedido para redefinir sua senha.</p><p><a href="${resetUrl}">Criar nova senha</a></p><p>O link expira em 30 minutos. Se você não pediu a redefinição, ignore esta mensagem.</p>`,
  })
}
