import { useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Wrench } from 'lucide-react'
import { NumericFormat } from 'react-number-format'
import { useApartamentos } from '../hooks/useApartamentos'
import { useGastosPorMes, useRegistrarGasto, useEditarGasto, useExcluirGasto } from '../hooks/useGastosManutencao'
import { formatCurrency, formatDate, extractApiError } from '../lib/utils'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { TableSkeleton } from '../components/ui/TableSkeleton'
import type { GastoManutencao } from '../types'

const gastoSchema = z.object({
  apartamentoId: z.string().uuid('Selecione um apartamento'),
  descricao: z.string().min(3, 'Descricao obrigatoria'),
  valor: z.coerce.number().positive('Deve ser maior que zero'),
  data: z.string().min(1, 'Obrigatorio'),
  observacao: z.string().optional(),
})

type GastoFormData = z.infer<typeof gastoSchema>

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1E3A5F] transition-colors'

export function GastosManutencao() {
  const now = new Date()
  const [ano, setAno] = useState(now.getFullYear())
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState<GastoManutencao | null>(null)
  const [deleteItem, setDeleteItem] = useState<GastoManutencao | null>(null)

  const { data: apartamentos } = useApartamentos()
  const { data: gastos, isLoading } = useGastosPorMes(ano, mes)
  const registrar = useRegistrarGasto()
  const editar = useEditarGasto()
  const excluir = useExcluirGasto()

  const totalMes = useMemo(() => (gastos ?? []).reduce((s, g) => s + g.valor, 0), [gastos])

  const {
    register, handleSubmit, control, formState: { errors }, reset,
  } = useForm<GastoFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(gastoSchema) as any,
  })

  const {
    register: regEdit, handleSubmit: handleEdit, control: ctrlEdit,
    formState: { errors: errEdit }, reset: resetEdit,
  } = useForm<Omit<GastoFormData, 'apartamentoId'>>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(gastoSchema.omit({ apartamentoId: true })) as any,
  })

  function openEdit(g: GastoManutencao) {
    setEditItem(g)
    resetEdit({ descricao: g.descricao, valor: g.valor, data: g.data, observacao: g.observacao ?? '' })
  }

  async function onSubmit(data: GastoFormData) {
    try {
      await registrar.mutateAsync(data)
      toast.success('Gasto registrado.')
      reset()
      setShowCreate(false)
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  async function onSubmitEdit(data: Omit<GastoFormData, 'apartamentoId'>) {
    if (!editItem) return
    try {
      await editar.mutateAsync({ id: editItem.id, ...data })
      toast.success('Gasto atualizado.')
      setEditItem(null)
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  async function handleDelete() {
    if (!deleteItem) return
    try {
      await excluir.mutateAsync(deleteItem.id)
      toast.success('Gasto removido.')
      setDeleteItem(null)
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <select
            value={mes}
            onChange={(e) => setMes(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#1E3A5F]"
          >
            {MESES.map((m, i) => (
              <option key={i + 1} value={i + 1}>{m}</option>
            ))}
          </select>
          <select
            value={ano}
            onChange={(e) => setAno(Number(e.target.value))}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:border-[#1E3A5F]"
          >
            {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          {gastos && gastos.length > 0 && (
            <span className="text-sm text-gray-500">
              Total: <strong className="text-red-500">{formatCurrency(totalMes)}</strong>
            </span>
          )}
        </div>
        <Button onClick={() => { reset(); setShowCreate(true) }}>
          <Plus className="w-4 h-4" />
          Registrar Gasto
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-3">Apartamento</th>
                <th className="px-5 py-3">Descricao</th>
                <th className="px-5 py-3">Valor</th>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Observacao</th>
                <th className="px-5 py-3 text-right">Acoes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr><td colSpan={6}><TableSkeleton rows={4} cols={6} /></td></tr>
              ) : !gastos || gastos.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-sm text-gray-400">
                    <Wrench className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                    Nenhum gasto registrado neste mes
                  </td>
                </tr>
              ) : gastos.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    Apt. {g.apartamentoNumero}
                  </td>
                  <td className="px-5 py-3 text-gray-800">{g.descricao}</td>
                  <td className="px-5 py-3 font-semibold text-red-500">{formatCurrency(g.valor)}</td>
                  <td className="px-5 py-3 text-gray-600">{formatDate(g.data)}</td>
                  <td className="px-5 py-3 text-gray-500 max-w-[200px] truncate">{g.observacao ?? '—'}</td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => openEdit(g)} className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors" title="Editar">
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button onClick={() => setDeleteItem(g)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors" title="Excluir">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Registrar Gasto de Manutencao" size="md">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Apartamento</label>
            <select {...register('apartamentoId')} className={inputCls}>
              <option value="">Selecione um apartamento</option>
              {(apartamentos ?? []).map((a) => (
                <option key={a.id} value={a.id}>
                  {a.numero}{a.bloco ? ` — Bl. ${a.bloco}` : ''}
                </option>
              ))}
            </select>
            {errors.apartamentoId && <p className="text-red-500 text-xs mt-1">{errors.apartamentoId.message}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Descricao</label>
            <input {...register('descricao')} className={inputCls} placeholder="Ex: Troca de torneira" />
            {errors.descricao && <p className="text-red-500 text-xs mt-1">{errors.descricao.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor</label>
              <Controller
                name="valor"
                control={control}
                render={({ field }) => (
                  <NumericFormat
                    thousandSeparator="." decimalSeparator="," prefix="R$ "
                    decimalScale={2} fixedDecimalScale className={inputCls}
                    placeholder="R$ 0,00"
                    value={field.value ?? ''}
                    onValueChange={({ floatValue }) => field.onChange(floatValue ?? 0)}
                  />
                )}
              />
              {errors.valor && <p className="text-red-500 text-xs mt-1">{errors.valor.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Data</label>
              <input {...register('data')} type="date" className={inputCls} />
              {errors.data && <p className="text-red-500 text-xs mt-1">{errors.data.message}</p>}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observacao (opcional)</label>
            <input {...register('observacao')} className={inputCls} placeholder="Detalhes adicionais..." />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button type="submit" isLoading={registrar.isPending}>Registrar</Button>
          </div>
        </form>
      </Modal>

      {/* Edit Modal */}
      <Modal isOpen={!!editItem} onClose={() => setEditItem(null)} title="Editar Gasto" size="md">
        <form onSubmit={handleEdit(onSubmitEdit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Descricao</label>
            <input {...regEdit('descricao')} className={inputCls} />
            {errEdit.descricao && <p className="text-red-500 text-xs mt-1">{errEdit.descricao.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor</label>
              <Controller
                name="valor"
                control={ctrlEdit}
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Data</label>
              <input {...regEdit('data')} type="date" className={inputCls} />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observacao</label>
            <input {...regEdit('observacao')} className={inputCls} />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="secondary" onClick={() => setEditItem(null)}>Cancelar</Button>
            <Button type="submit" isLoading={editar.isPending}>Salvar</Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Excluir Gasto"
        description={`Excluir gasto "${deleteItem?.descricao}" de ${formatCurrency(deleteItem?.valor ?? 0)}?`}
        isLoading={excluir.isPending}
        confirmLabel="Excluir"
      />
    </div>
  )
}


