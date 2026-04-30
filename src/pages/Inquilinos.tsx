import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, Controller, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, ChevronRight, Users } from 'lucide-react'
import { NumericFormat } from 'react-number-format'
import {
  useInquilinos,
  useCriarInquilino,
  useEditarInquilino,
  useExcluirInquilino,
  useCriarDependente,
} from '../hooks/useInquilinos'
import { useApartamentos, useApartamentosDisponiveis } from '../hooks/useApartamentos'
import type { Inquilino } from '../types'
import { formatCurrency, formatDate, formatCPF, maskCPFInput, diasAteVencimento, extractApiError } from '../lib/utils'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Modal } from '../components/ui/Modal'
import { ConfirmModal } from '../components/ui/ConfirmModal'
import { TableSkeleton } from '../components/ui/TableSkeleton'

const ESTADO_CIVIL = [
  { value: 'Solteiro', label: 'Solteiro(a)' },
  { value: 'Casado', label: 'Casado(a)' },
  { value: 'Divorciado', label: 'Divorciado(a)' },
  { value: 'Viuvo', label: 'Viúvo(a)' },
  { value: 'UniaoEstavel', label: 'União Estável' },
]

const dependenteSchema = z.object({
  nomeCompleto: z.string().min(3, 'Nome obrigatório'),
  cpf: z.string().length(11, 'CPF deve ter 11 dígitos'),
  rg: z.string().min(1, 'RG obrigatório'),
  orgaoEmissor: z.string().min(1, 'Órgão emissor obrigatório'),
  dataNascimento: z.string().min(1, 'Data de nascimento obrigatória'),
  telefone: z.string().min(1, 'Telefone obrigatório'),
  estadoCivil: z.string().min(1, 'Estado civil obrigatório'),
  _cpfDisplay: z.string().optional(),
})

const criarSchema = z.object({
  nomeCompleto: z.string().min(3, 'Nome muito curto'),
  cpf: z.string().length(11, 'CPF deve ter 11 dígitos'),
  dataNascimento: z.string().min(1, 'Data de nascimento obrigatória'),
  rg: z.string().min(1, 'RG obrigatório'),
  orgaoEmissor: z.string().min(1, 'Órgão emissor obrigatório'),
  telefone: z.string().min(1, 'Telefone obrigatório'),
  estadoCivil: z.string().min(1, 'Estado civil obrigatório'),
  quantidadeMoradores: z.coerce.number().int().min(1, 'Mínimo 1 morador'),
  dataEntrada: z.string().min(1, 'Obrigatório'),
  dataVencimentoContrato: z.string().min(1, 'Obrigatório'),
  valorAluguel: z.coerce.number().positive('Deve ser maior que zero'),
  garagem: z.coerce.number().min(0).optional(),
  apartamentoId: z.string().uuid('Selecione um apartamento'),
  diasAlertaVencimento: z.array(z.number()).optional().default([]),
  dependentes: z.array(dependenteSchema).optional().default([]),
})

const editarSchema = z.object({
  nomeCompleto: z.string().min(3, 'Nome muito curto'),
  rg: z.string().min(1, 'RG obrigatório'),
  orgaoEmissor: z.string().min(1, 'Órgão emissor obrigatório'),
  telefone: z.string().min(1, 'Telefone obrigatório'),
  estadoCivil: z.string().min(1, 'Estado civil obrigatório'),
  quantidadeMoradores: z.coerce.number().int().min(1, 'Mínimo 1 morador'),
  dataVencimentoContrato: z.string().min(1, 'Obrigatório'),
  valorAluguel: z.coerce.number().positive('Deve ser maior que zero'),
  garagem: z.coerce.number().min(0).optional(),
  diasAlertaVencimento: z.array(z.number()).optional().default([]),
})

type CriarFormData = z.infer<typeof criarSchema>
type EditarFormData = z.infer<typeof editarSchema>

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1E3A5F] transition-colors'

function getContractBadge(dateStr: string) {
  const dias = diasAteVencimento(dateStr)
  if (dias <= 30) return <Badge variant="danger">{dias}d</Badge>
  if (dias <= 60) return <Badge variant="warning">{dias}d</Badge>
  if (dias <= 90) return <Badge variant="yellow">{dias}d</Badge>
  return null
}

// —— Create Form ——
function CriarInquilinoForm({
  onSuccess,
  onCancel,
}: {
  onSuccess: () => void
  onCancel: () => void
}) {
  const { data: aptDisponiveis } = useApartamentosDisponiveis()
  const criar = useCriarInquilino()
  const criarDependente = useCriarDependente()
  const [cpfDisplay, setCpfDisplay] = useState('')

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<CriarFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(criarSchema) as any,
    defaultValues: { diasAlertaVencimento: [], dependentes: [], quantidadeMoradores: 1, estadoCivil: 'Solteiro' },
  })

  const { fields, replace } = useFieldArray({ control, name: 'dependentes' })

  const alertDias = watch('diasAlertaVencimento') ?? []
  const quantidadeMoradores = watch('quantidadeMoradores') ?? 1

  // Sync dependent fields count when quantidadeMoradores changes
  const numDependentes = Math.max(0, Number(quantidadeMoradores) - 1)
  const prevNumDep = fields.length

  if (numDependentes !== prevNumDep) {
    const novos = Array.from({ length: numDependentes }, (_, i) =>
      fields[i] ?? { nomeCompleto: '', cpf: '', rg: '', orgaoEmissor: '', dataNascimento: '', telefone: '', estadoCivil: 'Solteiro', _cpfDisplay: '' }
    )
    replace(novos)
  }

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11)
    setCpfDisplay(maskCPFInput(raw))
    setValue('cpf', raw, { shouldValidate: true })
  }

  function maskCPF(raw: string) {
    if (raw.length <= 3) return raw
    if (raw.length <= 6) return `${raw.slice(0,3)}.${raw.slice(3)}`
    if (raw.length <= 9) return `${raw.slice(0,3)}.${raw.slice(3,6)}.${raw.slice(6)}`
    return `${raw.slice(0,3)}.${raw.slice(3,6)}.${raw.slice(6,9)}-${raw.slice(9)}`
  }

  async function onSubmit(data: CriarFormData) {
    try {
      const res = await criar.mutateAsync({
        nomeCompleto: data.nomeCompleto,
        cpf: data.cpf,
        dataNascimento: data.dataNascimento,
        rg: data.rg,
        orgaoEmissor: data.orgaoEmissor,
        telefone: data.telefone,
        estadoCivil: data.estadoCivil,
        quantidadeMoradores: data.quantidadeMoradores,
        dataEntrada: data.dataEntrada,
        dataVencimentoContrato: data.dataVencimentoContrato,
        valorAluguel: data.valorAluguel,
        garagem: data.garagem,
        apartamentoId: data.apartamentoId,
        diasAlertaVencimento: data.diasAlertaVencimento ?? [],
      })
      toast.success(res.data.mensagem)

      const inquilinoId = res.data.dados.id
      // Create dependents sequentially
      const deps = data.dependentes ?? []
      for (const dep of deps) {
        await criarDependente.mutateAsync({
          inquilinoId,
          nomeCompleto: dep.nomeCompleto,
          cpf: dep.cpf,
          rg: dep.rg,
          orgaoEmissor: dep.orgaoEmissor,
          dataNascimento: dep.dataNascimento,
          telefone: dep.telefone,
          estadoCivil: dep.estadoCivil,
        })
      }
      if (deps.length > 0) toast.success(`${deps.length} dependente(s) cadastrado(s).`)

      onSuccess()
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  const isSubmitting = criar.isPending || criarDependente.isPending

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo</label>
          <input {...register('nomeCompleto')} className={inputCls} placeholder="Nome Completo" />
          {errors.nomeCompleto && (
            <p className="text-red-500 text-xs mt-1">{errors.nomeCompleto.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">CPF</label>
          <input
            value={cpfDisplay}
            onChange={handleCpfChange}
            className={inputCls}
            placeholder="000.000.000-00"
            inputMode="numeric"
          />
          {errors.cpf && <p className="text-red-500 text-xs mt-1">{errors.cpf.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Data de Nascimento</label>
          <input {...register('dataNascimento')} type="date" className={inputCls} />
          {errors.dataNascimento && (
            <p className="text-red-500 text-xs mt-1">{errors.dataNascimento.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">RG</label>
          <input {...register('rg')} className={inputCls} placeholder="Ex: 12345678" />
          {errors.rg && <p className="text-red-500 text-xs mt-1">{errors.rg.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Órgão Emissor</label>
          <input {...register('orgaoEmissor')} className={inputCls} placeholder="Ex: SSP-SP" />
          {errors.orgaoEmissor && <p className="text-red-500 text-xs mt-1">{errors.orgaoEmissor.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefone</label>
          <input {...register('telefone')} className={inputCls} placeholder="11988887777" inputMode="numeric" />
          {errors.telefone && <p className="text-red-500 text-xs mt-1">{errors.telefone.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado Civil</label>
          <select {...register('estadoCivil')} className={inputCls}>
            <option value="">Selecione</option>
            {ESTADO_CIVIL.map((ec) => (
              <option key={ec.value} value={ec.value}>{ec.label}</option>
            ))}
          </select>
          {errors.estadoCivil && <p className="text-red-500 text-xs mt-1">{errors.estadoCivil.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nº de Moradores</label>
          <input
            {...register('quantidadeMoradores')}
            type="number"
            min={1}
            className={inputCls}
            placeholder="1"
          />
          {errors.quantidadeMoradores && (
            <p className="text-red-500 text-xs mt-1">{errors.quantidadeMoradores.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Data de Entrada</label>
          <input {...register('dataEntrada')} type="date" className={inputCls} />
          {errors.dataEntrada && (
            <p className="text-red-500 text-xs mt-1">{errors.dataEntrada.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Vencimento do Contrato
          </label>
          <input {...register('dataVencimentoContrato')} type="date" className={inputCls} />
          {errors.dataVencimentoContrato && (
            <p className="text-red-500 text-xs mt-1">{errors.dataVencimentoContrato.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor do Aluguel</label>
          <Controller
            name="valorAluguel"
            control={control}
            render={({ field }) => (
              <NumericFormat
                thousandSeparator="."
                decimalSeparator=","
                prefix="R$ "
                decimalScale={2}
                fixedDecimalScale
                className={inputCls}
                placeholder="R$ 0,00"
                onValueChange={({ floatValue }) => field.onChange(floatValue ?? 0)}
              />
            )}
          />
          {errors.valorAluguel && (
            <p className="text-red-500 text-xs mt-1">{errors.valorAluguel.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Garagem (R$) <span className="text-gray-400 font-normal">(opcional)</span></label>
          <Controller
            name="garagem"
            control={control}
            render={({ field }) => (
              <NumericFormat
                thousandSeparator="."
                decimalSeparator=","
                prefix="R$ "
                decimalScale={2}
                fixedDecimalScale
                className={inputCls}
                placeholder="R$ 0,00"
                value={field.value ?? ''}
                onValueChange={({ floatValue }) => field.onChange(floatValue ?? 0)}
              />
            )}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Apartamento</label>
          <select {...register('apartamentoId')} className={inputCls}>
            <option value="">Selecione um apartamento</option>
            {(aptDisponiveis ?? []).map((a) => (
              <option key={a.id} value={a.id}>
                {a.numero}{a.bloco ? ` - Bloco ${a.bloco}` : ''}
              </option>
            ))}
          </select>
          {errors.apartamentoId && (
            <p className="text-red-500 text-xs mt-1">{errors.apartamentoId.message}</p>
          )}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Alertas de Vencimento
        </label>
        <div className="flex gap-6">
          {[30, 60, 90].map((d) => (
            <label key={d} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={alertDias.includes(d)}
                onChange={(e) => {
                  const current = alertDias
                  setValue(
                    'diasAlertaVencimento',
                    e.target.checked ? [...current, d] : current.filter((x) => x !== d)
                  )
                }}
                className="rounded border-gray-300 text-[#1E3A5F] w-4 h-4"
              />
              <span className="text-sm text-gray-700">{d} dias</span>
            </label>
          ))}
        </div>
      </div>

      {/* Dependentes obrigatórios quando quantidadeMoradores > 1 */}
      {fields.length > 0 && (
        <div className="space-y-4 pt-2 border-t border-gray-100">
          <div className="flex items-center gap-2 text-sm font-semibold text-[#1E3A5F]">
            <Users className="w-4 h-4" />
            Dependentes / Moradores Adicionais ({fields.length})
          </div>
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
            Todos os campos dos dependentes são obrigatórios.
          </p>

          {fields.map((field, idx) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const depErrors = (errors.dependentes as any)?.[idx] ?? {}
            return (
              <div key={field.id} className="border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50/40">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Dependente {idx + 1}
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Nome completo</label>
                    <input {...register(`dependentes.${idx}.nomeCompleto`)} className={inputCls} />
                    {depErrors.nomeCompleto && <p className="text-red-500 text-xs mt-1">{depErrors.nomeCompleto.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">CPF</label>
                    <Controller
                      name={`dependentes.${idx}._cpfDisplay`}
                      control={control}
                      render={({ field: f }) => (
                        <input
                          value={f.value ?? ''}
                          onChange={(e) => {
                            const raw = e.target.value.replace(/\D/g, '').slice(0, 11)
                            f.onChange(maskCPF(raw))
                            setValue(`dependentes.${idx}.cpf`, raw, { shouldValidate: true })
                          }}
                          className={inputCls}
                          placeholder="000.000.000-00"
                          inputMode="numeric"
                        />
                      )}
                    />
                    {depErrors.cpf && <p className="text-red-500 text-xs mt-1">{depErrors.cpf.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Estado Civil</label>
                    <select {...register(`dependentes.${idx}.estadoCivil`)} className={inputCls}>
                      {ESTADO_CIVIL.map((ec) => (
                        <option key={ec.value} value={ec.value}>{ec.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">RG</label>
                    <input {...register(`dependentes.${idx}.rg`)} className={inputCls} />
                    {depErrors.rg && <p className="text-red-500 text-xs mt-1">{depErrors.rg.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Órgão Emissor</label>
                    <input {...register(`dependentes.${idx}.orgaoEmissor`)} className={inputCls} placeholder="Ex: SSP-SP" />
                    {depErrors.orgaoEmissor && <p className="text-red-500 text-xs mt-1">{depErrors.orgaoEmissor.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Data de Nascimento</label>
                    <input {...register(`dependentes.${idx}.dataNascimento`)} type="date" className={inputCls} />
                    {depErrors.dataNascimento && <p className="text-red-500 text-xs mt-1">{depErrors.dataNascimento.message}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Telefone</label>
                    <input {...register(`dependentes.${idx}.telefone`)} className={inputCls} placeholder="11999998888" />
                    {depErrors.telefone && <p className="text-red-500 text-xs mt-1">{depErrors.telefone.message}</p>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Cadastrar Inquilino{fields.length > 0 ? ` + ${fields.length} dependente(s)` : ''}
        </Button>
      </div>
    </form>
  )
}

// —— Edit Form ——
function EditarInquilinoForm({
  inquilino,
  onSuccess,
  onCancel,
}: {
  inquilino: Inquilino
  onSuccess: () => void
  onCancel: () => void
}) {
  const editar = useEditarInquilino()

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
  } = useForm<EditarFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(editarSchema) as any,
    defaultValues: {
      nomeCompleto: inquilino.nomeCompleto,
      rg: inquilino.rg ?? '',
      orgaoEmissor: inquilino.orgaoEmissor ?? '',
      telefone: inquilino.telefone ?? '',
      estadoCivil: inquilino.estadoCivil ?? 'Solteiro',
      quantidadeMoradores: inquilino.quantidadeMoradores,
      dataVencimentoContrato: inquilino.dataVencimentoContrato,
      valorAluguel: inquilino.valorAluguel,
      garagem: inquilino.garagem ?? 0,
      diasAlertaVencimento: inquilino.diasAlertaVencimento ?? [],
    },
  })

  const alertDias = watch('diasAlertaVencimento') ?? []

  async function onSubmit(data: EditarFormData) {
    try {
      const res = await editar.mutateAsync({ id: inquilino.id, ...data })
      toast.success(res.data.mensagem)
      onSuccess()
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo</label>
        <input {...register('nomeCompleto')} className={inputCls} />
        {errors.nomeCompleto && (
          <p className="text-red-500 text-xs mt-1">{errors.nomeCompleto.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">RG</label>
          <input {...register('rg')} className={inputCls} placeholder="Ex: 12345678" />
          {errors.rg && <p className="text-red-500 text-xs mt-1">{errors.rg.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Órgão Emissor</label>
          <input {...register('orgaoEmissor')} className={inputCls} placeholder="SSP-SP" />
          {errors.orgaoEmissor && <p className="text-red-500 text-xs mt-1">{errors.orgaoEmissor.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefone</label>
          <input {...register('telefone')} className={inputCls} placeholder="11988887777" inputMode="numeric" />
          {errors.telefone && <p className="text-red-500 text-xs mt-1">{errors.telefone.message}</p>}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado Civil</label>
          <select {...register('estadoCivil')} className={inputCls}>
            {ESTADO_CIVIL.map((ec) => (
              <option key={ec.value} value={ec.value}>{ec.label}</option>
            ))}
          </select>
          {errors.estadoCivil && <p className="text-red-500 text-xs mt-1">{errors.estadoCivil.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Nº de Moradores</label>
          <input
            {...register('quantidadeMoradores')}
            type="number"
            min={1}
            className={inputCls}
          />
          {errors.quantidadeMoradores && (
            <p className="text-red-500 text-xs mt-1">{errors.quantidadeMoradores.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">
            Vencimento do Contrato
          </label>
          <input {...register('dataVencimentoContrato')} type="date" className={inputCls} />
          {errors.dataVencimentoContrato && (
            <p className="text-red-500 text-xs mt-1">{errors.dataVencimentoContrato.message}</p>
          )}
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
                thousandSeparator="."
                decimalSeparator=","
                prefix="R$ "
                decimalScale={2}
                fixedDecimalScale
                className={inputCls}
                value={field.value}
                onValueChange={({ floatValue }) => field.onChange(floatValue ?? 0)}
              />
            )}
          />
          {errors.valorAluguel && (
            <p className="text-red-500 text-xs mt-1">{errors.valorAluguel.message}</p>
          )}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1.5">Garagem (R$)</label>
          <Controller
            name="garagem"
            control={control}
            render={({ field }) => (
              <NumericFormat
                thousandSeparator="."
                decimalSeparator=","
                prefix="R$ "
                decimalScale={2}
                fixedDecimalScale
                className={inputCls}
                value={field.value ?? 0}
                onValueChange={({ floatValue }) => field.onChange(floatValue ?? 0)}
              />
            )}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Alertas de Vencimento
        </label>
        <div className="flex gap-6">
          {[30, 60, 90].map((d) => (
            <label key={d} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={alertDias.includes(d)}
                onChange={(e) => {
                  const current = alertDias
                  setValue(
                    'diasAlertaVencimento',
                    e.target.checked ? [...current, d] : current.filter((x) => x !== d)
                  )
                }}
                className="rounded border-gray-300 w-4 h-4"
              />
              <span className="text-sm text-gray-700">{d} dias</span>
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" isLoading={editar.isPending}>
          Salvar Alterações
        </Button>
      </div>
    </form>
  )
}

// —— Main Page ——
export function Inquilinos() {
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState<Inquilino | null>(null)
  const [deleteItem, setDeleteItem] = useState<Inquilino | null>(null)

  const { data: inquilinos, isLoading } = useInquilinos()
  const { data: apartamentos } = useApartamentos()
  const excluir = useExcluirInquilino()

  const aptMap = useMemo(
    () => Object.fromEntries((apartamentos ?? []).map((a) => [a.id, a])),
    [apartamentos]
  )

  async function handleDelete() {
    if (!deleteItem) return
    try {
      await excluir.mutateAsync(deleteItem.id)
      toast.success('Inquilino excluído e apartamento liberado.')
      setDeleteItem(null)
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex justify-end">
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="w-4 h-4" />
          Novo Inquilino
        </Button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100 bg-gray-50/60">
                <th className="px-5 py-3">Nome</th>
                <th className="px-5 py-3">CPF</th>
                <th className="px-5 py-3">Apartamento</th>
                <th className="px-5 py-3">Moradores</th>
                <th className="px-5 py-3">Venc. Contrato</th>
                <th className="px-5 py-3">Aluguel</th>
                <th className="px-5 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                <tr>
                  <td colSpan={7}>
                    <TableSkeleton rows={5} cols={7} />
                  </td>
                </tr>
              ) : !inquilinos || inquilinos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-gray-400">
                    Nenhum inquilino cadastrado
                  </td>
                </tr>
              ) : (
                inquilinos.map((inq) => {
                  const apt = aptMap[inq.apartamentoId]
                  return (
                    <tr key={inq.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <button
                          onClick={() => navigate(`/inquilinos/${inq.id}`)}
                          className="text-sm font-semibold text-[#1E3A5F] hover:underline flex items-center gap-1"
                        >
                          {inq.nomeCompleto}
                          <ChevronRight className="w-3 h-3 opacity-60" />
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">{formatCPF(inq.cpf)}</td>
                      <td className="px-5 py-3.5 text-sm text-gray-600">
                        {apt ? `${apt.numero}${apt.bloco ? ` - Bloco ${apt.bloco}` : ''}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 text-sm text-gray-600 text-center">
                        {inq.quantidadeMoradores}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-600">
                            {formatDate(inq.dataVencimentoContrato)}
                          </span>
                          {getContractBadge(inq.dataVencimentoContrato)}
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-sm font-semibold text-gray-900">
                        {formatCurrency(inq.valorAluguel)}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setEditItem(inq)}
                            className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                            title="Editar"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setDeleteItem(inq)}
                            className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 className="w-4 h-4" />
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

      {/* Create Modal */}
      <Modal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Novo Inquilino" size="xl">
        <CriarInquilinoForm onSuccess={() => setShowCreate(false)} onCancel={() => setShowCreate(false)} />
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={!!editItem}
        onClose={() => setEditItem(null)}
        title="Editar Inquilino"
        size="lg"
      >
        {editItem && (
          <EditarInquilinoForm
            inquilino={editItem}
            onSuccess={() => setEditItem(null)}
            onCancel={() => setEditItem(null)}
          />
        )}
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteItem}
        onClose={() => setDeleteItem(null)}
        onConfirm={handleDelete}
        title="Excluir Inquilino"
        description={`Tem certeza que deseja excluir ${deleteItem?.nomeCompleto}? O apartamento será liberado automaticamente.`}
        isLoading={excluir.isPending}
        confirmLabel="Excluir Inquilino"
      />
    </div>
  )
}


