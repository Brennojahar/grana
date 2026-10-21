import type { ContasTag, CorTag, Tipo } from './tipos';

export interface RotuloTipo {
  tipo: Tipo;
  /** Singular: "saída". */
  nome: string;
  /** Coluna da grade: "saídas". */
  plural: string;
  /** Item do menu adicionar: "gastos com cartão". */
  menu: string;
  dica: string;
}

export const TIPOS: RotuloTipo[] = [
  { tipo: 'entrada', nome: 'entrada', plural: 'entradas', menu: 'entrada', dica: 'salário, vales, outras rendas' },
  { tipo: 'saida', nome: 'saída', plural: 'saídas', menu: 'saída', dica: 'contas fixas, boletos, aluguel' },
  { tipo: 'diario', nome: 'diário', plural: 'diários', menu: 'diário', dica: 'gastos do dia a dia, compras' },
  { tipo: 'economia', nome: 'economia', plural: 'economias', menu: 'economia', dica: 'reserva, investimentos' },
  { tipo: 'cartao', nome: 'cartão', plural: 'cartão', menu: 'gastos com cartão', dica: 'compras ou a fatura do cartão' },
];

export const rotulo = (t: Tipo): RotuloTipo => TIPOS.find((x) => x.tipo === t)!;

export const COR_TIPO: Record<Tipo, string> = {
  entrada: 'var(--entrada)',
  saida: 'var(--saida)',
  diario: 'var(--diario)',
  economia: 'var(--economia)',
  cartao: 'var(--cartao)',
};


export const CORES_TAG: { cor: CorTag; nome: string }[] = [
  { cor: 'cinza', nome: 'cinza' },
  { cor: 'amarelo', nome: 'amarelo' },
  { cor: 'vermelho', nome: 'vermelho' },
  { cor: 'rosa', nome: 'rosa' },
  { cor: 'azul', nome: 'azul' },
  { cor: 'roxo', nome: 'roxo' },
  { cor: 'verde', nome: 'verde' },
  { cor: 'marrom', nome: 'marrom' },
];

/** Os cálculos que uma tag pode deixar de fora, na ordem em que aparecem. */
export const CONTAS_TAG: { conta: keyof ContasTag; nome: string }[] = [
  { conta: 'conta_saldo', nome: 'saldos' },
  { conta: 'conta_performance', nome: 'performance' },
  { conta: 'conta_economizado', nome: 'economizado' },
  { conta: 'conta_custo_vida', nome: 'custo de vida' },
  { conta: 'conta_diario_medio', nome: 'diário médio' },
];
