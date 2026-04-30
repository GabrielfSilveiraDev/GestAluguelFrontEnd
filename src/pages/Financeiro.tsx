import { useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, ChevronLeft, ChevronRight } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { useBalancoMensal, useBalancoAnual } from '../hooks/useFinanceiro'
import { formatCurrency } from '../lib/utils'

const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']

export function Financeiro() {
  const now = new Date()
  const [ano, setAno] = useState(now.getFullYear())
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [viewMode, setViewMode] = useState<'mensal' | 'anual'>('mensal')

  const { data: balMensal, isLoading: loadingMensal } = useBalancoMensal(ano, mes)
  const { data: balAnual, isLoading: loadingAnual } = useBalancoAnual(ano)

  function navMes(dir: -1 | 1) {
    const d = new Date(ano, mes - 1 + dir, 1)
    setAno(d.getFullYear())
    setMes(d.getMonth() + 1)
  }

  // Build 12-month chart data (fill missing months with 0)
  const chartDataAnual = Array.from({ length: 12 }, (_, i) => {
    const m = i + 1
    const found = balAnual?.meses.find((x) => x.mes === m)
    return {
      mes: MESES[i],
      Receitas: found?.totalReceitas ?? 0,
      Gastos: found?.totalGastos ?? 0,
      Liquido: found?.balancoLiquido ?? 0,
    }
  })

  const isLoading = viewMode === 'mensal' ? loadingMensal : loadingAnual

  return (
    <div className="space-y-6">
      {/* View toggle + navigation */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          <button
            onClick={() => setViewMode('mensal')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'mensal' ? 'bg-white text-[#1E3A5F] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Mensal
          </button>
          <button
            onClick={() => setViewMode('anual')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              viewMode === 'anual' ? 'bg-white text-[#1E3A5F] shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Anual
          </button>
        </div>

        {viewMode === 'mensal' ? (
          <div className="flex items-center gap-3">
            <button
              onClick={() => navMes(-1)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-900 min-w-[100px] text-center">
              {MESES[mes - 1]} {ano}
            </span>
            <button
              onClick={() => navMes(1)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <button
              onClick={() => setAno((y) => y - 1)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-gray-900 min-w-[60px] text-center">{ano}</span>
            <button
              onClick={() => setAno((y) => y + 1)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="grid grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
          </div>
          <div className="h-72 bg-gray-100 rounded-xl" />
        </div>
      ) : viewMode === 'mensal' && balMensal ? (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Receitas</p>
                <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(balMensal.totalReceitas)}</p>
              </div>
              <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Gastos</p>
                <p className="text-xl font-bold text-red-500 mt-1">{formatCurrency(balMensal.totalGastos)}</p>
              </div>
              <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Balanco Liquido</p>
                <p className={`text-xl font-bold mt-1 ${balMensal.balancoLiquido >= 0 ? 'text-[#1E3A5F]' : 'text-red-500'}`}>
                  {formatCurrency(balMensal.balancoLiquido)}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-50 text-[#1E3A5F] rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Table por apartamento */}
          {balMensal.apartamentos.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-semibold text-gray-900">Detalhe por Apartamento</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100 bg-gray-50/60">
                      <th className="px-5 py-3">Apartamento</th>
                      <th className="px-5 py-3">Receitas</th>
                      <th className="px-5 py-3">Gastos Manut.</th>
                      <th className="px-5 py-3">Balanco</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {balMensal.apartamentos.map((apt) => (
                      <tr key={apt.apartamentoId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 font-medium text-gray-900">
                          {apt.apartamentoNumero}{apt.apartamentoBloco ? ` — Bl. ${apt.apartamentoBloco}` : ''}
                        </td>
                        <td className="px-5 py-3 text-green-600 font-medium">{formatCurrency(apt.totalReceitas)}</td>
                        <td className="px-5 py-3 text-red-500">{formatCurrency(apt.totalGastos)}</td>
                        <td className={`px-5 py-3 font-bold ${apt.balancoLiquido >= 0 ? 'text-[#1E3A5F]' : 'text-red-500'}`}>
                          {formatCurrency(apt.balancoLiquido)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : viewMode === 'anual' && balAnual ? (
        <>
          {/* Annual summary cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Receitas {ano}</p>
                <p className="text-xl font-bold text-green-600 mt-1">{formatCurrency(balAnual.totalReceitas)}</p>
              </div>
              <div className="w-10 h-10 bg-green-50 text-green-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Total Gastos {ano}</p>
                <p className="text-xl font-bold text-red-500 mt-1">{formatCurrency(balAnual.totalGastos)}</p>
              </div>
              <div className="w-10 h-10 bg-red-50 text-red-500 rounded-xl flex items-center justify-center">
                <TrendingDown className="w-5 h-5" />
              </div>
            </div>
            <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 flex items-center justify-between">
              <div>
                <p className="text-xs text-gray-500">Balanco Liquido {ano}</p>
                <p className={`text-xl font-bold mt-1 ${balAnual.balancoLiquido >= 0 ? 'text-[#1E3A5F]' : 'text-red-500'}`}>
                  {formatCurrency(balAnual.balancoLiquido)}
                </p>
              </div>
              <div className="w-10 h-10 bg-blue-50 text-[#1E3A5F] rounded-xl flex items-center justify-center">
                <DollarSign className="w-5 h-5" />
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Evolucao Mensal {ano}</h3>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartDataAnual} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickFormatter={(v) => `R$${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(value: unknown) => formatCurrency(Number(value))}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Receitas" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Liquido" fill="#1E3A5F" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Monthly table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Resumo Mensal</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-gray-500 border-b border-gray-100 bg-gray-50/60">
                    <th className="px-5 py-3">Mes</th>
                    <th className="px-5 py-3">Receitas</th>
                    <th className="px-5 py-3">Gastos</th>
                    <th className="px-5 py-3">Balanco</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {balAnual.meses.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-5 py-8 text-center text-gray-400 text-sm">Nenhum dado para {ano}</td>
                    </tr>
                  ) : balAnual.meses.map((m) => (
                    <tr
                      key={m.mes}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => { setMes(m.mes); setViewMode('mensal') }}
                    >
                      <td className="px-5 py-3 font-medium text-[#1E3A5F] hover:underline">{m.mesReferencia}</td>
                      <td className="px-5 py-3 text-green-600">{formatCurrency(m.totalReceitas)}</td>
                      <td className="px-5 py-3 text-red-500">{formatCurrency(m.totalGastos)}</td>
                      <td className={`px-5 py-3 font-bold ${m.balancoLiquido >= 0 ? 'text-[#1E3A5F]' : 'text-red-500'}`}>
                        {formatCurrency(m.balancoLiquido)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="bg-white rounded-xl p-12 text-center text-gray-400 shadow-sm border border-gray-100">
          Nenhum dado disponivel para o periodo selecionado.
        </div>
      )}
    </div>
  )
}


