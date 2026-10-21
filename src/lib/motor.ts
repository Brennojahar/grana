import { cadaDia, diasNoMes, dia, fimDoMes, inicioDoMes, partes, somarDias, somarMeses } from './datas';
import type { ContasTag, Dados, Dia, Movimento, Recorrencia, ResumoDia, Tag, Tipo } from './tipos';

/** Tudo é somado em centavos inteiros para o saldo não acumular erro de ponto flutuante. */
const cent = (v: number) => Math.round(v * 100);
const real = (c: number) => c / 100;

const SINAL: Record<Tipo, 1 | -1> = { entrada: 1, saida: -1, diario: -1, economia: -1, cartao: -1 };

/** Teto de ocorrências geradas por série, para uma recorrência diária sem fim não travar o app. */
const TETO_OCORRENCIAS = 4000;

export function previsaoDiaria(dados: Pick<Dados, 'previsao' | 'perfil'>): number {
  const total = dados.previsao.reduce((s, i) => s + cent(i.valor), 0);
  const divisor = Math.max(1, Math.trunc(dados.perfil.divisor_dias) || 1);
  return real(Math.round(total / divisor));
}

export function totalPrevisaoMensal(dados: Pick<Dados, 'previsao'>): number {
  return real(dados.previsao.reduce((s, i) => s + cent(i.valor), 0));
}

export function dataDaOcorrencia(r: Pick<Recorrencia, 'inicio' | 'frequencia'>, i: number): Dia {
  switch (r.frequencia) {
    case 'diaria':
      return somarDias(r.inicio, i);
    case 'semanal':
      return somarDias(r.inicio, i * 7);
    case 'mensal':
      return somarMeses(r.inicio, i, partes(r.inicio)[2]);
    case 'anual':
      return somarMeses(r.inicio, i * 12, partes(r.inicio)[2]);
  }
}

/** Datas de todas as ocorrências da série até `ate` (respeitando fim e número de ocorrências). */
export function ocorrencias(r: Recorrencia, ate: Dia): Dia[] {
  const out: Dia[] = [];
  const limite = r.ocorrencias ?? TETO_OCORRENCIAS;
  for (let i = 0; i < limite; i++) {
    const d = dataDaOcorrencia(r, i);
    if (d > ate || (r.fim && d > r.fim)) break;
    out.push(d);
  }
  return out;
}

/** Expande avulsos + recorrências em movimentos concretos dentro de [de, ate]. */
export function movimentos(dados: Dados, de: Dia, ate: Dia): Movimento[] {
  const out: Movimento[] = [];
  const substituidas = new Map<string, true>();

  for (const l of dados.lancamentos) {
    if (l.recorrencia_id && l.ocorrencia) substituidas.set(`${l.recorrencia_id}|${l.ocorrencia}`, true);
  }

  const posicoes = new Map<string, { posicao: number; total: number | null }>();
  for (const r of dados.recorrencias) {
    const datas = ocorrencias(r, ate);
    const total = r.ocorrencias ?? (r.fim ? datas.length : null);
    datas.forEach((d, i) => {
      posicoes.set(`${r.id}|${d}`, { posicao: i + 1, total });
      if (d < de || substituidas.has(`${r.id}|${d}`)) return;
      out.push({
        chave: `${r.id}|${d}`,
        data: d,
        tipo: r.tipo,
        valor: r.valor,
        descricao: r.descricao,
        cartao_id: r.cartao_id,
        lancamento_id: null,
        recorrencia_id: r.id,
        ocorrencia: d,
        posicao: i + 1,
        total,
        tag_ids: r.tag_ids,
      });
    });
  }

  for (const l of dados.lancamentos) {
    if (l.pulado || l.data < de || l.data > ate) continue;
    const pos = l.recorrencia_id && l.ocorrencia ? posicoes.get(`${l.recorrencia_id}|${l.ocorrencia}`) : undefined;
    out.push({
      chave: l.id,
      data: l.data,
      tipo: l.tipo,
      valor: l.valor,
      descricao: l.descricao,
      cartao_id: l.cartao_id,
      lancamento_id: l.id,
      recorrencia_id: l.recorrencia_id,
      ocorrencia: l.ocorrencia,
      posicao: pos?.posicao ?? null,
      total: pos?.total ?? null,
      tag_ids: l.tag_ids,
    });
  }

  return out.sort((a, b) => (a.data === b.data ? a.descricao.localeCompare(b.descricao) : a.data < b.data ? -1 : 1));
}

/** A movimentação entra no cálculo `conta` se nenhuma das tags dela estiver marcada para ficar de fora. */
export function contaEm(m: Pick<Movimento, 'tag_ids'>, conta: keyof ContasTag, tagsPorId: Map<string, Tag>): boolean {
  return m.tag_ids.every((id) => tagsPorId.get(id)?.[conta] ?? true);
}

const mapaTags = (dados: Dados) => new Map(dados.tags.map((t) => [t.id, t]));

export function primeiroDia(dados: Dados): Dia | null {
  let min: Dia | null = null;
  for (const l of dados.lancamentos) if (!l.pulado && (!min || l.data < min)) min = l.data;
  for (const r of dados.recorrencias) if (!min || r.inicio < min) min = r.inicio;
  return min;
}

/**
 * Saldo de cada dia em [de, ate]. O saldo é o acumulado desde o primeiro lançamento.
 * Nos dias depois de `hoje` sem nenhum diário lançado, entra a previsão diária.
 * As colunas mostram todas as movimentações; o saldo pula as de tags marcadas para ficar de fora dele.
 */
export function resumoDiario(dados: Dados, de: Dia, ate: Dia, hoje: Dia): ResumoDia[] {
  const inicio = primeiroDia(dados);
  const comeco = inicio && inicio < de ? inicio : de;
  const prev = cent(previsaoDiaria(dados));

  const porDia = new Map<Dia, Movimento[]>();
  for (const m of movimentos(dados, comeco, ate)) {
    const lista = porDia.get(m.data);
    if (lista) lista.push(m);
    else porDia.set(m.data, [m]);
  }

  const tagsPorId = mapaTags(dados);
  const out: ResumoDia[] = [];
  let saldo = 0;
  for (const d of cadaDia(comeco, ate)) {
    const t = { entrada: 0, saida: 0, diario: 0, economia: 0, cartao: 0 };
    let temDiario = false;
    for (const m of porDia.get(d) ?? []) {
      t[m.tipo] += cent(m.valor);
      if (m.tipo === 'diario') temDiario = true;
      if (contaEm(m, 'conta_saldo', tagsPorId)) saldo += SINAL[m.tipo] * cent(m.valor);
    }
    const diarioPrevisto = d > hoje && !temDiario && prev > 0;
    if (diarioPrevisto) {
      t.diario += prev;
      saldo -= prev;
    }
    if (d < de) continue;
    out.push({
      dia: d,
      entradas: real(t.entrada),
      saidas: real(t.saida),
      diarios: real(t.diario),
      economias: real(t.economia),
      cartao: real(t.cartao),
      diarioPrevisto,
      saldo: real(saldo),
    });
  }
  return out;
}

export function saldoEm(dados: Dados, d: Dia, hoje: Dia): number {
  return resumoDiario(dados, d, d, hoje)[0]?.saldo ?? 0;
}

export interface TotaisMes {
  mes: Dia;
  entradas: number;
  saidas: number;
  diarios: number;
  economias: number;
  cartao: number;
  /** Saídas + diários lançados + cartão. */
  custoDeVida: number;
  /** Custo de vida somando a previsão diária dos dias que ainda não chegaram. */
  custoDeVidaPrevisto: number;
  /** Entradas − custo de vida. */
  sobra: number;
  sobraPrevista: number;
  /** Entradas − custo de vida − economias: o que sobrou livre no mês. */
  performance: number;
  performancePrevista: number;
  /** Economias ÷ entradas, de 0 a 1. */
  economizado: number;
  diasNoMes: number;
  diasDecorridos: number;
  /** Diários lançados ÷ dias decorridos. */
  diarioMedio: number;
  previsaoDiaria: number;
  saldoFinal: number;
}

export function totaisMes(dados: Dados, mes: Dia, hoje: Dia): TotaisMes {
  const de = inicioDoMes(mes);
  const ate = fimDoMes(mes);
  const dias = resumoDiario(dados, de, ate, hoje);
  const movs = movimentos(dados, de, ate);
  const tagsPorId = mapaTags(dados);
  const prev = previsaoDiaria(dados);
  const diasPrevistos = dias.filter((r) => r.diarioPrevisto).length;
  const decorridos = dias.filter((r) => r.dia <= hoje).length;
  const previsto = diasPrevistos * cent(prev);

  // Cada cálculo soma só o que as tags deixam entrar nele; as somas sem `conta` são as movimentações do mês.
  const soma = (tipos: Tipo[], conta?: keyof ContasTag) =>
    movs.reduce((s, m) => (tipos.includes(m.tipo) && (!conta || contaEm(m, conta, tagsPorId)) ? s + cent(m.valor) : s), 0);

  const entradas = soma(['entrada']);
  const custo = soma(['saida', 'diario', 'cartao'], 'conta_custo_vida');
  const performance = soma(['entrada'], 'conta_performance') - soma(['saida', 'diario', 'cartao', 'economia'], 'conta_performance');
  const entradasEconomizado = soma(['entrada'], 'conta_economizado');
  const [y, m] = partes(de);
  return {
    mes: de,
    entradas: real(entradas),
    saidas: real(soma(['saida'])),
    diarios: real(soma(['diario'])),
    economias: real(soma(['economia'])),
    cartao: real(soma(['cartao'])),
    custoDeVida: real(custo),
    custoDeVidaPrevisto: real(custo + previsto),
    sobra: real(entradas - custo),
    sobraPrevista: real(entradas - custo - previsto),
    performance: real(performance),
    performancePrevista: real(performance - previsto),
    economizado: entradasEconomizado > 0 ? soma(['economia'], 'conta_economizado') / entradasEconomizado : 0,
    diasNoMes: diasNoMes(y, m),
    diasDecorridos: decorridos,
    diarioMedio: decorridos > 0 ? real(Math.round(soma(['diario'], 'conta_diario_medio') / decorridos)) : 0,
    previsaoDiaria: prev,
    saldoFinal: dias.at(-1)?.saldo ?? 0,
  };
}

export interface TotaisTag {
  entradas: number;
  saidas: number;
  diarios: number;
  economias: number;
  cartao: number;
  /** Saídas + diários + cartão + economias: o que saiu com essa tag. */
  gastos: number;
  movimentos: Movimento[];
}

/** O que cada tag movimentou num intervalo (uma movimentação com duas tags conta nas duas). */
export function totaisPorTag(dados: Dados, de: Dia, ate: Dia): Map<string, TotaisTag> {
  const out = new Map<string, TotaisTag>();
  for (const t of dados.tags) out.set(t.id, { entradas: 0, saidas: 0, diarios: 0, economias: 0, cartao: 0, gastos: 0, movimentos: [] });
  const campo = { entrada: 'entradas', saida: 'saidas', diario: 'diarios', economia: 'economias', cartao: 'cartao' } as const;
  for (const m of movimentos(dados, de, ate)) {
    for (const id of m.tag_ids) {
      const t = out.get(id);
      if (!t) continue;
      t[campo[m.tipo]] = real(cent(t[campo[m.tipo]]) + cent(m.valor));
      if (m.tipo !== 'entrada') t.gastos = real(cent(t.gastos) + cent(m.valor));
      t.movimentos.push(m);
    }
  }
  return out;
}

export function totaisAno(dados: Dados, ano: number, hoje: Dia): TotaisMes[] {
  return Array.from({ length: 12 }, (_, m) => totaisMes(dados, dia(ano, m, 1), hoje));
}

export interface Horizonte {
  dias: ResumoDia[];
  menor: ResumoDia | null;
  /** Primeiro dia em que o saldo fica negativo, se houver. */
  primeiroNegativo: ResumoDia | null;
  final: ResumoDia | null;
}

export function horizonte(dados: Dados, hoje: Dia, meses = 12): Horizonte {
  const ate = somarDias(somarMeses(inicioDoMes(hoje), meses), -1);
  const dias = resumoDiario(dados, hoje, ate, hoje);
  let menor: ResumoDia | null = null;
  let primeiroNegativo: ResumoDia | null = null;
  for (const r of dias) {
    if (!menor || r.saldo < menor.saldo) menor = r;
    if (!primeiroNegativo && r.saldo < 0) primeiroNegativo = r;
  }
  return { dias, menor, primeiroNegativo, final: dias.at(-1) ?? null };
}
