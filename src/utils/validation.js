export function isValidCpf(value) {
  const cpf = String(value ?? '').replace(/\D/g, '')
  if (cpf.length !== 11 || /^([0-9])\1{10}$/.test(cpf)) return false
  const digit = (length) => {
    const sum = cpf.slice(0, length).split('').reduce((total, number, index) => total + Number(number) * (length + 1 - index), 0)
    const remainder = (sum * 10) % 11
    return remainder === 10 ? 0 : remainder
  }
  return digit(9) === Number(cpf[9]) && digit(10) === Number(cpf[10])
}

export const digitsOnly = (value) => String(value ?? '').replace(/\D/g, '')
export function normalizeBrazilPhone(value) {
  const digits = digitsOnly(value)
  return digits.startsWith('55') && (digits.length === 12 || digits.length === 13) ? digits.slice(2) : digits
}
