import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Building2 } from 'lucide-react'
import api from '../lib/api'
import type { RespostaApi, AuthDados } from '../types'
import { extractApiError } from '../lib/utils'
import { Button } from '../components/ui/Button'

const adminSchema = z.object({
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(1, 'Senha obrigatória'),
})

const inquilinoSchema = z.object({
  cpf: z.string().length(11, 'CPF deve ter 11 dígitos'),
  dataNascimento: z.string().min(1, 'Data de nascimento obrigatória'),
})

type AdminForm = z.infer<typeof adminSchema>
type InquilinoForm = z.infer<typeof inquilinoSchema>

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1E3A5F] transition-colors'

function maskCPFInput(value: string) {
  const raw = value.replace(/\D/g, '').slice(0, 11)
  if (raw.length <= 3) return raw
  if (raw.length <= 6) return `${raw.slice(0, 3)}.${raw.slice(3)}`
  if (raw.length <= 9) return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`
  return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`
}

function saveAuth(dados: AuthDados) {
  localStorage.setItem('token', dados.token)
  localStorage.setItem('perfil', dados.perfil)
  localStorage.setItem('nomeCompleto', dados.nomeCompleto)
  if (dados.hostId) localStorage.setItem('hostId', dados.hostId)
  if (dados.inquilinoId) localStorage.setItem('inquilinoId', dados.inquilinoId)
}

// —— Admin Login Form ——
function AdminLoginForm() {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AdminForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(adminSchema) as any,
  })

  async function onSubmit(data: AdminForm) {
    try {
      const res = await api.post<RespostaApi<AuthDados>>('/auth/host', {
        email: data.email,
        senha: data.senha,
      })
      saveAuth(res.data.dados)
      toast.success(`Bem-vindo, ${res.data.dados.nomeCompleto}!`)
      navigate('/')
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
        <input
          {...register('email')}
          type="email"
          className={inputCls}
          placeholder="admin@email.com"
          autoComplete="email"
        />
        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
        <input
          {...register('senha')}
          type="password"
          className={inputCls}
          placeholder="••••••••"
          autoComplete="current-password"
        />
        {errors.senha && <p className="text-red-500 text-xs mt-1">{errors.senha.message}</p>}
      </div>
      <Button type="submit" isLoading={isSubmitting} className="w-full justify-center">
        Entrar como Administrador
      </Button>
      <p className="text-center text-xs text-gray-400 pt-1">
        Não tem conta?{' '}
        <Link to="/registro" className="text-[#1E3A5F] font-medium hover:underline">
          Criar conta de administrador
        </Link>
      </p>
    </form>
  )
}

// —— Inquilino Login Form ——
function InquilinoLoginForm() {
  const navigate = useNavigate()
  const [cpfDisplay, setCpfDisplay] = useState('')
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<InquilinoForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(inquilinoSchema) as any,
  })

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11)
    setCpfDisplay(maskCPFInput(raw))
    setValue('cpf', raw, { shouldValidate: true })
  }

  async function onSubmit(data: InquilinoForm) {
    try {
      const res = await api.post<RespostaApi<AuthDados>>('/auth/inquilino', {
        cpf: data.cpf,
        dataNascimento: data.dataNascimento,
      })
      saveAuth(res.data.dados)
      toast.success(`Bem-vindo, ${res.data.dados.nomeCompleto}!`)
      navigate('/portal')
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
      <Button type="submit" isLoading={isSubmitting} className="w-full justify-center">
        Entrar como Inquilino
      </Button>
    </form>
  )
}

// —— Main Login Page ——
type Tab = 'admin' | 'inquilino'

export function Login() {
  const [tab, setTab] = useState<Tab>('admin')

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <Building2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">GestAluguel</h1>
          <p className="text-blue-200 mt-1 text-sm">Sistema de Gestão de Aluguéis</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Tab headers */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => setTab('admin')}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                tab === 'admin'
                  ? 'bg-[#1E3A5F] text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Administrador
            </button>
            <button
              onClick={() => setTab('inquilino')}
              className={`flex-1 py-4 text-sm font-medium transition-colors ${
                tab === 'inquilino'
                  ? 'bg-[#1E3A5F] text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              Inquilino
            </button>
          </div>

          {/* Form body */}
          <div className="p-8">
            {tab === 'admin' ? <AdminLoginForm /> : <InquilinoLoginForm />}
          </div>
        </div>

        <p className="text-center text-blue-200/60 text-xs mt-6">
          GestAluguel © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

