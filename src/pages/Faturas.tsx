import { useState, useMemo, useEffect, useRef } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Zap, CreditCard, Droplets, QrCode, Gauge, Copy, MessageCircle, ClipboardCopy } from 'lucide-react'
import { NumericFormat } from 'react-number-format'
import {
  useFaturasPorStatus,
  useCriarFatura,
  useRegistrarPagamento,
  useAtualizarConsumo,
  useAtualizarLeituraKw,
  useAtualizarPix,
  useGerarPix,
} from '../hooks/useFaturas'
import { useInquilinos } from '../hooks/useInquilinos'
import { useApartamentos } from '../hooks/useApartamentos'
import type { Fatura } from '../types'
import { formatCurrency, formatDate, extractApiError } from '../lib/utils'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { TableSkeleton } from '../components/ui/TableSkeleton'
import api from '../lib/api'
import type { RespostaApi } from '../types'

// —— Schemas ——
const novaFaturaSchema = z.object({
  inquilinoId: z.string().uuid('Selecione um apartamento ocupado'),
  mesReferencia: z.string().regex(/^(0[1-9]|1[0-2])\/\d{4}$/, 'Use o formato MM/AAAA'),
  valorAluguel: z.coerce.number().positive('Deve ser maior que zero'),
  valorGaragem: z.coerce.number().min(0),
  dataLimitePagamento: z.string().min(1, 'Obrigatorio'),
  kwAtual: z.coerce.number().nullish(),
  kwMesAnteriorManual: z.coerce.number().nullish(),
  valorLuzManual: z.coerce.number().nullish(),
  valorAguaManual: z.coerce.number().nullish(),
  codigoPix: z.string().optional(),
})

type NovaFaturaData = z.infer<typeof novaFaturaSchema>

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1E3A5F] transition-colors'

type FilterStatus = 'todos' | 'Pendente' | 'Atrasado' | 'Pago'

function getStatusBadge(status: string) {
  if (status === 'Pago') return <Badge variant="success">Pago</Badge>
  if (status === 'Atrasado') return <Badge variant="danger">Atrasado</Badge>
  return <Badge variant="neutral">Pendente</Badge>
}

// —— Nova Fatura Form ——
function NovaFaturaForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
  const { data: apartamentos } = useApartamentos()
  const { data: inquilinos } = useInquilinos()
  const criar = useCriarFatura()

  const [selectedApartLabel, setSelectedApartLabel] = useState('')

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors },
  } = useForm<NovaFaturaData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(novaFaturaSchema) as any,
    defaultValues: { valorAluguel: 0, valorGaragem: 0 },
  })

  const apartamentosOcupados = useMemo(
    () => (apartamentos ?? []).filter((a) => a.ocupado),
    [apartamentos]
  )

  function handleApartamentoChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const aptId = e.target.value
    const apt = apartamentosOcupados.find((a) => a.id === aptId)
    if (!apt) { setSelectedApartLabel(''); return }
    setSelectedApartLabel(apt.bloco ? `${apt.numero} - Bloco ${apt.bloco}` : apt.numero)
    const inq = (inquilinos ?? []).find((i) => i.apartamentoId === aptId)
    if (inq) {
      setValue('inquilinoId', inq.id)
      setValue('valorAluguel', inq.valorAluguel)
      setValue('valorGaragem', inq.garagem ?? 0)
    }
  }

  async function onSubmit(data: NovaFaturaData) {
    try {
      const payload = {
        ...data,
        valorGaragem: data.valorGaragem || 0,
        kwAtual: data.kwAtual || undefined,
        kwMesAnteriorManual: data.kwMesAnteriorManual || undefined,
        valorLuzManual: data.valorLuzManual || undefined,
        valorAguaManual: data.valorAguaManual || undefined,
        codigoPix: data.codigoPix || undefined,
      }
      const res = await criar.mutateAsync(payload)
      toast.success(res.data.mensagem || 'Fatura criada com sucesso.')
      onSuccess()
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Apartamento */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Apartamento</label>
        <select onChange={handleApartamentoChange} className={inputCls} defaultValue="">
          <option value="">Selecione um apartamento</option>
          {apartamentosOcupados.map((a) => (
            <option key={a.id} value={a.id}>
              {a.bloco ? `${a.numero} - Bloco ${a.bloco}` : a.numero}
            </option>
          ))}
        </select>
        {errors.inquilinoId && (
          <p className="text-red-500 text-xs mt-1">{errors.inquilinoId.message}</p>
        )}
        {/* hidden field so react-hook-form tracks inquilinoId */}
        <input type="hidden" {...register('inquilinoId')} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Mês de Referência</label>
          <Controller
            name="mesReferencia"
            control={control}
            render={({ field }) => (
              <input
                value={field.value ?? ''}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, '').slice(0, 6)
                  const masked = digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`
                  field.onChange(masked)
                }}
                inputMode="numeric"
                className={inputCls}
                placeholder="MM/AAAA"
                maxLength={7}
              />
            )}
          />
          {errors.mesReferencia && <p className="text-red-500 text-xs mt-1">{errors.mesReferencia.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Data Limite Pgto.</label>
          <input {...register('dataLimitePagamento')} type="date" className={inputCls} />
          {errors.dataLimitePagamento && <p className="text-red-500 text-xs mt-1">{errors.dataLimitePagamento.message}</p>}
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
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor da Garagem</label>
          <Controller
            name="valorGaragem"
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
        </div>
      </div>

      {/* kWh Section — anterior à esquerda, atual à direita */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-3">
        <p className="text-xs font-semibold text-blue-700 uppercase tracking-wide flex items-center gap-1.5">
          <Gauge className="w-3.5 h-3.5" /> Leitura de Energia (opcional)
        </p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Leitura Anterior (só 1ª fatura)</label>
            <Controller
              name="kwMesAnteriorManual"
              control={control}
              render={({ field }) => (
                <NumericFormat
                  thousandSeparator="." decimalSeparator="," decimalScale={2}
                  className={inputCls} placeholder="Ex: 9.800,00"
                  value={field.value ?? ''}
                  onValueChange={({ floatValue }) => field.onChange(floatValue ?? null)}
                />
              )}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Leitura Atual (kWh)</label>
            <Controller
              name="kwAtual"
              control={control}
              render={({ field }) => (
                <NumericFormat
                  thousandSeparator="." decimalSeparator="," decimalScale={2}
                  className={inputCls} placeholder="Ex: 10.000,00"
                  value={field.value ?? ''}
                  onValueChange={({ floatValue }) => field.onChange(floatValue ?? null)}
                />
              )}
            />
          </div>
        </div>
        <p className="text-xs text-gray-400">Se não informar, a luz e água serão calculados automaticamente pela configuração global.</p>
      </div>

      {/* Manual overrides */}
      <div className="rounded-xl border border-amber-100 bg-amber-50/30 p-4 space-y-3">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Sobrescrever Valores (opcional)</p>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Luz Manual (R$)</label>
            <Controller
              name="valorLuzManual"
              control={control}
              render={({ field }) => (
                <NumericFormat
                  thousandSeparator="." decimalSeparator="," prefix="R$ "
                  decimalScale={2} fixedDecimalScale className={inputCls}
                  placeholder="R$ 0,00"
                  value={field.value ?? ''}
                  onValueChange={({ floatValue }) => field.onChange(floatValue ?? null)}
                />
              )}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Água Manual (R$)</label>
            <Controller
              name="valorAguaManual"
              control={control}
              render={({ field }) => (
                <NumericFormat
                  thousandSeparator="." decimalSeparator="," prefix="R$ "
                  decimalScale={2} fixedDecimalScale className={inputCls}
                  placeholder="R$ 0,00"
                  value={field.value ?? ''}
                  onValueChange={({ floatValue }) => field.onChange(floatValue ?? null)}
                />
              )}
            />
          </div>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Código PIX <span className="text-gray-400 font-normal">(opcional)</span>
        </label>
        <input {...register('codigoPix')} className={inputCls} placeholder="Cole o código PIX aqui" />
      </div>

      {selectedApartLabel && (
        <div className="rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs text-gray-500">
          Apartamento selecionado: <strong className="text-gray-700">{selectedApartLabel}</strong>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" isLoading={criar.isPending}>Criar Fatura</Button>
      </div>
    </form>
  )
}

// —— Main Page ——
export function Faturas() {
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('todos')
  const [showNova, setShowNova] = useState(false)

  const [pagamentoFatura, setPagamentoFatura] = useState<Fatura | null>(null)
  const [consumoFatura, setConsumoFatura] = useState<Fatura | null>(null)
  const [kwhFatura, setKwhFatura] = useState<Fatura | null>(null)
  const [pixFatura, setPixFatura] = useState<Fatura | null>(null)
  const [pixGeradoData, setPixGeradoData] = useState<{ faturaId: string; pixCopiaCola: string; qrCodeUrl: string } | null>(null)

  const [dataPagamento, setDataPagamento] = useState('')
  const [novaAgua, setNovaAgua] = useState(0)
  const [novaLuz, setNovaLuz] = useState(0)
  const [novoKwAtual, setNovoKwAtual] = useState(0)
  const [novoPix, setNovoPix] = useState('')
  const [pixPago, setPixPago] = useState(false)

  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const { data: pendentes, isLoading: lP } = useFaturasPorStatus(1)
  const { data: atrasadas, isLoading: lA } = useFaturasPorStatus(2)
  const { data: pagas, isLoading: lPg } = useFaturasPorStatus(3)
  const { data: inquilinos } = useInquilinos()

  const registrarPagamento = useRegistrarPagamento()
  const atualizarConsumo = useAtualizarConsumo()
  const atualizarLeituraKw = useAtualizarLeituraKw()
  const atualizarPix = useAtualizarPix()
  const gerarPix = useGerarPix()

  const inquilinoMap = useMemo(
    () => Object.fromEntries((inquilinos ?? []).map((i) => [i.id, i])),
    [inquilinos]
  )


  const allFaturas = useMemo(
    () => [...(pendentes ?? []), ...(atrasadas ?? []), ...(pagas ?? [])],
    [pendentes, atrasadas, pagas]
  )

  const faturasFiltradas = useMemo(() => {
    if (statusFilter === 'todos') return allFaturas
    return allFaturas.filter((f) => f.status === statusFilter)
  }, [allFaturas, statusFilter])

  const isLoading = lP || lA || lPg

  // Polling PIX after generating
  useEffect(() => {
    if (!pixGeradoData) {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
      return
    }

    setPixPago(false)
    pollIntervalRef.current = setInterval(async () => {
      try {
        const res = await api.get<RespostaApi<Fatura>>(`/faturas/${pixGeradoData.faturaId}`)
        const fatura = res.data.dados
        if (fatura.status === 'Pago') {
          setPixPago(true)
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current)
            pollIntervalRef.current = null
          }
          toast.success('Pagamento recebido!')
        }
      } catch {
        // silently ignore polling errors
      }
    }, 10000)

    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current)
        pollIntervalRef.current = null
      }
    }
  }, [pixGeradoData])

  async function handleRegistrarPagamento() {
    if (!pagamentoFatura || !dataPagamento) return
    try {
      const res = await registrarPagamento.mutateAsync({ id: pagamentoFatura.id, dataPagamento })
      toast.success(res.data.mensagem || 'Pagamento registrado.')
      setPagamentoFatura(null)
      setDataPagamento('')
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  async function handleAtualizarConsumo() {
    if (!consumoFatura) return
    try {
      const res = await atualizarConsumo.mutateAsync({ id: consumoFatura.id, valorAgua: novaAgua, valorLuz: novaLuz })
      toast.success(res.data.mensagem || 'Consumo atualizado.')
      setConsumoFatura(null)
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  async function handleAtualizarKw() {
    if (!kwhFatura) return
    try {
      const res = await atualizarLeituraKw.mutateAsync({ id: kwhFatura.id, kwAtual: novoKwAtual })
      toast.success(res.data.mensagem || 'Leitura de kWh atualizada.')
      setKwhFatura(null)
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  async function handleAtualizarPix() {
    if (!pixFatura) return
    try {
      const res = await atualizarPix.mutateAsync({ id: pixFatura.id, codigoPix: novoPix })
      toast.success(res.data.mensagem || 'PIX atualizado.')
      setPixFatura(null)
      setNovoPix('')
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  async function handleGerarPix(fatura: Fatura) {
    try {
      const res = await gerarPix.mutateAsync({ id: fatura.id })
      setPixGeradoData({
        faturaId: fatura.id,
        pixCopiaCola: res.data.dados.pixCopiaCola,
        qrCodeUrl: res.data.dados.qrCodeUrl,
      })
      toast.success('PIX gerado com sucesso!')
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  async function handleWhatsApp(fatura: Fatura) {
    try {
      const res = await api.get<RespostaApi<{ linkWhatsApp: string }>>(`/faturas/${fatura.id}/whatsapp-link`)
      window.open(res.data.dados.linkWhatsApp, '_blank')
    } catch (err) {
      toast.error(extractApiError(err) || 'Telefone ou mensagem não configurados. Verifique em Configurações.')
    }
  }

  async function handleCopiarPix(fatura: Fatura) {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5101/api'}/faturas/${fatura.id}/pix-nativo`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) {
        toast.warning('PIX não configurado. Configure a chave PIX em Configurações.')
        return
      }
      const codigo = await res.text()
      await navigator.clipboard.writeText(codigo)
      toast.success('Código PIX copiado!')
    } catch {
      toast.error('Erro ao copiar código PIX.')
    }
  }

  const filterLabels: Record<FilterStatus, string> = {
    todos: 'Todos', Pendente: 'Pendente', Atrasado: 'Atrasado', Pago: 'Pago',
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {(['todos', 'Pendente', 'Atrasado', 'Pago'] as FilterStatus[]).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                statusFilter === f
                  ? 'bg-[#1E3A5F] text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
        <Button onClick={() => setShowNova(true)}>
          <Plus className="w-4 h-4" />
          Nova Fatura
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100 bg-gray-50/60">
                <th className="px-4 py-3">Apartamento</th>
                <th className="px-4 py-3">Inquilino</th>
                <th className="px-4 py-3">Mês Ref.</th>
                <th className="px-4 py-3">Aluguel</th>
                <th className="px-4 py-3">Garagem</th>
                <th className="px-4 py-3">Água</th>
                <th className="px-4 py-3">Luz</th>
                <th className="px-4 py-3 font-bold">Total</th>
                <th className="px-4 py-3">Vencimento</th>
                <th className="px-4 py-3">Pagamento</th>
                <th className="px-4 py-3">PIX</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={13}><TableSkeleton rows={5} cols={13} /></td></tr>
              ) : faturasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={13} className="px-4 py-10 text-center text-gray-400">
                    Nenhuma fatura encontrada
                  </td>
                </tr>
              ) : (
                faturasFiltradas.map((f) => {
                  const isPago = f.status === 'Pago'
                  const inq = inquilinoMap[f.inquilinoId]
                  const aptLabel = f.blocoApartamento
                    ? `${f.numeroApartamento} - Bloco ${f.blocoApartamento}`
                    : (f.numeroApartamento || '—')
                  return (
                    <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3 font-medium text-gray-900">{aptLabel}</td>
                      <td className="px-4 py-3 text-gray-700 max-w-[140px] truncate">
                        {inq?.nomeCompleto ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{f.mesReferencia}</td>
                      <td className="px-4 py-3 text-gray-600">{formatCurrency(f.valorAluguel)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatCurrency(f.valorGaragem ?? 0)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatCurrency(f.valorAgua)}</td>
                      <td className="px-4 py-3 text-gray-600">{formatCurrency(f.valorLuz)}</td>
                      <td className="px-4 py-3 font-bold text-gray-900">{formatCurrency(f.valorTotal)}</td>
                      <td className={`px-4 py-3 ${f.status === 'Atrasado' ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {formatDate(f.dataLimitePagamento)}
                      </td>
                      <td className="px-4 py-3 text-gray-600">{formatDate(f.dataPagamento)}</td>
                      <td className="px-4 py-3 text-gray-500 max-w-[80px]">
                        {f.codigoPix ? (
                          <span className="text-xs truncate block cursor-help" title={f.codigoPix}>
                            {f.codigoPix.slice(0, 8)}…
                          </span>
                        ) : '—'}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(f.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {!isPago && (
                            <button
                              onClick={() => { setPagamentoFatura(f); setDataPagamento('') }}
                              className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 transition-colors"
                              title="Registrar Pagamento"
                            >
                              <CreditCard className="w-4 h-4" />
                            </button>
                          )}
                          {!isPago && (
                            <button
                              onClick={() => { setConsumoFatura(f); setNovaAgua(f.valorAgua); setNovaLuz(f.valorLuz) }}
                              className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                              title="Atualizar Consumo"
                            >
                              <Droplets className="w-4 h-4" />
                            </button>
                          )}
                          {!isPago && (
                            <button
                              onClick={() => { setKwhFatura(f); setNovoKwAtual(f.kwAtual ?? 0) }}
                              className="p-1.5 rounded-lg hover:bg-yellow-50 text-yellow-600 transition-colors"
                              title="Atualizar Leitura kWh"
                            >
                              <Gauge className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => { setPixFatura(f); setNovoPix(f.codigoPix ?? '') }}
                            className="p-1.5 rounded-lg hover:bg-purple-50 text-purple-500 transition-colors"
                            title="Atualizar PIX Manual"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          {!isPago && (
                            <button
                              onClick={() => handleGerarPix(f)}
                              className="p-1.5 rounded-lg hover:bg-teal-50 text-teal-600 transition-colors"
                              title="Gerar PIX via Asaas"
                            >
                              <Zap className="w-4 h-4" />
                            </button>
                          )}
                          {!isPago && (
                            <button
                              onClick={() => handleCopiarPix(f)}
                              className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-500 transition-colors"
                              title="Copiar PIX Nativo"
                            >
                              <ClipboardCopy className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleWhatsApp(f)}
                            className="p-1.5 rounded-lg hover:bg-green-50 text-green-500 transition-colors"
                            title="Enviar via WhatsApp"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nova Fatura Modal */}
      <Modal isOpen={showNova} onClose={() => setShowNova(false)} title="Nova Fatura" size="lg">
        <NovaFaturaForm onSuccess={() => setShowNova(false)} onCancel={() => setShowNova(false)} />
      </Modal>

      {/* Registrar Pagamento Modal */}
      <Modal isOpen={!!pagamentoFatura} onClose={() => setPagamentoFatura(null)} title="Registrar Pagamento" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Fatura de <strong>{inquilinoMap[pagamentoFatura?.inquilinoId ?? '']?.nomeCompleto ?? ''}</strong>{' '}
            — {pagamentoFatura?.mesReferencia} — <strong>{formatCurrency(pagamentoFatura?.valorTotal ?? 0)}</strong>
          </p>          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Data do Pagamento</label>
            <input type="date" value={dataPagamento} onChange={(e) => setDataPagamento(e.target.value)} className={inputCls} />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setPagamentoFatura(null)}>Cancelar</Button>
            <Button onClick={handleRegistrarPagamento} isLoading={registrarPagamento.isPending} disabled={!dataPagamento}>
              Confirmar Pagamento
            </Button>
          </div>
        </div>
      </Modal>

      {/* Atualizar Consumo Modal */}
      <Modal isOpen={!!consumoFatura} onClose={() => setConsumoFatura(null)} title="Atualizar Consumo" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor da Água</label>
            <NumericFormat
              thousandSeparator="." decimalSeparator="," prefix="R$ " decimalScale={2} fixedDecimalScale
              className={inputCls} value={novaAgua}
              onValueChange={({ floatValue }) => setNovaAgua(floatValue ?? 0)}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor da Luz</label>
            <NumericFormat
              thousandSeparator="." decimalSeparator="," prefix="R$ " decimalScale={2} fixedDecimalScale
              className={inputCls} value={novaLuz}
              onValueChange={({ floatValue }) => setNovaLuz(floatValue ?? 0)}
            />
          </div>
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg">
            <span className="text-xs text-gray-500">Novo subtotal consumo:</span>
            <span className="text-sm font-semibold">{formatCurrency(novaAgua + novaLuz)}</span>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setConsumoFatura(null)}>Cancelar</Button>
            <Button onClick={handleAtualizarConsumo} isLoading={atualizarConsumo.isPending}>Salvar Consumo</Button>
          </div>
        </div>
      </Modal>

      {/* Atualizar Leitura kWh Modal */}
      <Modal isOpen={!!kwhFatura} onClose={() => setKwhFatura(null)} title="Atualizar Leitura kWh" size="sm">
        <div className="space-y-4">
          {kwhFatura && (
            <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 space-y-1">
              <p>Leitura anterior: <strong>{kwhFatura.kwMesAnterior ?? '—'} kWh</strong></p>
              <p>Leitura atual registrada: <strong>{kwhFatura.kwAtual ?? '—'} kWh</strong></p>
              <p>Consumo: <strong>{kwhFatura.kwConsumidos ?? '—'} kWh</strong></p>
              <p>Tarifa: <strong>R$ {kwhFatura.kwhValor?.toFixed(4) ?? '—'}/kWh</strong></p>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Nova Leitura Atual (kWh)</label>
            <NumericFormat
              thousandSeparator="." decimalSeparator="," decimalScale={2}
              className={inputCls} placeholder="Ex: 10.000,00"
              value={novoKwAtual || ''}
              onValueChange={({ floatValue }) => setNovoKwAtual(floatValue ?? 0)}
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setKwhFatura(null)}>Cancelar</Button>
            <Button onClick={handleAtualizarKw} isLoading={atualizarLeituraKw.isPending}>Salvar Leitura</Button>
          </div>
        </div>
      </Modal>

      {/* Atualizar PIX Modal */}
      <Modal isOpen={!!pixFatura} onClose={() => setPixFatura(null)} title="Atualizar Código PIX" size="sm">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Código PIX</label>
            <input value={novoPix} onChange={(e) => setNovoPix(e.target.value)} className={inputCls} placeholder="Cole o código PIX aqui" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setPixFatura(null)}>Cancelar</Button>
            <Button onClick={handleAtualizarPix} isLoading={atualizarPix.isPending}>Salvar PIX</Button>
          </div>
        </div>
      </Modal>

      {/* PIX Gerado via Asaas Modal */}
      <Modal isOpen={!!pixGeradoData} onClose={() => setPixGeradoData(null)} title="PIX Gerado com Sucesso" size="sm">
        {pixGeradoData && (
          <div className="space-y-4">
            {pixPago ? (
              <div className="rounded-xl bg-green-50 border border-green-100 px-4 py-6 text-center">
                <p className="text-green-700 font-semibold text-lg">✅ Pagamento confirmado!</p>
                <p className="text-green-600 text-sm mt-1">O pagamento foi recebido via PIX.</p>
              </div>
            ) : (
              <div className="rounded-xl bg-blue-50 border border-blue-100 px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse shrink-0" />
                Aguardando pagamento… verificando a cada 10s
              </div>
            )}
            {pixGeradoData.qrCodeUrl && (
              <div className="flex justify-center">
                <img src={pixGeradoData.qrCodeUrl} alt="QR Code PIX" className="w-48 h-48 rounded-xl border" />
              </div>
            )}
            <div>
              <label className="block text-xs text-gray-500 mb-1">PIX Copia e Cola</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly value={pixGeradoData.pixCopiaCola}
                  className={`${inputCls} font-mono text-xs`}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(pixGeradoData.pixCopiaCola)
                    toast.success('Copiado!')
                  }}
                  className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors shrink-0"
                  title="Copiar"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
            <Button className="w-full" onClick={() => setPixGeradoData(null)}>Fechar</Button>
          </div>
        )}
      </Modal>
    </div>
  )
}

