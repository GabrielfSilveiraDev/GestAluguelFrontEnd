import { useEffect } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Settings, Zap, Droplets, Wifi, MessageCircle, QrCode } from 'lucide-react'
import { NumericFormat } from 'react-number-format'
import {
  useConfiguracoes,
  useAtualizarConfiguracoes,
  useCriarSubcontaAsaas,
  useAtualizarWhatsApp,
  useAtualizarPixNativo,
} from '../hooks/useConfiguracoes'
import { formatCurrency, extractApiError } from '../lib/utils'
import { Button } from '../components/ui/Button'

const configSchema = z.object({
  kwhValor: z.coerce.number().positive('Deve ser maior que zero'),
  valorAgua: z.coerce.number().min(0, 'Nao pode ser negativo'),
})

const asaasSchema = z.object({
  nome: z.string().min(3, 'Nome obrigatorio'),
  email: z.string().email('Email invalido'),
  cpfCnpj: z.string().min(11, 'CPF/CNPJ obrigatorio'),
  tipoPessoa: z.enum(['FISICA', 'JURIDICA']),
  telefone: z.string().optional(),
  site: z.string().optional(),
})

const whatsappSchema = z.object({
  numeroWhatsapp: z.string().min(10, 'Numero invalido').regex(/^\d+$/, 'Somente digitos'),
  mensagemPadrao: z.string().min(10, 'Mensagem muito curta'),
})

const pixNativoSchema = z.object({
  chavePix: z.string().min(1, 'Chave PIX obrigatoria'),
  nomeRecebedor: z.string().min(1, 'Nome obrigatorio'),
  cidadeRecebedor: z.string().min(1, 'Cidade obrigatoria'),
})

type ConfigFormData = z.infer<typeof configSchema>
type AsaasFormData = z.infer<typeof asaasSchema>
type WhatsAppFormData = z.infer<typeof whatsappSchema>
type PixNativoFormData = z.infer<typeof pixNativoSchema>

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1E3A5F] transition-colors'

export function Configuracoes() {
  const { data: config, isLoading } = useConfiguracoes()
  const atualizar = useAtualizarConfiguracoes()
  const criarSubconta = useCriarSubcontaAsaas()
  const atualizarWhatsApp = useAtualizarWhatsApp()
  const atualizarPixNativo = useAtualizarPixNativo()

  // — Globais —
  const {
    control, handleSubmit, reset, formState: { errors },
  } = useForm<ConfigFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(configSchema) as any,
    defaultValues: { kwhValor: 0, valorAgua: 0 },
  })

  // — Asaas —
  const {
    register: regAsaas, handleSubmit: handleAsaas, formState: { errors: errAsaas },
  } = useForm<AsaasFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(asaasSchema) as any,
    defaultValues: { tipoPessoa: 'FISICA' },
  })

  // — WhatsApp —
  const {
    register: regWa, handleSubmit: handleWa, reset: resetWa,
    watch: watchWa, formState: { errors: errWa },
  } = useForm<WhatsAppFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(whatsappSchema) as any,
    defaultValues: { numeroWhatsapp: '', mensagemPadrao: '' },
  })

  // — PIX Nativo —
  const {
    register: regPix, handleSubmit: handlePix, reset: resetPix,
    formState: { errors: errPix },
  } = useForm<PixNativoFormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(pixNativoSchema) as any,
    defaultValues: { chavePix: '', nomeRecebedor: '', cidadeRecebedor: '' },
  })

  useEffect(() => {
    if (config) {
      reset({ kwhValor: config.kwhValor, valorAgua: config.valorAgua })
      resetWa({
        numeroWhatsapp: config.numeroWhatsappLocador ?? '',
        mensagemPadrao: config.mensagemPadraoWhatsapp ?? '',
      })
      resetPix({
        chavePix: config.chavePix ?? '',
        nomeRecebedor: config.nomeRecebedorPix ?? '',
        cidadeRecebedor: config.cidadeRecebedorPix ?? '',
      })
    }
  }, [config, reset, resetWa, resetPix])

  async function onSubmitConfig(data: ConfigFormData) {
    try {
      const res = await atualizar.mutateAsync(data)
      toast.success(res.data.mensagem || 'Configuracoes salvas.')
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  async function onSubmitAsaas(data: AsaasFormData) {
    try {
      const res = await criarSubconta.mutateAsync({ ...data, cpfCnpj: data.cpfCnpj.replace(/\D/g, '') })
      toast.success(`Subconta Asaas criada: ${res.data.dados.nome}`)
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  async function onSubmitWhatsApp(data: WhatsAppFormData) {
    try {
      const res = await atualizarWhatsApp.mutateAsync(data)
      toast.success(res.data.mensagem || 'Configuracoes de WhatsApp salvas.')
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  async function onSubmitPix(data: PixNativoFormData) {
    try {
      const res = await atualizarPixNativo.mutateAsync(data)
      toast.success(res.data.mensagem || 'Configuracoes de PIX salvas.')
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  const mensagemVal = watchWa('mensagemPadrao') ?? ''

  return (
    <div className="max-w-2xl space-y-6">
      {/* Global Config */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
            <Settings className="w-5 h-5 text-[#1E3A5F]" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Configuracoes Globais</h2>
            <p className="text-xs text-gray-500">Tarifa e valores aplicados automaticamente nas novas faturas</p>
          </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse space-y-3">
            <div className="h-10 bg-gray-100 rounded-lg" />
            <div className="h-10 bg-gray-100 rounded-lg" />
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmitConfig)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-yellow-500" />
                  Tarifa kWh (R$/kWh)
                </label>
                <Controller
                  name="kwhValor"
                  control={control}
                  render={({ field }) => (
                    <NumericFormat
                      thousandSeparator="." decimalSeparator="," prefix="R$ "
                      decimalScale={4} fixedDecimalScale className={inputCls}
                      value={field.value}
                      onValueChange={({ floatValue }) => field.onChange(floatValue ?? 0)}
                    />
                  )}
                />
                {errors.kwhValor && <p className="text-red-500 text-xs mt-1">{errors.kwhValor.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-blue-400" />
                  Valor Fixo da Agua (R$)
                </label>
                <Controller
                  name="valorAgua"
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
                {errors.valorAgua && <p className="text-red-500 text-xs mt-1">{errors.valorAgua.message}</p>}
              </div>
            </div>

            {config && (
              <div className="rounded-lg bg-gray-50 px-4 py-3 text-xs text-gray-500 space-y-0.5">
                <p>Atual: <strong>{formatCurrency(config.kwhValor)}/kWh</strong> · Agua fixa: <strong>{formatCurrency(config.valorAgua)}</strong></p>
                <p>Ultima atualizacao: {new Date(config.atualizadoEm).toLocaleString('pt-BR')}</p>
              </div>
            )}

            <div className="flex justify-end">
              <Button type="submit" isLoading={atualizar.isPending}>Salvar Configuracoes</Button>
            </div>
          </form>
        )}
      </div>

      {/* WhatsApp */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
            <MessageCircle className="w-5 h-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">WhatsApp</h2>
            <p className="text-xs text-gray-500">Mensagem enviada ao inquilino ao clicar no ícone de WhatsApp nas faturas</p>
          </div>
        </div>

        <form onSubmit={handleWa(onSubmitWhatsApp)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Número WhatsApp (formato internacional)</label>
            <input
              {...regWa('numeroWhatsapp')}
              className={inputCls}
              placeholder="5511999999999"
              inputMode="numeric"
            />
            <p className="text-xs text-gray-400 mt-1">Somente dígitos, com DDI e DDD. Ex: 5511999999999</p>
            {errWa.numeroWhatsapp && <p className="text-red-500 text-xs mt-1">{errWa.numeroWhatsapp.message}</p>}
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">Mensagem Padrão</label>
              <span className="text-xs text-gray-400">{mensagemVal.length} caracteres</span>
            </div>
            <textarea
              {...regWa('mensagemPadrao')}
              rows={4}
              className={`${inputCls} resize-y`}
              placeholder="Olá {inquilino}, sua fatura de {mesReferencia} no valor de {valorTotal} vence em {dataVencimento}. PIX: {codigoPix}"
            />
            <div className="flex flex-wrap gap-1.5 mt-2">
              {['{inquilino}', '{mesReferencia}', '{valorTotal}', '{dataVencimento}', '{codigoPix}'].map((p) => (
                <span key={p} className="inline-block bg-gray-100 text-gray-600 text-xs px-2 py-0.5 rounded font-mono">{p}</span>
              ))}
            </div>
            {errWa.mensagemPadrao && <p className="text-red-500 text-xs mt-1">{errWa.mensagemPadrao.message}</p>}
          </div>
          <div className="flex justify-end">
            <Button type="submit" isLoading={atualizarWhatsApp.isPending}>Salvar WhatsApp</Button>
          </div>
        </form>
      </div>

      {/* PIX Nativo */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center">
            <QrCode className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">PIX Nativo</h2>
            <p className="text-xs text-gray-500">Dados para geração do código PIX sem integração Asaas</p>
          </div>
        </div>

        <form onSubmit={handlePix(onSubmitPix)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Chave PIX</label>
            <input
              {...regPix('chavePix')}
              className={inputCls}
              placeholder="CPF, e-mail, telefone ou chave aleatória"
            />
            {errPix.chavePix && <p className="text-red-500 text-xs mt-1">{errPix.chavePix.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
              <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Nome do Recebedor</label>
              </div>
              <input
                {...regPix('nomeRecebedor')}
                className={inputCls}
                placeholder="Joao Silva"
              />
              {errPix.nomeRecebedor && <p className="text-red-500 text-xs mt-1">{errPix.nomeRecebedor.message}</p>}
            </div>
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-gray-700">Cidade do Recebedor</label>
              </div>
              <input
                {...regPix('cidadeRecebedor')}
                className={inputCls}
                placeholder="Sao Paulo"
              />
              {errPix.cidadeRecebedor && <p className="text-red-500 text-xs mt-1">{errPix.cidadeRecebedor.message}</p>}
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" isLoading={atualizarPixNativo.isPending}>Salvar PIX Nativo</Button>
          </div>
        </form>
      </div>

      {/* Asaas */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-teal-50 rounded-xl flex items-center justify-center">
            <Wifi className="w-5 h-5 text-teal-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Integracao Asaas (PIX)</h2>
            <p className="text-xs text-gray-500">Cadastre a subconta para gerar PIX automatico</p>
          </div>
        </div>

        {config?.walletIdAsaas ? (
          <div className="mt-4 rounded-lg bg-green-50 border border-green-100 px-4 py-3">
            <p className="text-sm text-green-700 font-medium">Subconta ativa</p>
            <p className="text-xs text-green-600 mt-0.5">Wallet ID: <code className="font-mono">{config.walletIdAsaas}</code></p>
          </div>
        ) : (
          <form onSubmit={handleAsaas(onSubmitAsaas)} className="mt-4 space-y-4">
            <div className="rounded-lg bg-amber-50 border border-amber-100 px-4 py-3 text-xs text-amber-700">
              Subconta nao configurada. Cadastre abaixo para habilitar geracao de PIX via Asaas.
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo / Razao social</label>
                <input {...regAsaas('nome')} className={inputCls} />
                {errAsaas.nome && <p className="text-red-500 text-xs mt-1">{errAsaas.nome.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input {...regAsaas('email')} type="email" className={inputCls} />
                {errAsaas.email && <p className="text-red-500 text-xs mt-1">{errAsaas.email.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">CPF / CNPJ</label>
                <input {...regAsaas('cpfCnpj')} className={inputCls} placeholder="Somente digitos" />
                {errAsaas.cpfCnpj && <p className="text-red-500 text-xs mt-1">{errAsaas.cpfCnpj.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Pessoa</label>
                <select {...regAsaas('tipoPessoa')} className={inputCls}>
                  <option value="FISICA">Fisica</option>
                  <option value="JURIDICA">Juridica</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Telefone (opcional)</label>
                <input {...regAsaas('telefone')} className={inputCls} placeholder="11999998888" />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" isLoading={criarSubconta.isPending}>Criar Subconta Asaas</Button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

