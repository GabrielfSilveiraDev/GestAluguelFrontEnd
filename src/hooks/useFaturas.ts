import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { RespostaApi, Fatura } from '../types'

export function useFatura(id: string, enabled = true) {
  return useQuery<Fatura>({
    queryKey: ['faturas', 'byId', id],
    queryFn: async () => {
      const res = await api.get<RespostaApi<Fatura>>(`/faturas/${id}`)
      return res.data.dados
    },
    enabled: !!id && enabled,
  })
}

export function useFaturasPorStatus(status: 1 | 2 | 3) {
  return useQuery<Fatura[]>({
    queryKey: ['faturas', 'status', status],
    queryFn: async () => {
      const res = await api.get<RespostaApi<Fatura[]>>(`/faturas/status/${status}`)
      return res.data.dados
    },
  })
}

export function useFaturasPorInquilino(inquilinoId: string) {
  return useQuery<Fatura[]>({
    queryKey: ['faturas', 'inquilino', inquilinoId],
    queryFn: async () => {
      const res = await api.get<RespostaApi<Fatura[]>>(`/faturas/inquilino/${inquilinoId}`)
      return res.data.dados
    },
    enabled: !!inquilinoId,
  })
}

export function useFaturasVencidas() {
  return useQuery<Fatura[]>({
    queryKey: ['faturas', 'vencidas'],
    queryFn: async () => {
      const res = await api.get<RespostaApi<Fatura[]>>('/faturas/vencidas')
      return res.data.dados
    },
  })
}

export function useCriarFatura() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      inquilinoId: string
      mesReferencia: string
      valorAluguel: number
      dataLimitePagamento: string
      kwAtual?: number | null
      kwMesAnteriorManual?: number | null
      valorLuzManual?: number | null
      valorAguaManual?: number | null
      codigoPix?: string
    }) => api.post<RespostaApi<Fatura>>('/faturas', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faturas'] }),
  })
}

export function useRegistrarPagamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, dataPagamento }: { id: string; dataPagamento: string }) =>
      api.post<RespostaApi<Fatura>>(`/faturas/${id}/pagamento`, { dataPagamento }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faturas'] }),
  })
}

export function useAtualizarConsumo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      valorAgua,
      valorLuz,
    }: {
      id: string
      valorAgua: number
      valorLuz: number
    }) => api.patch<RespostaApi<Fatura>>(`/faturas/${id}/consumo`, { valorAgua, valorLuz }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faturas'] }),
  })
}

export function useAtualizarLeituraKw() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      kwAtual,
      kwhValorOverride,
    }: {
      id: string
      kwAtual: number
      kwhValorOverride?: number
    }) =>
      api.patch<RespostaApi<Fatura>>(`/faturas/${id}/leitura-kw`, { kwAtual, kwhValorOverride }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faturas'] }),
  })
}

export function useAtualizarPix() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, codigoPix }: { id: string; codigoPix: string }) =>
      api.patch<RespostaApi<Fatura>>(`/faturas/${id}/pix`, { codigoPix }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faturas'] }),
  })
}

export function useGerarPix() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      percentualSplit,
    }: {
      id: string
      percentualSplit?: number
    }) =>
      api.post<RespostaApi<{ cobrancaId: string; pixCopiaCola: string; qrCodeUrl: string; status: string; valor: number }>>(
        `/faturas/${id}/gerar-pix`,
        { percentualSplit }
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faturas'] }),
  })
}

export function useProcessarVencidas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<RespostaApi<number>>('/faturas/processar-vencidas'),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['faturas'] }),
  })
}
