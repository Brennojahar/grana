import { useEffect, useMemo, useRef, useState } from 'react';
import { BarraMes, BarraTitulo } from '../componentes/BarraTitulo';
import { useFolhas } from '../componentes/Folhas';
import { IconeChevronBaixo, IconeChevronDir, IconeChevronDuploDir, IconeChevronDuploEsq, IconeChevronEsq, TipoIcone } from '../componentes/Icones';
import { dia as fazerDia, diaDaSemana, diasNoMes, fimDoMes, inicioDoMes, nomeMes, partes, somarMeses } from '../lib/datas';
import { useGrana } from '../lib/estado';
import { moeda } from '../lib/formato';
import { resumoDiario } from '../lib/motor';
import { rotulo, TIPOS, type RotuloTipo } from '../lib/rotulos';
import type { Dia, ResumoDia, Tipo } from '../lib/tipos';
import { useCelular } from '../lib/useCelular';

const CAMPO: Record<Tipo, 'entradas' | 'saidas' | 'diarios' | 'economias' | 'cartao'> = {
  entrada: 'entradas',
  saida: 'saidas',
  diario: 'diarios',
  economia: 'economias',
  cartao: 'cartao',
};

const MESES_NA_TELA = 12;
const CHAVE_RECOLHIDAS = 'grana:colunas-recolhidas';
const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** No celular, a coluna do meio mostra um tipo por vez; deslizar o dedo anda nesta ordem. */
type ColunaCelular = Tipo | 'todas';
const ORDEM_CELULAR: ColunaCelular[] = ['entrada', 'saida', 'diario', 'economia', 'cartao', 'todas'];
const nomeColuna = (c: ColunaCelular) => (c === 'todas' ? 'todas' : rotulo(c).plural);

const mesAno = (d: Dia) => {
  const [y, m] = partes(d);
  return `${MESES_CURTOS[m]}/${y}`;
};

function lerRecolhidas(): Tipo[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_RECOLHIDAS) ?? '[]');
  } catch {
    return [];
  }
}

/** Evento para o "ir pra hoje" do menu lateral pedir à grade que volte para hoje. */
export const EVENTO_IR_PRA_HOJE = 'grana:ir-pra-hoje';

const IconeTodas = () => (
  <svg viewBox="0 0 16 16" width={16} height={16} aria-hidden="true" className="tipo-icone">
    {[
      [8, 2.5],
      [13, 6],
      [11, 12],
      [5, 12],
      [3, 6],
    ].map(([x, y]) => (
      <circle key={`${x}-${y}`} cx={x} cy={y} r={1.8} fill="currentColor" />
    ))}
  </svg>
);

export function Saldos() {
  const { dados, hoje, marcarCheckin } = useGrana();
  const { verDia, lancar } = useFolhas();
  const celular = useCelular();
  const [inicio, setInicio] = useState<Dia>(() => inicioDoMes(hoje));
  const [recolhidas, setRecolhidas] = useState<Tipo[]>(lerRecolhidas);
  const [listaAberta, setListaAberta] = useState(false);
  const [coluna, setColuna] = useState<ColunaCelular>('entrada');
  const [deslize, setDeslize] = useState<'esq' | 'dir' | null>(null);
  const linhaHoje = useRef<HTMLTableRowElement | null>(null);
  const grade = useRef<HTMLDivElement>(null);
  const toque = useRef<{ x: number; y: number } | null>(null);

  // No celular `inicio` é o mês na tela; no computador, o primeiro dos 12 meses lado a lado.
  const quantos = celular ? 1 : MESES_NA_TELA;
  const fim = fimDoMes(somarMeses(inicio, quantos - 1));
  const porDia = useMemo(() => {
    const m = new Map<Dia, ResumoDia>();
    for (const r of resumoDiario(dados, inicio, fim, hoje)) m.set(r.dia, r);
    return m;
  }, [dados, inicio, fim, hoje]);
  const meses = Array.from({ length: quantos }, (_, i) => somarMeses(inicio, i));

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_RECOLHIDAS, JSON.stringify(recolhidas));
    } catch {
      /* sem armazenamento */
    }
  }, [recolhidas]);

  // Rola só a grade (não a página) até deixar a linha de hoje no meio.
  const centralizarHoje = () => {
    const g = grade.current;
    const l = linhaHoje.current;
    if (!g || !l) return;
    const topo = l.getBoundingClientRect().top - g.getBoundingClientRect().top + g.scrollTop;
    g.scrollTo({ left: 0, top: Math.max(0, topo - g.clientHeight / 2) });
  };

  const irPraHoje = () => {
    setInicio(inicioDoMes(hoje));
    requestAnimationFrame(() => requestAnimationFrame(centralizarHoje));
  };

  useEffect(centralizarHoje, []);
  useEffect(() => {
    if (!celular) return;
    if (linhaHoje.current) centralizarHoje();
    else grade.current?.scrollTo({ top: 0 });
  }, [inicio, celular]);
  useEffect(() => {
    window.addEventListener(EVENTO_IR_PRA_HOJE, irPraHoje);
    return () => window.removeEventListener(EVENTO_IR_PRA_HOJE, irPraHoje);
  });

  const alternarColuna = (t: Tipo) => setRecolhidas((r) => (r.includes(t) ? r.filter((x) => x !== t) : [...r, t]));
  const opcoesPeriodo = Array.from({ length: 37 }, (_, i) => somarMeses(inicioDoMes(hoje), i - 12));

  // Deslizar o dedo para os lados troca o tipo da coluna do meio (o saldo fica parado).
  const inicioToque = (e: React.TouchEvent) => {
    const t = e.touches[0];
    toque.current = { x: t.clientX, y: t.clientY };
  };
  const fimToque = (e: React.TouchEvent) => {
    const t0 = toque.current;
    toque.current = null;
    if (!t0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - t0.x;
    const dy = t.clientY - t0.y;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const i = ORDEM_CELULAR.indexOf(coluna) + (dx < 0 ? 1 : -1);
    if (i < 0 || i >= ORDEM_CELULAR.length) return;
    setDeslize(dx < 0 ? 'esq' : 'dir');
    setColuna(ORDEM_CELULAR[i]);
  };

  const celulaTipo = (r: ResumoDia, c: RotuloTipo, rotuloDia: string, recolhida = false) => {
    const v = r[CAMPO[c.tipo]];
    const zero = Math.abs(v) < 0.005;
    const previsto = c.tipo === 'diario' && r.diarioPrevisto;
    return (
      <td key={c.tipo}>
        <div className={`celula-tipo${zero ? ' zero' : ''}${recolhida ? ' recolhida' : ''}`}>
          <button className="add" onClick={() => lancar(r.dia, c.tipo)} aria-label={`Adicionar movimentação em ${c.plural} do dia ${rotuloDia}`}>
            <TipoIcone tipo={c.tipo} apagado={zero} />
          </button>
          {!recolhida && (
            <button className={`valor${previsto ? ' previsto' : ''}`} onClick={() => verDia(r.dia, c.tipo)} aria-label={`Ver movimentações de ${c.plural} do dia ${rotuloDia}`}>
              {moeda(v)}
            </button>
          )}
        </div>
      </td>
    );
  };

  const classesLinha = (r: ResumoDia) => {
    const sem = diaDaSemana(r.dia);
    return [r.dia === hoje ? 'hoje' : '', sem === 'sáb' || sem === 'dom' ? 'fim-semana' : '', dados.checkins.includes(r.dia) ? 'conferido' : ''].join(' ');
  };

  const celulaDia = (r: ResumoDia, n: number, rotuloDia: string, rowSpan?: number) => (
    <td className="col-dia" rowSpan={rowSpan}>
      <button className="dia" onClick={() => marcarCheckin(r.dia, !dados.checkins.includes(r.dia))} aria-label={`Alternar check-in do dia ${rotuloDia}`}>
        {n}
      </button>
    </td>
  );

  const celulaSaldo = (r: ResumoDia, rotuloDia: string, rowSpan?: number) => (
    <td className={`col-saldo${r.saldo < -0.004 ? ' neg' : ''}`} rowSpan={rowSpan}>
      <button className="saldo" onClick={() => verDia(r.dia)} aria-label={`Ver movimentações do dia ${rotuloDia}`}>
        {moeda(r.saldo)}
      </button>
    </td>
  );

  /* ---------- celular: um mês, uma coluna de tipo por vez ---------- */

  if (celular) {
    const [ano, m0] = partes(inicio);
    const total = diasNoMes(ano, m0);
    const doMes = Array.from({ length: total }, (_, i) => porDia.get(fazerDia(ano, m0, i + 1))).filter((r): r is ResumoDia => !!r);
    const todas = coluna === 'todas';
    const tiposNaColuna = todas ? TIPOS : TIPOS.filter((t) => t.tipo === coluna);

    return (
      <>
        <BarraMes mes={inicio} setMes={setInicio} onHoje={irPraHoje} />
        <div className="grade-saldos" ref={grade} onTouchStart={inicioToque} onTouchEnd={fimToque}>
          <table className={`tabela cheia${todas ? ' todas' : ''}`}>
            <thead>
              <tr>
                <th className="titulo-mes" colSpan={3} />
              </tr>
              <tr>
                <th className="col-dia">dia</th>
                <th>
                  <label className="seletor-tipo">
                    <span className="pilula-tipo">
                      {todas ? <IconeTodas /> : <TipoIcone tipo={coluna as Tipo} />}
                      {nomeColuna(coluna)}
                      <IconeChevronBaixo />
                    </span>
                    <select
                      value={coluna}
                      onChange={(e) => {
                        setDeslize(null);
                        setColuna(e.target.value as ColunaCelular);
                      }}
                      aria-label="Coluna"
                    >
                      {ORDEM_CELULAR.map((c) => (
                        <option key={c} value={c}>
                          {nomeColuna(c)}
                        </option>
                      ))}
                    </select>
                  </label>
                </th>
                <th className="col-saldo">
                  <span className="cab-tipo" style={{ justifyContent: 'flex-end' }}>
                    saldos
                  </span>
                </th>
              </tr>
            </thead>
            <tbody key={`${coluna}-${inicio}`} className={deslize ? `desliza-${deslize}` : undefined}>
              {doMes.map((r, i) => {
                const rotuloDia = `${i + 1} de ${nomeMes(m0)} de ${ano}`;
                if (!todas) {
                  return (
                    <tr key={r.dia} className={classesLinha(r)} ref={r.dia === hoje ? linhaHoje : undefined}>
                      {celulaDia(r, i + 1, rotuloDia)}
                      {celulaTipo(r, tiposNaColuna[0], rotuloDia)}
                      {celulaSaldo(r, rotuloDia)}
                    </tr>
                  );
                }
                return tiposNaColuna.map((c, j) => (
                  <tr
                    key={`${r.dia}-${c.tipo}`}
                    className={`${classesLinha(r)}${j < tiposNaColuna.length - 1 ? ' sub' : ' ultima-sub'}`}
                    ref={r.dia === hoje && j === 0 ? linhaHoje : undefined}
                  >
                    {j === 0 && celulaDia(r, i + 1, rotuloDia, tiposNaColuna.length)}
                    {celulaTipo(r, c, rotuloDia)}
                    {j === 0 && celulaSaldo(r, rotuloDia, tiposNaColuna.length)}
                  </tr>
                ));
              })}
            </tbody>
            <tfoot>
              {tiposNaColuna.map((c, j) => {
                const soma = doMes.reduce((s, r) => s + r[CAMPO[c.tipo]], 0);
                return (
                  <tr key={c.tipo}>
                    {j === 0 && <td className="col-dia" rowSpan={tiposNaColuna.length} />}
                    <td>
                      <div className={`celula-tipo${Math.abs(soma) < 0.005 ? ' zero' : ''}`}>
                        <span className="add">
                          <TipoIcone tipo={c.tipo} />
                        </span>
                        <span className="valor">{moeda(soma)}</span>
                      </div>
                    </td>
                    {j === 0 && <td className="col-saldo" rowSpan={tiposNaColuna.length} />}
                  </tr>
                );
              })}
            </tfoot>
          </table>
        </div>
      </>
    );
  }

  /* ---------- computador: 12 meses lado a lado ---------- */

  return (
    <>
      <BarraTitulo
        titulo="saldos"
        centro={
          <div className="seletor">
            <button className="seta" onClick={() => setInicio(somarMeses(inicio, -12))} aria-label="Ano anterior">
              <IconeChevronDuploEsq />
            </button>
            <button className="seta" onClick={() => setInicio(somarMeses(inicio, -1))} aria-label="Mês anterior">
              <IconeChevronEsq />
            </button>
            <div style={{ position: 'relative' }}>
              <button className="periodo" onClick={() => setListaAberta((v) => !v)} aria-haspopup="listbox" aria-expanded={listaAberta}>
                {mesAno(inicio)} - {mesAno(fim)}
                <IconeChevronBaixo />
              </button>
              {listaAberta && (
                <>
                  <div className="fundo-transparente" style={{ background: 'none' }} onClick={() => setListaAberta(false)} />
                  <div className="lista-periodos" role="listbox" style={{ zIndex: 46 }}>
                    {opcoesPeriodo.map((m) => (
                      <button
                        key={m}
                        role="option"
                        aria-current={m === inicio}
                        aria-selected={m === inicio}
                        onClick={() => {
                          setInicio(m);
                          setListaAberta(false);
                        }}
                      >
                        {mesAno(m)} - {mesAno(fimDoMes(somarMeses(m, MESES_NA_TELA - 1)))}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button className="seta" onClick={() => setInicio(somarMeses(inicio, 1))} aria-label="Próximo mês">
              <IconeChevronDir />
            </button>
            <button className="seta" onClick={() => setInicio(somarMeses(inicio, 12))} aria-label="Próximo ano">
              <IconeChevronDuploDir />
            </button>
          </div>
        }
      />

      <div className="grade-saldos" ref={grade}>
        {meses.map((mes) => {
          const [ano, m0] = partes(mes);
          const total = diasNoMes(ano, m0);
          const doMes = Array.from({ length: total }, (_, i) => porDia.get(fazerDia(ano, m0, i + 1))).filter((r): r is ResumoDia => !!r);
          return (
            <table className="tabela" key={mes}>
              <thead>
                <tr>
                  <th className="titulo-mes" colSpan={TIPOS.length + 2}>
                    {nomeMes(m0)} de {ano}
                  </th>
                </tr>
                <tr>
                  <th className="col-dia">dia</th>
                  {TIPOS.map((c) => {
                    const recolhida = recolhidas.includes(c.tipo);
                    return (
                      <th key={c.tipo}>
                        <button
                          className={`cab-tipo${recolhida ? ' recolhida' : ''}`}
                          onClick={() => alternarColuna(c.tipo)}
                          aria-label={`${recolhida ? 'Expandir' : 'Encolher'} coluna ${c.plural}`}
                          title={recolhida ? `mostrar ${c.plural}` : `encolher ${c.plural}`}
                        >
                          <TipoIcone tipo={c.tipo} />
                          {!recolhida && c.plural}
                        </button>
                      </th>
                    );
                  })}
                  <th className="col-saldo">
                    <span className="cab-tipo" style={{ justifyContent: 'flex-end' }}>
                      saldos
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: 31 }, (_, i) => {
                  const r = i < total ? porDia.get(fazerDia(ano, m0, i + 1)) : undefined;
                  if (!r) {
                    return (
                      <tr key={i} className="vazia" aria-hidden="true">
                        <td className="col-dia" />
                        {TIPOS.map((c) => (
                          <td key={c.tipo}>
                            <div className={`celula-tipo${recolhidas.includes(c.tipo) ? ' recolhida' : ''}`} />
                          </td>
                        ))}
                        <td className="col-saldo" />
                      </tr>
                    );
                  }
                  const rotuloDia = `${i + 1} de ${nomeMes(m0)} de ${ano}`;
                  return (
                    <tr key={r.dia} className={classesLinha(r)} ref={r.dia === hoje ? linhaHoje : undefined}>
                      {celulaDia(r, i + 1, rotuloDia)}
                      {TIPOS.map((c) => celulaTipo(r, c, rotuloDia, recolhidas.includes(c.tipo)))}
                      {celulaSaldo(r, rotuloDia)}
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="col-dia" />
                  {TIPOS.map((c) => {
                    const soma = doMes.reduce((s, r) => s + r[CAMPO[c.tipo]], 0);
                    const recolhida = recolhidas.includes(c.tipo);
                    return (
                      <td key={c.tipo}>
                        <div className={`celula-tipo${Math.abs(soma) < 0.005 ? ' zero' : ''}${recolhida ? ' recolhida' : ''}`}>
                          <span className="add">
                            <TipoIcone tipo={c.tipo} />
                          </span>
                          {!recolhida && <span className="valor">{moeda(soma)}</span>}
                        </div>
                      </td>
                    );
                  })}
                  <td className="col-saldo" />
                </tr>
              </tfoot>
            </table>
          );
        })}
      </div>
    </>
  );
}
