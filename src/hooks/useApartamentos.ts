import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { RespostaApi, Apartamento } from '../types'

export function useApartamentos() {
  return useQuery<Apartamento[]>({
    queryKey: ['apartamentos'],
    queryFn: async () => {
      const res = await api.get<RespostaApi<Apartamento[]>>('/apartamentos')
      return res.data.dados
    },
  })
}

export function useApartamentosDisponiveis() {
  return useQuery<Apartamento[]>({
    queryKey: ['apartamentos', 'disponiveis'],
    queryFn: async () => {
      const res = await api.get<RespostaApi<Apartamento[]>>('/apartamentos/disponiveis')
      return res.data.dados
    },
  })
}

export function useCriarApartamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { numero: string; bloco?: string }) =>
      api.post<RespostaApi<Apartamento>>('/apartamentos', data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apartamentos'] }),
  })
}

export function useEditarApartamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; numero: string; bloco?: string }) =>
      api.put<RespostaApi<Apartamento>>(`/apartamentos/${id}`, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apartamentos'] }),
  })
}

export function useExcluirApartamento() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/apartamentos/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['apartamentos'] }),
  })
}

