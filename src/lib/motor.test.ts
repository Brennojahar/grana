import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { somarMeses } from './datas';
import { lerValor } from './formato';
import { paraDados } from './importar';
import { horizonte, movimentos, previsaoDiaria, resumoDiario, totaisAno, totaisMes } from './motor';
import type { Dados } from './tipos';

let n = 0;
const id = () => `id${++n}`;

function base(): Dados {
  return { perfil: { nome: '', divisor_dias: 30 }, lancamentos: [], recorrencias: [], previsao: [], cartoes: [], checkins: [] };
}

describe('datas', () => {
  it('mensal no dia 30 cai no último dia de fevereiro', () => {
    expect(somarMeses('2026-06-30', 8, 30)).toBe('2027-02-28');
    expect(somarMeses('2026-06-30', 20, 30)).toBe('2028-02-29');
    expect(somarMeses('2026-06-30', 9, 30)).toBe('2027-03-30');
  });
});

describe('motor', () => {
  it('saldo acumula e a previsão só entra em dias futuros sem diário', () => {
    const d = base();
    d.previsao = [{ id: id(), descricao: 'comida', valor: 300 }];
    d.lancamentos = [
      { id: id(), data: '2026-01-01', tipo: 'entrada', valor: 1000, descricao: 'x', cartao_id: null, recorrencia_id: null, ocorrencia: null, pulado: false },
      { id: id(), data: '2026-01-03', tipo: 'diario', valor: 25, descricao: 'pão', cartao_id: null, recorrencia_id: null, ocorrencia: null, pulado: false },
    ];
    const r = resumoDiario(d, '2026-01-01', '2026-01-04', '2026-01-01');
    expect(r.map((x) => x.saldo)).toEqual([1000, 990, 965, 955]);
    expect(r.map((x) => x.diarioPrevisto)).toEqual([false, true, false, true]);
  });

  it('ocorrência substituída e ocorrência pulada', () => {
    const d = base();
    const rec = { id: 'r', tipo: 'saida' as const, descricao: 'aluguel', valor: 100, frequencia: 'mensal' as const, inicio: '2026-01-10', ocorrencias: null, fim: null, cartao_id: null };
    d.recorrencias = [rec];
    d.lancamentos = [
      { id: 'a', data: '2026-02-12', tipo: 'saida', valor: 150, descricao: 'aluguel', cartao_id: null, recorrencia_id: 'r', ocorrencia: '2026-02-10', pulado: false },
      { id: 'b', data: '2026-03-10', tipo: 'saida', valor: 100, descricao: 'aluguel', cartao_id: null, recorrencia_id: 'r', ocorrencia: '2026-03-10', pulado: true },
    ];
    const m = movimentos(d, '2026-01-01', '2026-04-30');
    expect(m.map((x) => [x.data, x.valor, x.posicao])).toEqual([
      ['2026-01-10', 100, 1],
      ['2026-02-12', 150, 2],
      ['2026-04-10', 100, 4],
    ]);
  });

  it('série com fim para no dia do fim', () => {
    const d = base();
    d.recorrencias = [{ id: 'r', tipo: 'entrada', descricao: 'x', valor: 1, frequencia: 'semanal', inicio: '2026-01-01', ocorrencias: null, fim: '2026-01-20', cartao_id: null }];
    expect(movimentos(d, '2026-01-01', '2026-12-31').map((x) => x.data)).toEqual(['2026-01-01', '2026-01-08', '2026-01-15']);
  });
});

/**
 * Conferência com os dados reais exportados. O arquivo e os valores esperados ficam em
 * dados-privados/ (fora do git): nenhum número pessoal entra no repositório.
 */
const caminho = new URL('../../dados-privados/meus-dados.json', import.meta.url);
// O corpo do describe roda na coleta mesmo quando é pulado, então a leitura precisa tolerar a ausência (CI).
const arq = fs.existsSync(caminho) ? JSON.parse(fs.readFileSync(caminho, 'utf8')) : null;
describe.skipIf(!arq)('dados exportados', () => {
  const dados = arq ? paraDados(arq, '', id) : base();
  const conf = arq?.conferencia;
  const hoje = conf?.hoje as string;

  it('previsão diária', () => {
    expect(previsaoDiaria(dados)).toBe(conf.previsao_diaria);
  });

  it('saldos batem com o app de origem', () => {
    for (const [d, esperado] of Object.entries(conf.saldos_esperados as Record<string, number>)) {
      expect(resumoDiario(dados, d, d, hoje)[0].saldo, d).toBeCloseTo(esperado, 2);
    }
  });

  it('totais de um mês', () => {
    const esperado = conf.totais_mes as Record<string, number> & { mes: string };
    const t = totaisMes(dados, esperado.mes, hoje);
    for (const k of ['entradas', 'custoDeVida', 'custoDeVidaPrevisto', 'sobra', 'sobraPrevista', 'diasDecorridos'] as const) {
      expect(t[k], k).toBeCloseTo(esperado[k], 2);
    }
  });

  it('totais do ano', () => {
    const esperado = conf.totais_ano as Record<string, number> & { ano: number };
    const ano = totaisAno(dados, esperado.ano, hoje);
    for (const k of ['entradas', 'custoDeVida', 'custoDeVidaPrevisto', 'sobra'] as const) {
      expect(ano.reduce((s, m) => s + m[k], 0), k).toBeCloseTo(esperado[k], 2);
    }
  });

  it('horizonte de 12 meses', () => {
    const h = horizonte(dados, hoje, 12);
    expect(h.dias[0].dia).toBe(hoje);
    expect(h.final?.dia).toBe(conf.horizonte_final);
    expect(h.primeiroNegativo).toBeNull();
  });
});

describe('lerValor', () => {
  it('aceita formatos comuns e recusa casas demais', () => {
    expect(lerValor('1.234,56')).toBe(1234.56);
    expect(lerValor('R$ 12,3')).toBe(12.3);
    expect(lerValor('1234.5')).toBe(1234.5);
    expect(lerValor('500')).toBe(500);
    expect(lerValor('440,00500')).toBeNaN();
    expect(lerValor('')).toBeNaN();
  });
});
