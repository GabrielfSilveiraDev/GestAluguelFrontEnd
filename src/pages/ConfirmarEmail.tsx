import { useEffect, useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { Building2, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import api from '../lib/api'
import type { RespostaApi } from '../types'
import { Button } from '../components/ui/Button'

type Estado = 'loading' | 'sucesso' | 'erro'

export function ConfirmarEmail() {
  const [searchParams] = useSearchParams()
  const [estado, setEstado] = useState<Estado>('loading')
  const [mensagem, setMensagem] = useState('')

  useEffect(() => {
    const token = searchParams.get('token')
    if (!token) {
      setEstado('erro')
      setMensagem('Token de confirmação não encontrado na URL.')
      return
    }

    api
      .post<RespostaApi<boolean>>('/auth/confirmar-email', { token })
      .then((res) => {
        setEstado('sucesso')
        setMensagem(res.data.mensagem || 'E-mail confirmado com sucesso!')
      })
      .catch((err) => {
        setEstado('erro')
        const msg =
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (err as any)?.response?.data?.mensagem ||
          'Não foi possível confirmar o e-mail. O link pode ter expirado.'
        setMensagem(msg)
      })
  }, [searchParams])

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#1E3A5F] to-[#2563EB] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-white/10 rounded-2xl mb-4">
            <Building2 className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">GestAluguel</h1>
          <p className="text-blue-200 mt-1 text-sm">Confirmação de E-mail</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8 text-center space-y-5">
          {estado === 'loading' && (
            <>
              <div className="flex justify-center">
                <Loader2 className="w-14 h-14 text-[#1E3A5F] animate-spin" />
              </div>
              <h2 className="text-lg font-semibold text-gray-800">Confirmando seu e-mail…</h2>
              <p className="text-sm text-gray-500">Aguarde um momento.</p>
            </>
          )}

          {estado === 'sucesso' && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-9 h-9 text-green-500" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900">E-mail confirmado!</h2>
              <p className="text-sm text-gray-600">{mensagem}</p>
              <Link to="/login">
                <Button className="w-full justify-center mt-2">Ir para o Login</Button>
              </Link>
            </>
          )}

          {estado === 'erro' && (
            <>
              <div className="flex justify-center">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                  <XCircle className="w-9 h-9 text-red-500" />
                </div>
              </div>
              <h2 className="text-xl font-bold text-gray-900">Falha na confirmação</h2>
              <p className="text-sm text-gray-600">{mensagem}</p>
              <div className="space-y-2 pt-2">
                <Link to="/login">
                  <Button className="w-full justify-center">Ir para o Login</Button>
                </Link>
                <Link to="/registro">
                  <Button variant="secondary" className="w-full justify-center">
                    Criar nova conta
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-blue-200/60 text-xs mt-6">
          GestAluguel © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}

