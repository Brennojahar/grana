import type { Dados, Frequencia, Tipo } from './tipos';

/** Formato do arquivo de exportação (dados-privados/meus-dados.json). */
export interface ArquivoExportado {
  previsao_diaria: { divisor_dias: number; itens: { descricao: string; valor: number }[] };
  cartoes: { nome: string; dia_fechamento: number; dia_vencimento: number }[];
  avulsos: { data: string; tipo: Tipo; valor: number; descricao: string; cartao?: string }[];
  recorrencias: {
    descricao: string;
    tipo: Tipo;
    valor: number;
    frequencia: Frequencia;
    inicio: string;
    ocorrencias: number | null;
  }[];
}

export function ehArquivoExportado(x: unknown): x is ArquivoExportado {
  const a = x as ArquivoExportado;
  return !!a && Array.isArray(a.avulsos) && Array.isArray(a.recorrencias) && !!a.previsao_diaria;
}

/** Converte o arquivo exportado em dados do grana, gerando ids novos. */
export function paraDados(arq: ArquivoExportado, nome = '', novoId: () => string = () => crypto.randomUUID()): Dados {
  const cartoes = arq.cartoes.map((c) => ({ id: novoId(), ...c }));
  const idCartao = (nomeCartao?: string) => cartoes.find((c) => c.nome === nomeCartao)?.id ?? null;
  return {
    perfil: { nome, divisor_dias: arq.previsao_diaria.divisor_dias },
    previsao: arq.previsao_diaria.itens.map((i) => ({ id: novoId(), ...i })),
    cartoes,
    lancamentos: arq.avulsos.map((a) => ({
      id: novoId(),
      data: a.data,
      tipo: a.tipo,
      valor: a.valor,
      descricao: a.descricao.trim(),
      cartao_id: idCartao(a.cartao),
      recorrencia_id: null,
      ocorrencia: null,
      pulado: false,
    })),
    recorrencias: arq.recorrencias.map((r) => ({
      id: novoId(),
      tipo: r.tipo,
      descricao: r.descricao.trim(),
      valor: r.valor,
      frequencia: r.frequencia,
      inicio: r.inicio,
      ocorrencias: r.ocorrencias,
      fim: null,
      cartao_id: null,
    })),
    checkins: [],
  };
}
