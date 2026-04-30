import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Building2, Users, FileText, BarChart2, Wrench, Settings } from 'lucide-react'
import { cn } from '../../lib/utils'

const navItems = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/apartamentos', icon: Building2, label: 'Apartamentos' },
  { to: '/inquilinos', icon: Users, label: 'Inquilinos' },
  { to: '/faturas', icon: FileText, label: 'Faturas' },
  { to: '/financeiro', icon: BarChart2, label: 'Financeiro' },
  { to: '/gastos', icon: Wrench, label: 'Manutencao' },
  { to: '/configuracoes', icon: Settings, label: 'Configuracoes' },
]

export function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#1E3A5F] text-white flex flex-col z-40">
      <div className="px-6 py-5 border-b border-white/10">
        <h1 className="text-xl font-bold tracking-tight">GestAluguel</h1>
        <p className="text-xs text-blue-300 mt-0.5">Gestao de Alugueis Residenciais</p>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors text-sm font-medium',
                isActive
                  ? 'bg-white/20 text-white shadow-sm'
                  : 'text-blue-200 hover:bg-white/10 hover:text-white'
              )
            }
          >
            <Icon className="w-5 h-5 shrink-0" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="px-6 py-4 border-t border-white/10">
        <p className="text-xs text-blue-300">© {new Date().getFullYear()} GestAluguel</p>
      </div>
    </aside>
  )
}
