import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { RespostaApi, GastoManutencao } from '../types'

export function useGastosPorApartamento(apartamentoId: string) {
  return useQuery<GastoManutencao[]>({
    queryKey: ['gastos', 'apartamento', apartamentoId],
    queryFn: async () => {
      const res = await api.get<RespostaApi<GastoManutencao[]>>(
        `/gastosmanutencao/apartamento/${apartamentoId}`
      )
      return res.data.dados
    },
    enabled: !!apartamentoId,
  })
}

export function useGastosPorMes(ano: number, mes: number) {
  return useQuery<GastoManutencao[]>({
    queryKey: ['gastos', 'mes', ano, mes],
    queryFn: async () => {
      const res = await api.get<RespostaApi<GastoManutencao[]>>(
        `/gastosmanutencao/mes/${ano}/${mes}`
      )
      return res.data.dados
    },
  })
}

export function useRegistrarGasto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      apartamentoId: string
      descricao: string
      valor: number
      data: string
      observacao?: string
    }) => api.post<RespostaApi<GastoManutencao>>('/gastosmanutencao', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gastos'] }),
  })
}

export function useEditarGasto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string
      descricao: string
      valor: number
      data: string
      observacao?: string
    }) => api.put<RespostaApi<GastoManutencao>>(`/gastosmanutencao/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gastos'] }),
  })
}

export function useExcluirGasto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/gastosmanutencao/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gastos'] }),
  })
}

