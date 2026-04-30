import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2 } from 'lucide-react'
import {
  useApartamentos,
  useCriarApartamento,
  useEditarApartamento,
  useExcluirApartamento,
} from '../hooks/useApartamentos'
import type { Apartamento } from '../types'
import { formatDate, extractApiError } from '../lib/utils'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { TableSkeleton } from '../components/ui/TableSkeleton'
import { Tooltip } from '../components/ui/Tooltip'

const schema = z.object({
  numero: z.string().min(1, 'Número obrigatório').max(20),
  bloco: z.string().max(10).optional(),
})

type FormData = z.infer<typeof schema>

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1E3A5F] transition-colors'

type FilterType = 'todos' | 'disponiveis' | 'ocupados'

export function Apartamentos() {
  const [filter, setFilter] = useState<FilterType>('todos')
  const [showModal, setShowModal] = useState(false)
  const [editItem, setEditItem] = useState<Apartamento | null>(null)
  const [deleteItem, setDeleteItem] = useState<Apartamento | null>(null)

  const { data: apartamentos, isLoading } = useApartamentos()
  const criar = useCriarApartamento()
  const editar = useEditarApartamento()
  const excluir = useExcluirApartamento()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormData>({ resolver: zodResolver(schema) })

  const filtered = useMemo(() => {
    if (!apartamentos) return []
    if (filter === 'disponiveis') return apartamentos.filter((a) => !a.ocupado)
    if (filter === 'ocupados') return apartamentos.filter((a) => a.ocupado)
    return apartamentos
  }, [apartamentos, filter])

  function openCreate() {
    reset({ numero: '', bloco: '' })
    setEditItem(null)
    setShowModal(true)
  }

  function openEdit(apt: Apartamento) {
    reset({ numero: apt.numero, bloco: apt.bloco ?? '' })
    setEditItem(apt)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    setEditItem(null)
  }

  async function onSubmit(data: FormData) {
    try {
      if (editItem) {
        const res = await editar.mutateAsync({ id: editItem.id, ...data })
        toast.success(res.data.mensagem)
      } else {
        const res = await criar.mutateAsync(data)
        toast.success(res.data.mensagem)
      }
      closeModal()
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  async function handleDelete() {
    if (!deleteItem) return
    try {
      await excluir.mutateAsync(deleteItem.id)
      toast.success('Apartamento excluído com sucesso.')
      setDeleteItem(null)
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  const isMutating = criar.isPending || editar.isPending

  const filterLabels: Record<FilterType, string> = {
    todos: 'Todos',
    disponiveis: 'Disponíveis',
    ocupados: 'Ocupados',
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          {(['todos', 'disponiveis', 'ocupados'] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                filter === f
                  ? 'bg-[#1E3A5F] text-white shadow-sm'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {filterLabels[f]}
            </button>
          ))}
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Novo Apartamento
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-3">Número</th>
                <th className="px-5 py-3">Bloco</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Data de Cadastro</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={5}>
                    <TableSkeleton rows={5} cols={5} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-sm text-gray-400">
                    Nenhum apartamento encontrado
                  </td>
                </tr>
              ) : (
                filtered.map((apt) => (
                  <tr key={apt.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">
                      {apt.numero}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">{apt.bloco || '—'}</td>
                    <td className="px-5 py-3.5">
                      {apt.ocupado ? (
                        <Badge variant="primary">Ocupado</Badge>
                      ) : (
                        <Badge variant="success">Disponível</Badge>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {formatDate(apt.criadoEm)}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => openEdit(apt)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                          title="Editar"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        {apt.ocupado ? (
                          <Tooltip content="Não é possível excluir: apartamento está ocupado">
                            <button
                              disabled
                              className="p-1.5 rounded-lg text-gray-300 cursor-not-allowed"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </Tooltip>
                        ) : (
                          <button
                            onClick={() => setDeleteItem(apt)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={showModal}
        onClose={closeModal}
        title={editItem ? 'Editar Apartamento' : 'Novo Apartamento'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Número</label>
            <input {...register('numero')} className={inputCls} placeholder="Ex: 101" />
            {errors.numero && (
              <p className="text-red-500 text-xs mt-1">{errors.numero.message}</p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Bloco <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input {...register('bloco')} className={inputCls} placeholder="Ex: A" />
            {errors.bloco && (
              <p className="text-red-500 text-xs mt-1">{errors.bloco.message}</p>
            )}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={closeModal}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isMutating}>
              {editItem ? 'Salvar Alterações' : 'Criar Apartamento'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Excluir Apartamento"
        description={`Tem certeza que deseja excluir o apartamento ${deleteItem?.numero} do bloco ${deleteItem?.bloco}? Esta ação não pode ser desfeita.`}
        isLoading={excluir.isPending}
        confirmLabel="Excluir"
      />
    </div>
  )
}

