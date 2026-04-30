import { useQuery } from '@tanstack/react-query'
import api from '../lib/api'
import type { RespostaApi, BalancoMensal, BalancoAnual } from '../types'

export function useBalancoMensal(ano: number, mes: number) {
  return useQuery<BalancoMensal>({
    queryKey: ['financeiro', 'mensal', ano, mes],
    queryFn: async () => {
      const res = await api.get<RespostaApi<BalancoMensal>>(
        `/financeiro/mensal/${ano}/${mes}`
      )
      return res.data.dados
    },
  })
}

export function useBalancoAnual(ano: number) {
  return useQuery<BalancoAnual>({
    queryKey: ['financeiro', 'anual', ano],
    queryFn: async () => {
      const res = await api.get<RespostaApi<BalancoAnual>>(`/financeiro/anual/${ano}`)
      return res.data.dados
    },
  })
}

