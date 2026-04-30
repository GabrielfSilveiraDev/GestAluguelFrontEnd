import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { differenceInDays, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatCPF(cpf: string): string {
  const digits = cpf.replace(/\D/g, '')
  if (digits.length !== 11) return cpf
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

export function maskCPFInput(digits: string): string {
  const d = digits.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  try {
    const clean = dateStr.split('T')[0]
    const [year, month, day] = clean.split('-')
    return `${day}/${month}/${year}`
  } catch {
    return dateStr
  }
}

export function diasAteVencimento(dateStr: string): number {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const vencimento = parseISO(dateStr)
    return differenceInDays(vencimento, today)
  } catch {
    return Infinity
  }
}

export function getCurrentMonth(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()
  return `${month}/${year}`
}

export function extractApiError(error: unknown): string {
  if (error && typeof error === 'object' && 'response' in error) {
    const resp = (error as { response?: { data?: { mensagem?: string; erros?: string[] } } }).response
    if (resp?.data?.mensagem) return resp.data.mensagem
    if (resp?.data?.erros?.length) return resp.data.erros.join(', ')
  }
  return 'Ocorreu um erro inesperado.'
}

