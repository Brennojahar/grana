export type Tipo = 'entrada' | 'saida' | 'diario' | 'economia' | 'cartao';
export type Frequencia = 'diaria' | 'semanal' | 'mensal' | 'anual';

/** Data no formato AAAA-MM-DD, sempre no fuso local do usuário. */
export type Dia = string;

export interface Lancamento {
  id: string;
  data: Dia;
  tipo: Tipo;
  valor: number;
  descricao: string;
  cartao_id: string | null;
  /** Preenchido quando este lançamento substitui uma ocorrência de recorrência. */
  recorrencia_id: string | null;
  /** Data original da ocorrência substituída (pode diferir de `data` se ela foi movida). */
  ocorrencia: Dia | null;
  /** Ocorrência apagada: some do cálculo, mas fica registrada para não voltar. */
  pulado: boolean;
}

export interface Recorrencia {
  id: string;
  tipo: Tipo;
  descricao: string;
  valor: number;
  frequencia: Frequencia;
  inicio: Dia;
  /** null = sem fim. */
  ocorrencias: number | null;
  /** Último dia em que ainda vale (usado ao encerrar "desta em diante"). */
  fim: Dia | null;
  cartao_id: string | null;
}

export interface ItemPrevisao {
  id: string;
  descricao: string;
  valor: number;
}

export interface Cartao {
  id: string;
  nome: string;
  dia_fechamento: number;
  dia_vencimento: number;
}

export interface Perfil {
  nome: string;
  divisor_dias: number;
}

/** Uma ocorrência concreta num dia, seja avulsa ou vinda de uma recorrência. */
export interface Movimento {
  chave: string;
  data: Dia;
  tipo: Tipo;
  valor: number;
  descricao: string;
  cartao_id: string | null;
  lancamento_id: string | null;
  recorrencia_id: string | null;
  ocorrencia: Dia | null;
  /** Posição na série (1 = primeira), quando vem de recorrência. */
  posicao: number | null;
  total: number | null;
}

export interface ResumoDia {
  dia: Dia;
  entradas: number;
  saidas: number;
  diarios: number;
  economias: number;
  cartao: number;
  /** true quando o valor de `diarios` é a previsão, não um gasto lançado. */
  diarioPrevisto: boolean;
  saldo: number;
}

export interface Dados {
  perfil: Perfil;
  lancamentos: Lancamento[];
  recorrencias: Recorrencia[];
  previsao: ItemPrevisao[];
  cartoes: Cartao[];
  checkins: Dia[];
}
