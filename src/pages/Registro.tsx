import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { toast } from 'sonner'
import { Building2, CheckCircle } from 'lucide-react'
import api from '../lib/api'
import type { RespostaApi } from '../types'
import { extractApiError } from '../lib/utils'
import { Button } from '../components/ui/Button'

const registroSchema = z.object({
  nomeCompleto: z.string().min(3, 'Nome muito curto'),
  cpf: z.string().length(11, 'CPF deve ter 11 dígitos'),
  dataNascimento: z.string().min(1, 'Data de nascimento obrigatória'),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'Senha deve ter no mínimo 6 caracteres'),
  confirmarSenha: z.string(),
}).refine((data) => data.senha === data.confirmarSenha, {
  message: 'As senhas não coincidem',
  path: ['confirmarSenha'],
})

type RegistroForm = z.infer<typeof registroSchema>

const inputCls =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#1E3A5F] transition-colors'

function maskCPFInput(value: string) {
  const raw = value.replace(/\D/g, '').slice(0, 11)
  if (raw.length <= 3) return raw
  if (raw.length <= 6) return `${raw.slice(0, 3)}.${raw.slice(3)}`
  if (raw.length <= 9) return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6)}`
  return `${raw.slice(0, 3)}.${raw.slice(3, 6)}.${raw.slice(6, 9)}-${raw.slice(9)}`
}

interface HostRegistrado {
  id: string
  nomeCompleto: string
  email: string
  emailConfirmado: boolean
}

export function Registro() {
  const navigate = useNavigate()
  const [sucesso, setSucesso] = useState(false)
  const [emailRegistrado, setEmailRegistrado] = useState('')
  const [cpfDisplay, setCpfDisplay] = useState('')

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegistroForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(registroSchema) as any,
  })

  function handleCpfChange(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 11)
    setCpfDisplay(maskCPFInput(raw))
    setValue('cpf', raw, { shouldValidate: true })
  }

  async function onSubmit(data: RegistroForm) {
    try {
      const res = await api.post<RespostaApi<HostRegistrado>>('/auth/registrar', {
        nomeCompleto: data.nomeCompleto,
        cpf: data.cpf,
        dataNascimento: data.dataNascimento,
        email: data.email,
        senha: data.senha,
      })
      setEmailRegistrado(data.email)
      setSucesso(true)
      toast.success(res.data.mensagem || 'Conta criada! Verifique seu e-mail.')
    } catch (err) {
      toast.error(extractApiError(err))
    }
  }

  if (sucesso) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center space-y-4">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="w-9 h-9 text-green-500" />
              </div>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Conta criada com sucesso!</h2>
            <p className="text-sm text-gray-600">
              Um link de confirmação foi enviado para{' '}
              <strong className="text-gray-900">{emailRegistrado}</strong>.
              <br />
              Verifique sua caixa de entrada e confirme o e-mail para poder fazer login.
            </p>
            <div className="pt-2 space-y-2">
              <Button className="w-full justify-center" onClick={() => navigate('/login')}>
                Ir para o Login
              </Button>
              <p className="text-xs text-gray-400">
                Não recebeu?{' '}
                <button
                  onClick={() => setSucesso(false)}
                  className="text-[#1E3A5F] hover:underline font-medium"
                >
                  Tentar novamente
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <Building2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">GestAluguel</h1>
          <p className="text-blue-200 mt-1 text-sm">Criar conta de Administrador</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <div className="bg-[#1E3A5F] px-6 py-4">
            <h2 className="text-white font-semibold">Novo Administrador</h2>
            <p className="text-blue-200 text-xs mt-0.5">Preencha os dados para criar sua conta</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome completo</label>
              <input {...register('nomeCompleto')} className={inputCls} placeholder="João Silva" />
              {errors.nomeCompleto && (
                <p className="text-red-500 text-xs mt-1">{errors.nomeCompleto.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <input
                {...register('email')}
                type="email"
                className={inputCls}
                placeholder="joao@email.com"
                autoComplete="email"
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                <input
                  {...register('senha')}
                  type="password"
                  className={inputCls}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                {errors.senha && <p className="text-red-500 text-xs mt-1">{errors.senha.message}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirmar Senha</label>
                <input
                  {...register('confirmarSenha')}
                  type="password"
                  className={inputCls}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
                {errors.confirmarSenha && (
                  <p className="text-red-500 text-xs mt-1">{errors.confirmarSenha.message}</p>
                )}
              </div>
            </div>

            <div className="pt-2 space-y-3">
              <Button type="submit" isLoading={isSubmitting} className="w-full justify-center">
                Criar Conta
              </Button>
              <p className="text-center text-xs text-gray-400">
                Já tem conta?{' '}
                <Link to="/login" className="text-[#1E3A5F] font-medium hover:underline">
                  Fazer login
                </Link>
              </p>
            </div>
          </form>
        </div>

        <p className="text-center text-blue-200/60 text-xs mt-6">
          GestAluguel © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

