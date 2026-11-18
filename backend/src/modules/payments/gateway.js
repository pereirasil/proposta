export const acceptedPaymentMethods = ['PIX', 'CREDIT_CARD']

export function paymentGatewayStatus() {
  return {
    configured: false,
    provider: null,
    methods: acceptedPaymentMethods,
    message: 'Nenhum adaptador de pagamento está configurado. Cadastre as credenciais do provedor e implemente seu adaptador antes de cobrar clientes.',
  }
}

export async function createPaymentIntent() {
  return { status: 'NOT_CONFIGURED', ...paymentGatewayStatus() }
}
