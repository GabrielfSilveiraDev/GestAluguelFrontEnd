import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { RespostaApi, ContratoInquilino } from '../types'

export function useContratosPorInquilino(inquilinoId: string) {
  return useQuery<ContratoInquilino[]>({
    queryKey: ['contratos', inquilinoId],
    queryFn: async () => {
      const res = await api.get<RespostaApi<ContratoInquilino[]>>(
        `/contratos/inquilino/${inquilinoId}`
      )
      return res.data.dados
    },
    enabled: !!inquilinoId,
  })
}

export function useUploadContrato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      inquilinoId,
      arquivo,
      descricao,
    }: {
      inquilinoId: string
      arquivo: File
      descricao?: string
    }) => {
      const formData = new FormData()
      formData.append('arquivo', arquivo)
      if (descricao) formData.append('descricao', descricao)
      return api.post<RespostaApi<ContratoInquilino>>(
        `/contratos/inquilino/${inquilinoId}/upload`,
        formData,
        { headers: { 'Content-Type': undefined } }
      )
    },
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['contratos', vars.inquilinoId] }),
  })
}

export function useAtualizarDescricaoContrato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      descricao,
    }: {
      id: string
      descricao: string
      inquilinoId: string
    }) => api.patch<RespostaApi<ContratoInquilino>>(`/contratos/${id}/descricao`, { descricao }),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['contratos', vars.inquilinoId] }),
  })
}

export function useExcluirContrato() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; inquilinoId: string }) =>
      api.delete(`/contratos/${id}`),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['contratos', vars.inquilinoId] }),
  })
}

export function getContratoDownloadUrl(id: string) {
  return `${api.defaults.baseURL}/contratos/${id}/download`
}


