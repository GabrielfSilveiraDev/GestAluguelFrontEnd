import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Sidebar />
      <Header />
      <main className="ml-64 pt-16 min-h-screen">
        <div className="p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

