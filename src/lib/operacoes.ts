import type { Linhas, Tabela } from './armazem';
import { diferencaDias, somarDias } from './datas';
import type { Dados, Dia, Frequencia, Lancamento, Movimento, Recorrencia, Tipo } from './tipos';

export interface Mudanca {
  salvar: { [T in Tabela]?: Linhas[T][] };
  apagar: { [T in Tabela]?: string[] };
}

export type Escopo = 'esta' | 'seguintes' | 'todas';

export interface Campos {
  data: Dia;
  tipo: Tipo;
  valor: number;
  descricao: string;
  cartao_id: string | null;
  tag_ids: string[];
}

export interface Repeticao {
  frequencia: Frequencia;
  /** null = sem fim. */
  vezes: number | null;
  /** Parcelado: o valor informado é o total e é dividido pelas parcelas. */
  dividir: boolean;
}

const novoId = () => crypto.randomUUID();
const arred = (v: number) => Math.round(v * 100) / 100;

export function criar(campos: Campos, repetir: Repeticao | null): Mudanca {
  if (!repetir) {
    const l: Lancamento = { id: novoId(), ...campos, recorrencia_id: null, ocorrencia: null, pulado: false };
    return { salvar: { lancamentos: [l] }, apagar: {} };
  }
  const vezes = repetir.vezes;
  const r: Recorrencia = {
    id: novoId(),
    tipo: campos.tipo,
    descricao: campos.descricao,
    valor: repetir.dividir && vezes ? arred(campos.valor / vezes) : campos.valor,
    frequencia: repetir.frequencia,
    inicio: campos.data,
    ocorrencias: vezes,
    fim: null,
    cartao_id: campos.cartao_id,
    tag_ids: campos.tag_ids,
  };
  return { salvar: { recorrencias: [r] }, apagar: {} };
}

function substitutosDepois(dados: Dados, recId: string, desde: Dia): string[] {
  return dados.lancamentos.filter((l) => l.recorrencia_id === recId && l.ocorrencia && l.ocorrencia >= desde).map((l) => l.id);
}

export function editar(dados: Dados, mov: Movimento, campos: Campos, escopo: Escopo): Mudanca {
  const rec = mov.recorrencia_id ? dados.recorrencias.find((r) => r.id === mov.recorrencia_id) : undefined;

  if (!rec || !mov.ocorrencia) {
    const atual = dados.lancamentos.find((l) => l.id === mov.lancamento_id);
    if (!atual) return { salvar: {}, apagar: {} };
    return { salvar: { lancamentos: [{ ...atual, ...campos }] }, apagar: {} };
  }

  if (escopo === 'esta') {
    const l: Lancamento = {
      id: mov.lancamento_id ?? novoId(),
      ...campos,
      recorrencia_id: rec.id,
      ocorrencia: mov.ocorrencia,
      pulado: false,
    };
    return { salvar: { lancamentos: [l] }, apagar: {} };
  }

  const deslocamento = diferencaDias(mov.ocorrencia, campos.data);

  if (escopo === 'todas' || mov.ocorrencia <= rec.inicio) {
    const r: Recorrencia = {
      ...rec,
      tipo: campos.tipo,
      valor: campos.valor,
      descricao: campos.descricao,
      cartao_id: campos.cartao_id,
      tag_ids: campos.tag_ids,
      inicio: somarDias(rec.inicio, deslocamento),
    };
    return { salvar: { recorrencias: [r] }, apagar: {} };
  }

  const jaPassaram = (mov.posicao ?? 1) - 1;
  const antiga: Recorrencia = { ...rec, fim: somarDias(mov.ocorrencia, -1) };
  const nova: Recorrencia = {
    ...rec,
    id: novoId(),
    tipo: campos.tipo,
    valor: campos.valor,
    descricao: campos.descricao,
    cartao_id: campos.cartao_id,
    tag_ids: campos.tag_ids,
    inicio: campos.data,
    ocorrencias: rec.ocorrencias ? Math.max(1, rec.ocorrencias - jaPassaram) : null,
  };
  return {
    salvar: { recorrencias: [antiga, nova] },
    apagar: { lancamentos: substitutosDepois(dados, rec.id, mov.ocorrencia) },
  };
}

export function apagar(dados: Dados, mov: Movimento, escopo: Escopo): Mudanca {
  const rec = mov.recorrencia_id ? dados.recorrencias.find((r) => r.id === mov.recorrencia_id) : undefined;

  if (!rec || !mov.ocorrencia) {
    return { salvar: {}, apagar: mov.lancamento_id ? { lancamentos: [mov.lancamento_id] } : {} };
  }

  if (escopo === 'esta') {
    const l: Lancamento = {
      id: mov.lancamento_id ?? novoId(),
      data: mov.ocorrencia,
      tipo: mov.tipo,
      valor: mov.valor,
      descricao: mov.descricao,
      cartao_id: mov.cartao_id,
      recorrencia_id: rec.id,
      ocorrencia: mov.ocorrencia,
      pulado: true,
      tag_ids: mov.tag_ids,
    };
    return { salvar: { lancamentos: [l] }, apagar: {} };
  }

  if (escopo === 'todas' || mov.ocorrencia <= rec.inicio) {
    return { salvar: {}, apagar: { recorrencias: [rec.id] } };
  }

  return {
    salvar: { recorrencias: [{ ...rec, fim: somarDias(mov.ocorrencia, -1) }] },
    apagar: { lancamentos: substitutosDepois(dados, rec.id, mov.ocorrencia) },
  };
}

/** Aplica uma mudança nos dados em memória (o armazém recebe a mesma mudança em paralelo). */
export function aplicar(dados: Dados, m: Mudanca): Dados {
  const out: Dados = { ...dados };
  const chave = { lancamentos: 'lancamentos', recorrencias: 'recorrencias', previsao_itens: 'previsao', cartoes: 'cartoes', tags: 'tags' } as const;
  for (const t of Object.keys(chave) as Tabela[]) {
    const k = chave[t];
    let lista = out[k] as { id: string }[];
    const fora = new Set(m.apagar[t] ?? []);
    if (fora.size) {
      lista = lista.filter((l) => !fora.has(l.id));
      if (t === 'recorrencias') out.lancamentos = out.lancamentos.filter((l) => !l.recorrencia_id || !fora.has(l.recorrencia_id));
      if (t === 'tags') {
        // Apagar a tag só tira a etiqueta das movimentações (o banco faz o mesmo por gatilho).
        const tira = (ids: string[]) => ids.filter((x) => !fora.has(x));
        out.lancamentos = out.lancamentos.map((l) => ({ ...l, tag_ids: tira(l.tag_ids) }));
        out.recorrencias = out.recorrencias.map((r) => ({ ...r, tag_ids: tira(r.tag_ids) }));
      }
    }
    const novos = (m.salvar[t] ?? []) as { id: string }[];
    if (novos.length) {
      const porId = new Map(lista.map((l) => [l.id, l]));
      for (const n of novos) porId.set(n.id, n);
      lista = [...porId.values()];
    }
    (out[k] as unknown) = lista;
  }
  return out;
}
