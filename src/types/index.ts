// Status é string conforme API: "Pendente" | "Atrasado" | "Pago"
export type StatusFaturaStr = 'Pendente' | 'Atrasado' | 'Pago'

export interface Apartamento {
  id: string
  numero: string
  bloco: string | null
  ocupado: boolean
  criadoEm: string
}

export interface Inquilino {
  id: string
  nomeCompleto: string
  cpf: string
  dataNascimento: string
  rg: string | null
  orgaoEmissor: string | null
  telefone: string | null
  estadoCivil: string
  estadoCivilDescricao: string
  quantidadeMoradores: number
  dataEntrada: string
  dataVencimentoContrato: string
  valorAluguel: number
  garagem: number
  apartamentoId: string
  diasAlertaVencimento: number[]
  criadoEm: string
}

export interface Fatura {
  id: string
  mesReferencia: string
  valorAluguel: number
  valorAgua: number
  valorLuz: number
  valorTotal: number
  dataLimitePagamento: string
  dataPagamento: string | null
  codigoPix: string | null
  status: StatusFaturaStr
  statusDescricao: string
  inquilinoId: string
  criadoEm: string
  kwMesAnterior: number | null
  kwAtual: number | null
  kwConsumidos: number | null
  kwhValor: number | null
  cobrancaAsaasId: string | null
}

export interface Dependente {
  id: string
  nomeCompleto: string
  cpf: string
  rg: string | null
  orgaoEmissor: string | null
  dataNascimento: string | null
  telefone: string | null
  estadoCivil: string
  estadoCivilDescricao: string
  inquilinoId: string
  criadoEm: string
}

export interface Configuracao {
  id: string
  kwhValor: number
  valorAgua: number
  atualizadoEm: string
  walletIdAsaas: string | null
}

export interface GastoManutencao {
  id: string
  apartamentoId: string
  apartamentoNumero: string
  descricao: string
  valor: number
  data: string
  observacao: string | null
  criadoEm: string
}

export interface BalancoApartamentoMes {
  apartamentoId: string
  apartamentoNumero: string
  apartamentoBloco: string | null
  totalReceitas: number
  totalGastos: number
  balancoLiquido: number
  faturasPagas: Array<{
    faturaId: string
    mesReferencia: string
    valorTotal: number
    dataPagamento: string
    nomeInquilino: string
  }>
  gastosManutencao: Array<{
    gastoId: string
    descricao: string
    valor: number
    data: string
  }>
}

export interface BalancoMensal {
  mesReferencia: string
  ano: number
  mes: number
  totalReceitas: number
  totalGastos: number
  balancoLiquido: number
  apartamentos: BalancoApartamentoMes[]
}

export interface BalancoAnualMes {
  mes: number
  mesReferencia: string
  totalReceitas: number
  totalGastos: number
  balancoLiquido: number
}

export interface BalancoAnual {
  ano: number
  totalReceitas: number
  totalGastos: number
  balancoLiquido: number
  meses: BalancoAnualMes[]
}

export interface ContratoInquilino {
  id: string
  inquilinoId: string
  nomeOriginalArquivo: string
  tipoConteudo: string
  tamanhoBytes: number
  tamanhoFormatado: string
  descricao: string | null
  criadoEm: string
}

export interface RespostaApi<T> {
  sucesso: boolean
  mensagem: string
  dados: T
}

export interface RespostaErro {
  sucesso: false
  mensagem: string
  erros: string[]
}

// ——— Auth ———

export interface AuthDados {
  token: string
  perfil: 'Host' | 'Inquilino'
  nomeCompleto: string
  hostId: string | null
  inquilinoId: string | null
  expiracao: string
}

// ——— Portal do Inquilino ———

export interface PortalInquilino {
  id: string
  nomeCompleto: string
  cpf: string
  dataNascimento: string
  rg: string | null
  orgaoEmissor: string | null
  telefone: string | null
  estadoCivil: string
  estadoCivilDescricao: string
  quantidadeMoradores: number
  dataEntrada: string
  dataVencimentoContrato: string
  valorAluguel: number
  garagem: number
  numeroApartamento: string
  blocoApartamento: string | null
}

export interface PortalFatura {
  id: string
  mesReferencia: string
  valorAluguel: number
  valorAgua: number
  valorLuz: number
  valorTotal: number
  dataLimitePagamento: string
  dataPagamento: string | null
  codigoPix: string | null
  status: StatusFaturaStr
  statusDescricao: string
}

export interface PortalContrato {
  id: string
  nomeOriginalArquivo: string
  descricao: string | null
  tamanhoFormatado: string
  criadoEm: string
}

