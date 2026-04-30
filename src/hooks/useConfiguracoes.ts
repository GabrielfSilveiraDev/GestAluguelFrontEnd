import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { RespostaApi, Configuracao } from '../types'

export function useConfiguracoes() {
  return useQuery<Configuracao>({
    queryKey: ['configuracoes'],
    queryFn: async () => {
      const res = await api.get<RespostaApi<Configuracao>>('/configuracoes')
      return res.data.dados
    },
  })
}

export function useAtualizarConfiguracoes() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { kwhValor: number; valorAgua: number }) =>
      api.put<RespostaApi<Configuracao>>('/configuracoes', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['configuracoes'] }),
  })
}

export function useCriarSubcontaAsaas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      nome: string
      email: string
      cpfCnpj: string
      tipoPessoa: 'FISICA' | 'JURIDICA'
      telefone?: string
      site?: string
    }) =>
      api.post<RespostaApi<{ id: string; walletId: string; nome: string; email: string; status: string }>>(
        '/configuracoes/asaas/subconta',
        data
      ),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['configuracoes'] }),
  })
}

