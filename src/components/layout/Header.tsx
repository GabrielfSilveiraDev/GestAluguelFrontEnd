import { useState, useMemo, useCallback } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Bell, LogOut, AlertCircle, CalendarClock } from 'lucide-react'
import { useInquilinosContratoProximo } from '../../hooks/useInquilinos'
import { useFaturasVencidas } from '../../hooks/useFaturas'
import { formatDate, diasAteVencimento } from '../../lib/utils'

const SEEN_KEY = 'notificacoes_vistas'

function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function saveSeen(seen: Set<string>) {
  localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]))
}

function getTitle(pathname: string): string {
  if (pathname === '/') return 'Dashboard'
  if (pathname === '/apartamentos') return 'Apartamentos'
  if (pathname === '/inquilinos') return 'Inquilinos'
  if (pathname.startsWith('/inquilinos/')) return 'Detalhes do Inquilino'
  if (pathname === '/faturas') return 'Faturas'
  return 'GestAluguel'
}

export function Header() {
  const location = useLocation()
  const navigate = useNavigate()
  const [showNotifications, setShowNotifications] = useState(false)
  const [seen, setSeen] = useState<Set<string>>(loadSeen)

  const { data: expiring } = useInquilinosContratoProximo(90)
  const { data: vencidas } = useFaturasVencidas()

  const title = getTitle(location.pathname)
  const nomeCompleto = localStorage.getItem('nomeCompleto') ?? 'Admin'

  // Build unified notification list
  const notifications = useMemo(() => {
    const list: Array<{
      id: string
      tipo: 'contrato' | 'fatura'
      label: string
      sublabel: string
      urgency: 'high' | 'medium' | 'low'
      href: string
    }> = []

    for (const inq of expiring ?? []) {
      const dias = diasAteVencimento(inq.dataVencimentoContrato)
      list.push({
        id: `contrato-${inq.id}`,
        tipo: 'contrato',
        label: inq.nomeCompleto,
        sublabel: `Contrato vence em ${dias} dia${dias !== 1 ? 's' : ''} — ${formatDate(inq.dataVencimentoContrato)}`,
        urgency: dias <= 30 ? 'high' : dias <= 60 ? 'medium' : 'low',
        href: `/inquilinos/${inq.id}`,
      })
    }

    for (const fat of vencidas ?? []) {
      list.push({
        id: `fatura-${fat.id}`,
        tipo: 'fatura',
        label: `Fatura vencida — ${fat.mesReferencia}`,
        sublabel: `Venceu em ${formatDate(fat.dataLimitePagamento)}`,
        urgency: 'high',
        href: `/inquilinos/${fat.inquilinoId}`,
      })
    }

    return list
  }, [expiring, vencidas])

  const unseenCount = useMemo(
    () => notifications.filter((n) => !seen.has(n.id)).length,
    [notifications, seen]
  )

  const markSeen = useCallback(
    (id: string) => {
      if (seen.has(id)) return
      const next = new Set(seen)
      next.add(id)
      setSeen(next)
      saveSeen(next)
    },
    [seen]
  )

  function handleNotifClick(href: string, id: string) {
    markSeen(id)
    setShowNotifications(false)
    navigate(href)
  }

  function handleLogout() {
    localStorage.removeItem('token')
    localStorage.removeItem('perfil')
    localStorage.removeItem('nomeCompleto')
    localStorage.removeItem('inquilinoId')
    navigate('/login')
  }

  function urgencyColor(u: 'high' | 'medium' | 'low') {
    if (u === 'high') return 'text-red-600'
    if (u === 'medium') return 'text-amber-600'
    return 'text-yellow-600'
  }

  return (
    <header className="fixed top-0 left-64 right-0 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-30 shadow-sm">
      <h1 className="text-xl font-semibold text-gray-900">{title}</h1>

      <div className="flex items-center gap-3">
        {/* Notifications */}
        <div className="relative">
          <button
            className="relative p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
            onClick={() => setShowNotifications(!showNotifications)}
          >
            <Bell className="w-5 h-5" />
            {unseenCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {unseenCount > 9 ? '9+' : unseenCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">Notificações</h3>
                {unseenCount > 0 && (
                  <span className="text-xs text-gray-400">{unseenCount} não lida{unseenCount !== 1 ? 's' : ''}</span>
                )}
              </div>

              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-400">
                  Nenhuma notificação pendente
                </div>
              ) : (
                <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
                  {notifications.map((n) => {
                    const isSeen = seen.has(n.id)
                    return (
                      <button
                        key={n.id}
                        onMouseEnter={() => markSeen(n.id)}
                        onClick={() => handleNotifClick(n.href, n.id)}
                        className={`w-full text-left p-3 flex items-start gap-2.5 transition-colors hover:bg-blue-50/60 ${
                          isSeen ? 'opacity-60' : 'bg-white'
                        }`}
                      >
                        <div className={`mt-0.5 flex-shrink-0 ${urgencyColor(n.urgency)}`}>
                          {n.tipo === 'fatura' ? (
                            <AlertCircle className="w-4 h-4" />
                          ) : (
                            <CalendarClock className="w-4 h-4" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className={`text-sm font-medium text-gray-900 truncate ${!isSeen ? 'font-semibold' : ''}`}>
                            {n.label}
                          </p>
                          <p className={`text-xs mt-0.5 ${urgencyColor(n.urgency)}`}>
                            {n.sublabel}
                          </p>
                        </div>
                        {!isSeen && (
                          <span className="mt-1.5 flex-shrink-0 w-2 h-2 rounded-full bg-red-500" />
                        )}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* User + Logout */}
        <div className="flex items-center gap-2 pl-3 border-l border-gray-200">
          <span className="text-sm text-gray-600 hidden sm:block">{nomeCompleto}</span>
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
            title="Sair"
          >
            <LogOut className="w-4.5 h-4.5" />
          </button>
        </div>
      </div>

      {showNotifications && (
        <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
      )}
    </header>
  )
}
