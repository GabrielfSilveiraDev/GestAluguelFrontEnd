import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { User, FileText, Receipt, LogOut, Building2, Download, ClipboardCopy } from 'lucide-react'
import api from '../lib/api'
import type { RespostaApi, PortalInquilino, PortalFatura, PortalContrato } from '../types'
import { formatCurrency, formatDate, formatCPF } from '../lib/utils'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { TableSkeleton } from '../components/ui/TableSkeleton'

function getFaturaBadge(status: string) {
  if (status === 'Pago') return <Badge variant="success">Pago</Badge>
  if (status === 'Atrasado') return <Badge variant="danger">Atrasado</Badge>
  return <Badge variant="warning">Pendente</Badge>
}

// ——— Meus Dados ———
function MeusDados() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['portal-meus-dados'],
    queryFn: async () => {
      const res = await api.get<RespostaApi<PortalInquilino>>('/portal/meus-dados')
      return res.data.dados
    },
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="animate-pulse space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-4 bg-gray-100 rounded w-3/4" />
          ))}
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center text-sm text-gray-400">
        Não foi possível carregar seus dados.
      </div>
    )
  }

  const fields: { label: string; value: string }[] = [
    { label: 'Nome completo', value: data.nomeCompleto },
    { label: 'CPF', value: formatCPF(data.cpf) },
    { label: 'Data de Nascimento', value: formatDate(data.dataNascimento) },
    { label: 'Apartamento', value: `${data.numeroApartamento}${data.blocoApartamento ? ` - Bloco ${data.blocoApartamento}` : ''}` },
    { label: 'Moradores', value: String(data.quantidadeMoradores) },
    { label: 'Data de Entrada', value: formatDate(data.dataEntrada) },
    { label: 'Vencimento do Contrato', value: formatDate(data.dataVencimentoContrato) },
    { label: 'Valor do Aluguel', value: formatCurrency(data.valorAluguel) },
    ...(data.garagem > 0 ? [{ label: 'Garagem', value: formatCurrency(data.garagem) }] : []),
  ]

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm divide-y divide-gray-50">
      {fields.map((f) => (
        <div key={f.label} className="flex items-center justify-between px-5 py-3.5">
          <span className="text-sm text-gray-500">{f.label}</span>
          <span className="text-sm font-medium text-gray-900">{f.value}</span>
        </div>
      ))}
    </div>
  )
}

// ——— Minhas Faturas ———
function MinhasFaturas() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['portal-faturas'],
    queryFn: async () => {
      const res = await api.get<RespostaApi<PortalFatura[]>>('/portal/faturas')
      return res.data.dados
    },
  })

  async function handleCopiarPix(fatura: PortalFatura) {
    try {
      const token = localStorage.getItem('token')
      const res = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:5101/api'}/faturas/${fatura.id}/pix-nativo`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      if (!res.ok) {
        toast.warning('PIX não disponível para esta fatura.')
        return
      }
      const codigo = await res.text()
      await navigator.clipboard.writeText(codigo)
      toast.success('Código PIX copiado!')
    } catch {
      toast.error('Erro ao copiar código PIX.')
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <TableSkeleton rows={4} cols={7} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center text-sm text-gray-400">
        Não foi possível carregar suas faturas.
      </div>
    )
  }

  const faturas = data ?? []

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100 bg-gray-50/60">
              <th className="px-4 py-3">Apartamento</th>
              <th className="px-4 py-3">Mês</th>
              <th className="px-4 py-3">Aluguel</th>
              <th className="px-4 py-3">Água</th>
              <th className="px-4 py-3">Luz</th>
              <th className="px-4 py-3 font-bold">Total</th>
              <th className="px-4 py-3">Vencimento</th>
              <th className="px-4 py-3">Pagamento</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">PIX</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {faturas.length === 0 ? (
              <tr>
                <td colSpan={10} className="px-4 py-10 text-center text-gray-400">
                  Nenhuma fatura encontrada.
                </td>
              </tr>
            ) : (
              faturas.map((f) => {
                const isPago = f.status === 'Pago'
                const aptLabel = f.blocoApartamento
                  ? `${f.numeroApartamento} - Bloco ${f.blocoApartamento}`
                  : (f.numeroApartamento || '—')
                return (
                  <tr key={f.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{aptLabel}</td>
                    <td className="px-4 py-3 font-medium">{f.mesReferencia}</td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(f.valorAluguel)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(f.valorAgua)}</td>
                    <td className="px-4 py-3 text-gray-600">{formatCurrency(f.valorLuz)}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatCurrency(f.valorTotal)}</td>
                    <td className={`px-4 py-3 ${f.status === 'Atrasado' ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                      {formatDate(f.dataLimitePagamento)}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{formatDate(f.dataPagamento)}</td>
                    <td className="px-4 py-3">{getFaturaBadge(f.status)}</td>
                    <td className="px-4 py-3 text-right">
                      {!isPago && (
                        <button
                          onClick={() => handleCopiarPix(f)}
                          className="p-1.5 rounded-lg hover:bg-orange-50 text-orange-500 transition-colors"
                          title="Copiar código PIX"
                        >
                          <ClipboardCopy className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ——— Meus Contratos ———
function MeusContratos() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['portal-contratos'],
    queryFn: async () => {
      const res = await api.get<RespostaApi<PortalContrato[]>>('/portal/contratos')
      return res.data.dados
    },
  })

  async function handleDownload(contrato: PortalContrato) {
    try {
      const res = await api.get(`/contratos/${contrato.id}/download`, { responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = contrato.nomeOriginalArquivo
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      toast.error('Erro ao baixar contrato.')
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <TableSkeleton rows={2} cols={4} />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 text-center text-sm text-gray-400">
        Não foi possível carregar seus contratos.
      </div>
    )
  }

  const contratos = data ?? []

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100 bg-gray-50/60">
              <th className="px-4 py-3">Arquivo</th>
              <th className="px-4 py-3">Descrição</th>
              <th className="px-4 py-3">Tamanho</th>
              <th className="px-4 py-3">Enviado em</th>
              <th className="px-4 py-3 text-right">Download</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {contratos.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-400">
                  Nenhum contrato disponível.
                </td>
              </tr>
            ) : (
              contratos.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[180px] truncate">
                    {c.nomeOriginalArquivo}
                  </td>
                  <td className="px-4 py-3 text-gray-600">{c.descricao ?? '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{c.tamanhoFormatado}</td>
                  <td className="px-4 py-3 text-gray-600">{formatDate(c.criadoEm)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleDownload(c)}
                      className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors"
                      title="Baixar contrato"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ——— Portal Principal ———
type PortalTab = 'dados' | 'faturas' | 'contratos'

export function Portal() {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<PortalTab>('dados')
  const nomeCompleto = localStorage.getItem('nomeCompleto') ?? 'Inquilino'

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('perfil')
    localStorage.removeItem('nomeCompleto')
    localStorage.removeItem('inquilinoId')
    navigate('/login')
  }

  const tabs: { key: PortalTab; label: string; icon: React.ReactNode }[] = [
    { key: 'dados', label: 'Meus Dados', icon: <User className="w-4 h-4" /> },
    { key: 'faturas', label: 'Minhas Faturas', icon: <Receipt className="w-4 h-4" /> },
    { key: 'contratos', label: 'Meus Contratos', icon: <FileText className="w-4 h-4" /> },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1E3A5F] text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 bg-white/10 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-lg leading-tight">GestAluguel</p>
              <p className="text-blue-200 text-xs">Portal do Inquilino</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-blue-100 hidden sm:block">{nomeCompleto}</span>
            <Button
              variant="secondary"
              onClick={handleLogout}
              className="!bg-white/10 !text-white !border-white/20 hover:!bg-white/20 !text-sm"
            >
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Olá, {nomeCompleto.split(' ')[0]}!</h1>
          <p className="text-gray-500 text-sm mt-1">Bem-vindo ao seu portal de inquilino.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-gray-200">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === t.key
                  ? 'border-[#1E3A5F] text-[#1E3A5F]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'dados' && <MeusDados />}
        {activeTab === 'faturas' && <MinhasFaturas />}
        {activeTab === 'contratos' && <MeusContratos />}
      </main>
    </div>
  )
}

