import { useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import {
  ArrowLeft, Pencil, User, Home, Calendar, Users, DollarSign,
  Plus, Trash2, Upload, Download, FileText, Car,
} from 'lucide-react'
import { NumericFormat } from 'react-number-format'
import { useInquilino, useEditarInquilino, useDependentes, useCriarDependente, useExcluirDependente } from '../hooks/useInquilinos'
import { useFaturasPorInquilino } from '../hooks/useFaturas'
import { useApartamentos } from '../hooks/useApartamentos'
import { useContratosPorInquilino, useUploadContrato, useExcluirContrato, getContratoDownloadUrl } from '../hooks/useContratos'
import { formatCurrency, formatCPF, formatDate, diasAteVencimento, extractApiError } from '../lib/utils'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { TableSkeleton } from '../components/ui/TableSkeleton'
import type { Dependente } from '../types'

const ESTADO_CIVIL = [
  { value: 1, label: 'Solteiro' },
  { value: 2, label: 'Casado' },
  { value: 3, label: 'Divorciado' },
  { value: 4, label: 'Viúvo' },
  { value: 5, label: 'Uniao Estavel' },
]

const editarSchema = z.object({
  nomeCompleto: z.string().min(3, 'Nome muito curto'),
  quantidadeMoradores: z.coerce.number().int().min(1, 'Minimo 1 morador'),
  dataVencimentoContrato: z.string().min(1, 'Obrigatorio'),
  valorAluguel: z.coerce.number().positive('Deve ser maior que zero'),
  garagem: z.coerce.number().min(0).optional(),
  diasAlertaVencimento: z.array(z.number()).optional().default([]),
})

const dependenteSchema = z.object({
  nomeCompleto: z.string().min(3, 'Nome muito curto'),
  cpf: z.string().length(11, 'CPF deve ter 11 digitos'),
  rg: z.string().optional(),
  orgaoEmissor: z.string().optional(),
  dataNascimento: z.string().optional(),
  telefone: z.string().optional(),
  estadoCivil: z.coerce.number().int().min(1).max(5),
})

type EditarFormData = z.infer<typeof editarSchema>
type DependenteFormData = z.infer<typeof dependenteSchema>

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1E3A5F] transition-colors'

function getStatusBadge(status: string, statusDescricao: string) {
  if (status === 'Pago') return <Badge variant="success">{statusDescricao}</Badge>
  if (status === 'Atrasado') return <Badge variant="danger">{statusDescricao}</Badge>
  return <Badge variant="neutral">{statusDescricao}</Badge>
}

export function InquilinoDetalhe() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [showEdit, setShowEdit] = useState(false)
  const [showAddDep, setShowAddDep] = useState(false)
  const [deleteDep, setDeleteDep] = useState<Dependente | null>(null)
  const [activeTab, setActiveTab] = useState<'faturas' | 'dependentes' | 'contratos'>('faturas')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploadDescricao, setUploadDescricao] = useState('')

  const { data: inquilino, isLoading: loadingInq } = useInquilino(id!)
  const { data: faturas, isLoading: loadingFaturas } = useFaturasPorInquilino(id!)
  const { data: apartamentos } = useApartamentos()
  const { data: dependentes, isLoading: loadingDeps } = useDependentes(id!)
  const { data: contratos, isLoading: loadingContratos } = useContratosPorInquilino(id!)
  const editar = useEditarInquilino()
  const criarDep = useCriarDependente()
  const excluirDep = useExcluirDependente()
  const uploadContrato = useUploadContrato()
  const excluirContrato = useExcluirContrato()

  const apt = apartamentos?.find((a) => a.id === inquilino?.apartamentoId)

  const {
    register, handleSubmit, control, setValue, watch, formState: { errors }, reset,
  } = useForm<EditarFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editarSchema) as any,
  })

  const {
    register: regDep, handleSubmit: handleDep, formState: { errors: errDep }, reset: resetDep,
    setValue: setDepVal, watch: watchDep,
  } = useForm<DependenteFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(dependenteSchema) as any,
    defaultValues: { estadoCivil: 1 },
  })

  const alertDias = watch('diasAlertaVencimento') ?? []
  const [cpfDepDisplay, setCpfDepDisplay] = useState('')

  function openEdit() {
    if (!inquilino) return
    reset({
      nomeCompleto: inquilino.nomeCompleto,
      quantidadeMoradores: inquilino.quantidadeMoradores,
      dataVencimentoContrato: inquilino.dataVencimentoContrato,
      valorAluguel: inquilino.valorAluguel,
      garagem: inquilino.garagem ?? 0,
      diasAlertaVencimento: inquilino.diasAlertaVencimento ?? [],
    })
    setShowEdit(true)
  }

  async function onSubmit(data: EditarFormData) {
    try {
      const res = await editar.mutateAsync({ id: id!, ...data })
      toast.success(res.data.mensagem || 'Inquilino atualizado.')
      setShowEdit(false)
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  async function onSubmitDep(data: DependenteFormData) {
    try {
      await criarDep.mutateAsync({ inquilinoId: id!, ...data })
      toast.success('Dependente adicionado.')
      resetDep()
      setCpfDepDisplay('')
      setShowAddDep(false)
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  async function handleDeleteDep() {
    if (!deleteDep) return
    try {
      await excluirDep.mutateAsync({ id: deleteDep.id, inquilinoId: id! })
      toast.success('Dependente removido.')
      setDeleteDep(null)
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  async function handleUploadContrato(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await uploadContrato.mutateAsync({ inquilinoId: id!, arquivo: file, descricao: uploadDescricao || undefined })
      toast.success('Contrato enviado com sucesso.')
      setUploadDescricao('')
      if (fileInputRef.current) fileInputRef.current.value = ''
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  async function handleExcluirContrato(contratoId: string) {
    try {
      await excluirContrato.mutateAsync({ id: contratoId, inquilinoId: id! })
      toast.success('Contrato removido.')
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  if (loadingInq) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-48 bg-gray-200 rounded-xl" />
      </div>
    )
  }

  if (!inquilino) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Inquilino nao encontrado.</p>
        <Button className="mt-4" onClick={() => navigate('/inquilinos')}>Voltar</Button>
      </div>
    )
  }

  const diasVenc = diasAteVencimento(inquilino.dataVencimentoContrato)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/inquilinos')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar para Inquilinos
        </button>
        <Button size="sm" onClick={openEdit}>
          <Pencil className="w-4 h-4" />
          Editar
        </Button>
      </div>

      {/* Details Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 bg-[#1E3A5F]/10 rounded-xl flex items-center justify-center shrink-0">
            <User className="w-7 h-7 text-[#1E3A5F]" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{inquilino.nomeCompleto}</h2>
            <p className="text-sm text-gray-500 mt-0.5">CPF: {formatCPF(inquilino.cpf)}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="flex items-start gap-2">
            <Home className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Apartamento</p>
              <p className="text-sm font-semibold text-gray-900">
                {apt ? `${apt.numero}${apt.bloco ? ` — Bl. ${apt.bloco}` : ''}` : '—'}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Moradores</p>
              <p className="text-sm font-semibold text-gray-900">{inquilino.quantidadeMoradores}</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <DollarSign className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Aluguel</p>
              <p className="text-sm font-semibold text-gray-900">{formatCurrency(inquilino.valorAluguel)}</p>
            </div>
          </div>
          {inquilino.garagem > 0 && (
            <div className="flex items-start gap-2">
              <Car className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Garagem</p>
                <p className="text-sm font-semibold text-gray-900">{formatCurrency(inquilino.garagem)}</p>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2">
            <Calendar className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs text-gray-500">Venc. Contrato</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <p className="text-sm font-semibold text-gray-900">{formatDate(inquilino.dataVencimentoContrato)}</p>
                {diasVenc <= 30 && <Badge variant="danger">{diasVenc}d</Badge>}
                {diasVenc > 30 && diasVenc <= 60 && <Badge variant="warning">{diasVenc}d</Badge>}
                {diasVenc > 60 && diasVenc <= 90 && <Badge variant="yellow">{diasVenc}d</Badge>}
              </div>
            </div>
          </div>
        </div>

        {(inquilino.diasAlertaVencimento?.length ?? 0) > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-500 mb-1">Alertas configurados</p>
            <div className="flex gap-2">
              {inquilino.diasAlertaVencimento.map((d) => (
                <span key={d} className="inline-flex px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full font-medium">
                  {d} dias
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit">
        {(['faturas', 'dependentes', 'contratos'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors capitalize ${
              activeTab === tab ? 'bg-white text-[#1E3A5F] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'faturas' ? 'Faturas' : tab === 'dependentes' ? 'Dependentes' : 'Contratos'}
          </button>
        ))}
      </div>

      {/* Tab: Faturas */}
      {activeTab === 'faturas' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-base font-semibold text-gray-900">Historico de Faturas</h3>
          </div>
          {loadingFaturas ? (
            <TableSkeleton rows={4} cols={7} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100 bg-gray-50/60">
                    <th className="px-5 py-3">Mes Ref.</th>
                    <th className="px-5 py-3">Aluguel</th>
                    <th className="px-5 py-3">Agua</th>
                    <th className="px-5 py-3">Luz</th>
                    <th className="px-5 py-3">Total</th>
                    <th className="px-5 py-3">Vencimento</th>
                    <th className="px-5 py-3">Pagamento</th>
                    <th className="px-5 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(!faturas || faturas.length === 0) ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-8 text-center text-sm text-gray-400">
                        Nenhuma fatura encontrada
                      </td>
                    </tr>
                  ) : (
                    faturas.map((f) => (
                      <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-5 py-3 text-sm font-medium text-gray-900">{f.mesReferencia}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{formatCurrency(f.valorAluguel)}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{formatCurrency(f.valorAgua)}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{formatCurrency(f.valorLuz)}</td>
                        <td className="px-5 py-3 text-sm font-semibold text-gray-900">{formatCurrency(f.valorTotal)}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{formatDate(f.dataLimitePagamento)}</td>
                        <td className="px-5 py-3 text-sm text-gray-600">{formatDate(f.dataPagamento)}</td>
                        <td className="px-5 py-3">{getStatusBadge(f.status, f.statusDescricao)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Dependentes */}
      {activeTab === 'dependentes' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Dependentes / Moradores</h3>
            <Button size="sm" onClick={() => setShowAddDep(true)}>
              <Plus className="w-4 h-4" />
              Adicionar
            </Button>
          </div>
          {loadingDeps ? (
            <TableSkeleton rows={3} cols={5} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100 bg-gray-50/60">
                    <th className="px-5 py-3">Nome</th>
                    <th className="px-5 py-3">CPF</th>
                    <th className="px-5 py-3">Nascimento</th>
                    <th className="px-5 py-3">Telefone</th>
                    <th className="px-5 py-3">Estado Civil</th>
                    <th className="px-5 py-3 text-right">Acao</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(!dependentes || dependentes.length === 0) ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-sm text-gray-400">
                        Nenhum dependente cadastrado
                      </td>
                    </tr>
                  ) : dependentes.map((dep) => (
                    <tr key={dep.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3 text-sm font-medium text-gray-900">{dep.nomeCompleto}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{formatCPF(dep.cpf)}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{formatDate(dep.dataNascimento)}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{dep.telefone ?? '—'}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{dep.estadoCivilDescricao}</td>
                      <td className="px-5 py-3 text-right">
                        <button onClick={() => setDeleteDep(dep)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Tab: Contratos */}
      {activeTab === 'contratos' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">Contratos</h3>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Descricao (opcional)"
                value={uploadDescricao}
                onChange={(e) => setUploadDescricao(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm w-44 focus:outline-none focus:border-[#1E3A5F]"
              />
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
                onChange={handleUploadContrato}
              />
              <Button size="sm" isLoading={uploadContrato.isPending} onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4" />
                Upload
              </Button>
            </div>
          </div>
          {loadingContratos ? (
            <TableSkeleton rows={3} cols={4} />
          ) : (
            <div className="divide-y divide-gray-50">
              {(!contratos || contratos.length === 0) ? (
                <p className="px-5 py-8 text-center text-sm text-gray-400">Nenhum contrato enviado</p>
              ) : contratos.map((c) => (
                <div key={c.id} className="px-5 py-3.5 flex items-center gap-3 hover:bg-gray-50/50">
                  <FileText className="w-5 h-5 text-gray-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.nomeOriginalArquivo}</p>
                    <p className="text-xs text-gray-400">{c.tamanhoFormatado} · {formatDate(c.criadoEm)}{c.descricao ? ` · ${c.descricao}` : ''}</p>
                  </div>
                  <a
                    href={getContratoDownloadUrl(c.id)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => handleExcluirContrato(c.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <Modal isOpen={showEdit} onClose={() => setShowEdit(false)} title="Editar Inquilino" size="lg">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo</label>
            <input {...register('nomeCompleto')} className={inputCls} />
            {errors.nomeCompleto && <p className="text-red-500 text-xs mt-1">{errors.nomeCompleto.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">No de Moradores</label>
              <input {...register('quantidadeMoradores')} type="number" min={1} className={inputCls} />
              {errors.quantidadeMoradores && <p className="text-red-500 text-xs mt-1">{errors.quantidadeMoradores.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Vencimento do Contrato</label>
              <input {...register('dataVencimentoContrato')} type="date" className={inputCls} />
              {errors.dataVencimentoContrato && <p className="text-red-500 text-xs mt-1">{errors.dataVencimentoContrato.message}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor do Aluguel</label>
              <Controller
                name="valorAluguel"
                control={control}
                render={({ field }) => (
                  <NumericFormat
                    thousandSeparator="." decimalSeparator="," prefix="R$ "
                    decimalScale={2} fixedDecimalScale className={inputCls}
                    value={field.value}
                    onValueChange={({ floatValue }) => field.onChange(floatValue ?? 0)}
                  />
                )}
              />
              {errors.valorAluguel && <p className="text-red-500 text-xs mt-1">{errors.valorAluguel.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Garagem (R$)</label>
              <Controller
                name="garagem"
                control={control}
                render={({ field }) => (
                  <NumericFormat
                    thousandSeparator="." decimalSeparator="," prefix="R$ "
                    decimalScale={2} fixedDecimalScale className={inputCls}
                    value={field.value ?? 0}
                    onValueChange={({ floatValue }) => field.onChange(floatValue ?? 0)}
                  />
                )}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Alertas de Vencimento</label>
            <div className="flex gap-6">
              {[30, 60, 90].map((d) => (
                <label key={d} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={alertDias.includes(d)}
                    onChange={(e) => {
                      const current = alertDias
                      setValue('diasAlertaVencimento', e.target.checked ? [...current, d] : current.filter((x) => x !== d))
                    }}
                    className="rounded border-gray-300 w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">{d} dias</span>
                </label>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setShowEdit(false)}>Cancelar</Button>
            <Button type="submit" isLoading={editar.isPending}>Salvar Alteracoes</Button>
          </div>
        </form>
      </Modal>

      {/* Add Dependente Modal */}
      <Modal isOpen={showAddDep} onClose={() => setShowAddDep(false)} title="Adicionar Dependente" size="lg">
        <form onSubmit={handleDep(onSubmitDep)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo</label>
              <input {...regDep('nomeCompleto')} className={inputCls} />
              {errDep.nomeCompleto && <p className="text-red-500 text-xs mt-1">{errDep.nomeCompleto.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">CPF</label>
              <input
                value={cpfDepDisplay}
                onChange={(e) => {
                  const raw = e.target.value.replace(/\D/g, '').slice(0, 11)
                  const masked = raw.length <= 3 ? raw : raw.length <= 6 ? `${raw.slice(0,3)}.${raw.slice(3)}` : raw.length <= 9 ? `${raw.slice(0,3)}.${raw.slice(3,6)}.${raw.slice(6)}` : `${raw.slice(0,3)}.${raw.slice(3,6)}.${raw.slice(6,9)}-${raw.slice(9)}`
                  setCpfDepDisplay(masked)
                  setDepVal('cpf', raw, { shouldValidate: true })
                }}
                className={inputCls} placeholder="000.000.000-00" inputMode="numeric"
              />
              {errDep.cpf && <p className="text-red-500 text-xs mt-1">{errDep.cpf.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado Civil</label>
              <select {...regDep('estadoCivil')} className={inputCls}>
                {ESTADO_CIVIL.map((ec) => (
                  <option key={ec.value} value={ec.value}>{ec.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">RG</label>
              <input {...regDep('rg')} className={inputCls} placeholder="Opcional" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Orgao Emissor</label>
              <input {...regDep('orgaoEmissor')} className={inputCls} placeholder="Ex: SSP-SP" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Data de Nascimento</label>
              <input {...regDep('dataNascimento')} type="date" className={inputCls} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefone</label>
              <input {...regDep('telefone')} className={inputCls} placeholder="Ex: 11999998888" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setShowAddDep(false)}>Cancelar</Button>
            <Button type="submit" isLoading={criarDep.isPending}>Adicionar Dependente</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Dependente Confirm */}
      <ConfirmModal
        isOpen={!!deleteDep}
        onClose={() => setDeleteDep(null)}
        onConfirm={handleDeleteDep}
        title="Remover Dependente"
        description={`Remover ${deleteDep?.nomeCompleto} dos dependentes?`}
        isLoading={excluirDep.isPending}
        confirmLabel="Remover"
      />
    </div>
  )
}


