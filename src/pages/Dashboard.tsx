import { useMemo } from 'react'
import { Building2, Users, Clock, AlertTriangle, TrendingUp, CheckCircle2 } from 'lucide-react'
import { useApartamentos } from '../hooks/useApartamentos'
import { useInquilinos, useInquilinosContratoProximo } from '../hooks/useInquilinos'
import { useFaturasPorStatus } from '../hooks/useFaturas'
import { useBalancoMensal } from '../hooks/useFinanceiro'
import { formatCurrency, formatDate, diasAteVencimento, getCurrentMonth } from '../lib/utils'
import { Badge } from '../components/ui/Badge'
import { TableSkeleton } from '../components/ui/TableSkeleton'

function getStatusBadge(statusDescricao: string) {
  if (statusDescricao === 'Pago') return <Badge variant="success">Pago</Badge>
  if (statusDescricao === 'Atrasado') return <Badge variant="danger">Atrasado</Badge>
  return <Badge variant="neutral">Pendente</Badge>
}

export function Dashboard() {
  const { data: apartamentos } = useApartamentos()
  const { data: inquilinos } = useInquilinos()
  const { data: expiring } = useInquilinosContratoProximo(90)
  const { data: pendentes, isLoading: loadingP } = useFaturasPorStatus(1)
  const { data: atrasadas, isLoading: loadingA } = useFaturasPorStatus(2)
  const { data: pagas } = useFaturasPorStatus(3)

  const now = new Date()
  const { data: balanco } = useBalancoMensal(now.getFullYear(), now.getMonth() + 1)

  const currentMonth = getCurrentMonth()

  const totalApt = apartamentos?.length ?? 0
  const ocupados = apartamentos?.filter((a) => a.ocupado).length ?? 0
  const disponiveis = totalApt - ocupados
  const totalPendentes = pendentes?.length ?? 0
  const totalAtrasadas = atrasadas?.length ?? 0
  const receitaMes = balanco?.totalReceitas ?? 0

  const faturasMes = useMemo(() => {
    const all = [...(pendentes ?? []), ...(atrasadas ?? []), ...(pagas ?? [])]
    return all.filter((f) => f.mesReferencia === currentMonth)
  }, [pendentes, atrasadas, pagas, currentMonth])

  const inquilinoMap = useMemo(
    () => Object.fromEntries((inquilinos ?? []).map((i) => [i.id, i])),
    [inquilinos]
  )

  const alerts30 = useMemo(
    () => (expiring ?? []).filter((i) => diasAteVencimento(i.dataVencimentoContrato) <= 30),
    [expiring]
  )
  const alerts60 = useMemo(
    () =>
      (expiring ?? []).filter((i) => {
        const d = diasAteVencimento(i.dataVencimentoContrato)
        return d > 30 && d <= 60
      }),
    [expiring]
  )
  const alerts90 = useMemo(
    () =>
      (expiring ?? []).filter((i) => {
        const d = diasAteVencimento(i.dataVencimentoContrato)
        return d > 60 && d <= 90
      }),
    [expiring]
  )

  const cards = [
    { title: 'Total de Apartamentos', value: totalApt, icon: Building2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Apartamentos Ocupados', value: ocupados, icon: Users, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { title: 'Apartamentos Disponíveis', value: disponiveis, icon: Building2, color: 'text-green-600', bg: 'bg-green-50' },
    { title: 'Faturas Pendentes', value: totalPendentes, icon: Clock, color: 'text-gray-600', bg: 'bg-gray-100' },
    { title: 'Faturas em Atraso', value: totalAtrasadas, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
    { title: 'Receita do Mês', value: formatCurrency(receitaMes), icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50', isString: true },
  ]

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div key={card.title} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">{card.title}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{card.value}</p>
            </div>
            <div className={`w-12 h-12 ${card.bg} ${card.color} rounded-xl flex items-center justify-center shrink-0`}>
              <card.icon className="w-6 h-6" />
            </div>
          </div>
        ))}
      </div>

      {/* Contract Alerts */}
      {(alerts30.length > 0 || alerts60.length > 0 || alerts90.length > 0) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            Contratos Próximos do Vencimento
          </h2>
          <div className="space-y-4">
            {alerts30.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-red-600 mb-2">≤ 30 dias ({alerts30.length})</p>
                <div className="flex flex-wrap gap-2">
                  {alerts30.map((i) => (
                    <span key={i.id} className="inline-flex items-center px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                      {i.nomeCompleto} — <span className="ml-1 font-bold">{diasAteVencimento(i.dataVencimentoContrato)}d</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {alerts60.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-amber-600 mb-2">31 – 60 dias ({alerts60.length})</p>
                <div className="flex flex-wrap gap-2">
                  {alerts60.map((i) => (
                    <span key={i.id} className="inline-flex items-center px-3 py-1 bg-amber-100 text-amber-800 rounded-full text-sm font-medium">
                      {i.nomeCompleto} — <span className="ml-1 font-bold">{diasAteVencimento(i.dataVencimentoContrato)}d</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
            {alerts90.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-yellow-600 mb-2">61 – 90 dias ({alerts90.length})</p>
                <div className="flex flex-wrap gap-2">
                  {alerts90.map((i) => (
                    <span key={i.id} className="inline-flex items-center px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                      {i.nomeCompleto} — <span className="ml-1 font-bold">{diasAteVencimento(i.dataVencimentoContrato)}d</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Faturas Atrasadas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <h2 className="text-base font-semibold text-gray-900">Faturas Atrasadas</h2>
            {totalAtrasadas > 0 && (
              <span className="ml-auto text-xs bg-red-100 text-red-700 font-medium px-2 py-0.5 rounded-full">
                {totalAtrasadas}
              </span>
            )}
          </div>
          {loadingA ? (
            <TableSkeleton rows={4} cols={4} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 border-b border-gray-100 bg-gray-50/50">
                    <th className="px-5 py-3">Inquilino</th>
                    <th className="px-5 py-3">Mês Ref.</th>
                    <th className="px-5 py-3">Total</th>
                    <th className="px-5 py-3">Vencimento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(atrasadas ?? []).slice(0, 8).map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-sm text-gray-900 font-medium">
                        {inquilinoMap[f.inquilinoId]?.nomeCompleto ?? 'N/A'}
                      </td>
                      <td className="px-5 py-3 text-sm text-gray-600">{f.mesReferencia}</td>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900">{formatCurrency(f.valorTotal)}</td>
                      <td className="px-5 py-3 text-sm text-red-600 font-medium">{formatDate(f.dataLimitePagamento)}</td>
                    </tr>
                  ))}
                  {(!atrasadas || atrasadas.length === 0) && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">
                        <CheckCircle2 className="w-8 h-8 text-green-300 mx-auto mb-2" />
                        Nenhuma fatura atrasada
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Faturas do Mês Atual */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-500" />
            <h2 className="text-base font-semibold text-gray-900">Faturas do Mês ({currentMonth})</h2>
            {faturasMes.length > 0 && (
              <span className="ml-auto text-xs bg-blue-100 text-blue-700 font-medium px-2 py-0.5 rounded-full">
                {faturasMes.length}
              </span>
            )}
          </div>
          {(loadingP || loadingA) ? (
            <TableSkeleton rows={4} cols={4} />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs font-medium text-gray-500 border-b border-gray-100 bg-gray-50/50">
                    <th className="px-5 py-3">Inquilino</th>
                    <th className="px-5 py-3">Total</th>
                    <th className="px-5 py-3">Status</th>
                    <th className="px-5 py-3">Vencimento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {faturasMes.slice(0, 8).map((f) => (
                    <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 text-sm text-gray-900 font-medium">
                        {inquilinoMap[f.inquilinoId]?.nomeCompleto ?? 'N/A'}
                      </td>
                      <td className="px-5 py-3 text-sm font-semibold text-gray-900">{formatCurrency(f.valorTotal)}</td>
                      <td className="px-5 py-3">{getStatusBadge(f.statusDescricao)}</td>
                      <td className="px-5 py-3 text-sm text-gray-600">{formatDate(f.dataLimitePagamento)}</td>
                    </tr>
                  ))}
                  {faturasMes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-sm text-gray-400">
                        Nenhuma fatura neste mês
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

