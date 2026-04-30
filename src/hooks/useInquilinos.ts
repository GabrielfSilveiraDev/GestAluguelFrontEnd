import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import api from '../lib/api'
import type { RespostaApi, Inquilino, Dependente } from '../types/index.ts'

export function useInquilinos() {
  return useQuery<Inquilino[]>({
    queryKey: ['inquilinos'],
    queryFn: async () => {
      const res = await api.get<RespostaApi<Inquilino[]>>('/inquilinos')
      return res.data.dados
    },
  })
}

export function useInquilino(id: string) {
  return useQuery<Inquilino>({
    queryKey: ['inquilinos', id],
    queryFn: async () => {
      const res = await api.get<RespostaApi<Inquilino>>(`/inquilinos/${id}`)
      return res.data.dados
    },
    enabled: !!id,
  })
}

export function useInquilinosContratoProximo(dias: number) {
  return useQuery<Inquilino[]>({
    queryKey: ['inquilinos', 'contrato-proximo', dias],
    queryFn: async () => {
      const res = await api.get<RespostaApi<Inquilino[]>>(
        `/inquilinos/contrato-proximo?dias=${dias}`
      )
      return res.data.dados
    },
  })
}

export function useCriarInquilino() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      nomeCompleto: string
      cpf: string
      dataNascimento: string
      rg: string
      orgaoEmissor: string
      telefone: string
      estadoCivil: string
      quantidadeMoradores: number
      dataEntrada: string
      dataVencimentoContrato: string
      valorAluguel: number
      garagem?: number
      apartamentoId: string
      diasAlertaVencimento: number[]
    }) => api.post<RespostaApi<Inquilino>>('/inquilinos', data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inquilinos'] })
      qc.invalidateQueries({ queryKey: ['apartamentos'] })
    },
  })
}

export function useEditarInquilino() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...data
    }: {
      id: string
      nomeCompleto: string
      quantidadeMoradores: number
      dataVencimentoContrato: string
      valorAluguel: number
      rg: string
      orgaoEmissor: string
      telefone: string
      estadoCivil: string
      garagem?: number
      diasAlertaVencimento: number[]
    }) => api.put<RespostaApi<Inquilino>>(`/inquilinos/${id}`, data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['inquilinos'] })
      qc.invalidateQueries({ queryKey: ['inquilinos', vars.id] })
    },
  })
}

export function useExcluirInquilino() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/inquilinos/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inquilinos'] })
      qc.invalidateQueries({ queryKey: ['apartamentos'] })
    },
  })
}

// — Dependentes —

export function useDependentes(inquilinoId: string) {
  return useQuery<Dependente[]>({
    queryKey: ['dependentes', inquilinoId],
    queryFn: async () => {
      const res = await api.get<RespostaApi<Dependente[]>>(
        `/inquilinos/${inquilinoId}/dependentes`
      )
      return res.data.dados
    },
    enabled: !!inquilinoId,
  })
}

export function useCriarDependente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      inquilinoId,
      ...data
    }: {
      inquilinoId: string
      nomeCompleto: string
      cpf: string
      rg?: string
      orgaoEmissor?: string
      dataNascimento?: string
      telefone?: string
      estadoCivil: string
    }) => api.post<RespostaApi<Dependente>>(`/inquilinos/${inquilinoId}/dependentes`, data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['dependentes', vars.inquilinoId] }),
  })
}

export function useEditarDependente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      inquilinoId,
      ...data
    }: {
      id: string
      inquilinoId: string
      nomeCompleto: string
      rg?: string
      orgaoEmissor?: string
      dataNascimento?: string
      telefone?: string
      estadoCivil: string
    }) => api.put<RespostaApi<Dependente>>(`/inquilinos/dependentes/${id}`, data),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['dependentes', vars.inquilinoId] }),
  })
}

export function useExcluirDependente() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: string; inquilinoId: string }) =>
      api.delete(`/inquilinos/dependentes/${vars.id}`),
    onSuccess: (_, vars) => qc.invalidateQueries({ queryKey: ['dependentes', vars.inquilinoId] }),
  })
}
