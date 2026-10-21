import type { Tipo } from './tipos';

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
