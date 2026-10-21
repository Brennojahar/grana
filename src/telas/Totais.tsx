import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BarraTitulo } from '../componentes/BarraTitulo';
import { IconeChevronDir, IconeChevronEsq, PrevisaoIcone, TipoIcone } from '../componentes/Icones';
import { inicioDoMes, nomeMes, partes, somarMeses } from '../lib/datas';
import { useGrana } from '../lib/estado';
import { moeda } from '../lib/formato';
import { totaisAno, totaisMes, type TotaisMes } from '../lib/motor';
import { TIPOS } from '../lib/rotulos';

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const pct = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const porcento = (v: number) => `${pct.format(v * 100)}%`;

type Metrica = 'performance' | 'economizado' | 'custo-de-vida' | 'diario-medio';

const METRICAS: Record<Metrica, { titulo: string; valor(t: TotaisMes): string; formula: ReactNode }> = {
  performance: {
    titulo: 'performance',
    valor: (t) => moeda(t.performancePrevista),
    formula: (
      <>
        <TipoIcone tipo="entrada" tamanho={20} /> − <TipoIcone tipo="saida" tamanho={20} /> − <TipoIcone tipo="diario" tamanho={20} /> −{' '}
        <TipoIcone tipo="economia" tamanho={20} /> − <TipoIcone tipo="cartao" tamanho={20} /> − <PrevisaoIcone tamanho={20} />
      </>
    ),
  },
  economizado: {
    titulo: 'economizado',
    valor: (t) => porcento(t.economizado),
    formula: (
      <>
        <TipoIcone tipo="economia" tamanho={20} /> ÷ <TipoIcone tipo="entrada" tamanho={20} />
      </>
    ),
  },
  'custo-de-vida': {
    titulo: 'custo de vida',
    valor: (t) => moeda(t.custoDeVidaPrevisto),
    formula: (
      <>
        <TipoIcone tipo="saida" tamanho={20} /> + <TipoIcone tipo="diario" tamanho={20} /> + <TipoIcone tipo="cartao" tamanho={20} /> + <PrevisaoIcone tamanho={20} />
      </>
    ),
  },
  'diario-medio': {
    titulo: 'diário médio',
    valor: (t) => moeda(t.diarioMedio),
    formula: (
      <>
        <TipoIcone tipo="diario" tamanho={20} /> ÷ dias
      </>
    ),
  },
};

function SeletorMes({ mes, setMes, rotulo }: { mes: string; setMes(m: string): void; rotulo: string }) {
  return (
    <div className="seletor">
      <button className="seta" onClick={() => setMes(somarMeses(mes, -1))} aria-label="Anterior">
        <IconeChevronEsq />
      </button>
      <span style={{ minWidth: 86, textAlign: 'center', fontSize: 16 }}>{rotulo}</span>
      <button className="seta" onClick={() => setMes(somarMeses(mes, 1))} aria-label="Próximo">
        <IconeChevronDir />
      </button>
    </div>
  );
}

export function Totais() {
  const { dados, hoje } = useGrana();
  const navegar = useNavigate();
  const [mes, setMes] = useState(() => inicioDoMes(hoje));
  const t = useMemo(() => totaisMes(dados, mes, hoje), [dados, mes, hoje]);
  const [ano, m0] = partes(mes);

  const abrir = (m: Metrica) => navegar(`/totais/${m}?ano=${ano}`);

  return (
    <>
      <BarraTitulo titulo="totais" centro={<SeletorMes mes={mes} setMes={setMes} rotulo={`${MESES_CURTOS[m0]}/${ano}`} />} />
      <div className="pagina">
        <div className="rotulo">cálculos do mês</div>
        <div className="cartoes">
          <button className="cartao-total" onClick={() => abrir('performance')}>
            <h3>performance</h3>
            <div className="formula">{METRICAS.performance.formula}</div>
            <span className="grande">{moeda(t.performancePrevista)}</span>
            <span className="sub">{t.performancePrevista >= 0 ? 'sobrou dinheiro' : 'faltou dinheiro'}</span>
          </button>

          <button className="cartao-total" onClick={() => abrir('economizado')}>
            <h3>economizado</h3>
            <div className="formula">
              <TipoIcone tipo="economia" tamanho={20} />
              <span className="progresso" role="img" aria-label={`${porcento(t.economizado)} das entradas`}>
                <i style={{ width: `${Math.min(100, t.economizado * 100)}%` }} />
              </span>
              <TipoIcone tipo="entrada" tamanho={20} />
            </div>
            <span className="grande">{porcento(t.economizado)}</span>
            <span className="sub">{t.economias > 0 ? `${moeda(t.economias)} guardados` : 'nada guardado'}</span>
          </button>

          <button className="cartao-total" onClick={() => abrir('custo-de-vida')}>
            <h3>custo de vida</h3>
            <div className="formula">{METRICAS['custo-de-vida'].formula}</div>
            <span className="grande">{moeda(t.custoDeVidaPrevisto)}</span>
            <span className="sub">{t.custoDeVidaPrevisto <= t.entradas ? 'dentro da renda' : 'acima da renda'}</span>
          </button>

          <button className="cartao-total" onClick={() => abrir('diario-medio')}>
            <h3>diário médio</h3>
            <div className="formula">
              <TipoIcone tipo="diario" tamanho={20} /> / {t.diasDecorridos || t.diasNoMes}
            </div>
            <span className="grande">{moeda(t.diarioMedio)}</span>
            <span className="sub">
              <PrevisaoIcone tamanho={18} /> {moeda(t.previsaoDiaria)}
            </span>
          </button>
        </div>

        <div className="rotulo" style={{ marginTop: 28 }}>
          movimentações do mês
        </div>
        <div className="caixa">
          {TIPOS.map((tp) => {
            const v = { entrada: t.entradas, saida: t.saidas, diario: t.diarios, economia: t.economias, cartao: t.cartao }[tp.tipo];
            return (
              <div className="linha-caixa" key={tp.tipo}>
                <TipoIcone tipo={tp.tipo} tamanho={20} />
                <span className="forte">{tp.plural}</span>
                <span className="fim">{moeda(v)}</span>
              </div>
            );
          })}
        </div>
        <p className="meta" style={{ marginTop: 14 }}>
          {nomeMes(m0)}: os cartões contam a previsão de diário nos dias que ainda não chegaram.
        </p>
      </div>
    </>
  );
}

/** Uma métrica mês a mês ao longo do ano (aberta ao tocar num cartão). */
export function TotaisMetrica() {
  const { dados, hoje } = useGrana();
  const { metrica } = useParams();
  const params = new URLSearchParams(location.search);
  const [ano, setAno] = useState(() => Number(params.get('ano')) || partes(hoje)[0]);
  const m = METRICAS[(metrica as Metrica) ?? 'performance'] ?? METRICAS.performance;
  const meses = useMemo(() => totaisAno(dados, ano, hoje), [dados, ano, hoje]);

  const soma = (f: (t: TotaisMes) => number) => meses.reduce((s, t) => s + f(t), 0);
  const entradas = soma((t) => t.entradas);
  const resumoAno =
    metrica === 'economizado'
      ? porcento(entradas > 0 ? soma((t) => t.economias) / entradas : 0)
      : metrica === 'custo-de-vida'
        ? moeda(soma((t) => t.custoDeVidaPrevisto))
        : metrica === 'diario-medio'
          ? moeda(soma((t) => t.diasDecorridos) ? soma((t) => t.diarios) / soma((t) => t.diasDecorridos) : 0)
          : moeda(soma((t) => t.performancePrevista));

  return (
    <>
      <BarraTitulo
        titulo={m.titulo}
        voltar="/totais"
        centro={
          <div className="seletor">
            <button className="seta" onClick={() => setAno(ano - 1)} aria-label="Ano anterior">
              <IconeChevronEsq />
            </button>
            <span style={{ minWidth: 60, textAlign: 'center', fontSize: 16 }}>{ano}</span>
            <button className="seta" onClick={() => setAno(ano + 1)} aria-label="Próximo ano">
              <IconeChevronDir />
            </button>
          </div>
        }
      />
      <div className="pagina estreita">
        <div className="cartao-total" style={{ marginBottom: 20 }}>
          <h3>{m.titulo} em {ano}</h3>
          <div className="formula">{m.formula}</div>
          <span className="grande">{resumoAno}</span>
        </div>
        <div className="caixa">
          {meses.map((t, i) => (
            <div className="linha-caixa" key={t.mes} style={t.mes.slice(0, 7) === hoje.slice(0, 7) ? { background: 'var(--painel-2)' } : undefined}>
              <span className="forte">{nomeMes(i)}</span>
              <span className="fim">{m.valor(t)}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
