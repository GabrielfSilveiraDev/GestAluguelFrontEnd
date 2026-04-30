import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Apartamentos } from './pages/Apartamentos'
import { Inquilinos } from './pages/Inquilinos'
import { InquilinoDetalhe } from './pages/InquilinoDetalhe'
import { Faturas } from './pages/Faturas'
import { Financeiro } from './pages/Financeiro'
import { GastosManutencao } from './pages/GastosManutencao'
import { Configuracoes } from './pages/Configuracoes'
import { Login } from './pages/Login'
import { Portal } from './pages/Portal'
import { Registro } from './pages/Registro'
import { ConfirmarEmail } from './pages/ConfirmarEmail'

// Guard: only authenticated Hosts can access admin routes
function HostRoute() {
  const token = localStorage.getItem('token')
  const perfil = localStorage.getItem('perfil')
  if (!token) return <Navigate to="/login" replace />
  if (perfil === 'Inquilino') return <Navigate to="/portal" replace />
  return <Outlet />
}

// Guard: only authenticated Inquilinos can access portal
function InquilinoRoute() {
  const token = localStorage.getItem('token')
  const perfil = localStorage.getItem('perfil')
  if (!token) return <Navigate to="/login" replace />
  if (perfil === 'Host') return <Navigate to="/" replace />
  return <Outlet />
}

// Guard: redirect already-authenticated users away from /login
function PublicRoute() {
  const token = localStorage.getItem('token')
  const perfil = localStorage.getItem('perfil')
  if (token) {
    return perfil === 'Inquilino' ? <Navigate to="/portal" replace /> : <Navigate to="/" replace />
  }
  return <Outlet />
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public */}
        <Route element={<PublicRoute />}>
          <Route path="login" element={<Login />} />
        </Route>

        {/* Always-public: registro and confirmar-email (no redirect even if logged in) */}
        <Route path="registro" element={<Registro />} />
        <Route path="confirmar-email" element={<ConfirmarEmail />} />

        {/* Portal do Inquilino */}
        <Route element={<InquilinoRoute />}>
          <Route path="portal" element={<Portal />} />
        </Route>

        {/* Admin (Host) */}
        <Route element={<HostRoute />}>
          <Route element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="apartamentos" element={<Apartamentos />} />
            <Route path="inquilinos" element={<Inquilinos />} />
            <Route path="inquilinos/:id" element={<InquilinoDetalhe />} />
            <Route path="faturas" element={<Faturas />} />
            <Route path="financeiro" element={<Financeiro />} />
            <Route path="gastos" element={<GastosManutencao />} />
            <Route path="configuracoes" element={<Configuracoes />} />
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
