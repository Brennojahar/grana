import { useEffect, useMemo, useRef, useState } from 'react';
import { BarraTitulo } from '../componentes/BarraTitulo';
import { useFolhas } from '../componentes/Folhas';
import { IconeChevronBaixo, IconeChevronDir, IconeChevronDuploDir, IconeChevronDuploEsq, IconeChevronEsq, IconeHoje, TipoIcone } from '../componentes/Icones';
import { dia as fazerDia, diaDaSemana, diasNoMes, fimDoMes, inicioDoMes, nomeMes, partes, somarMeses } from '../lib/datas';
import { useGrana } from '../lib/estado';
import { moeda } from '../lib/formato';
import { resumoDiario } from '../lib/motor';
import { TIPOS } from '../lib/rotulos';
import type { Dia, ResumoDia, Tipo } from '../lib/tipos';

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

const mesCurto = (d: Dia) => {
  const [y, m] = partes(d);
  return `${MESES_CURTOS[m]}/${String(y).slice(2)}`;
};

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

function useCelular(): boolean {
  const consulta = '(max-width: 699px)';
  const [celular, setCelular] = useState(() => window.matchMedia(consulta).matches);
  useEffect(() => {
    const m = window.matchMedia(consulta);
    const mudar = () => setCelular(m.matches);
    m.addEventListener('change', mudar);
    return () => m.removeEventListener('change', mudar);
  }, []);
  return celular;
}

/** Evento para o "ir pra hoje" do menu lateral pedir à grade que volte para hoje. */
export const EVENTO_IR_PRA_HOJE = 'grana:ir-pra-hoje';

export function Saldos() {
  const { dados, hoje, marcarCheckin } = useGrana();
  const { verDia, lancar } = useFolhas();
  const [inicio, setInicio] = useState<Dia>(() => inicioDoMes(hoje));
  const [recolhidas, setRecolhidas] = useState<Tipo[]>(lerRecolhidas);
  const [listaAberta, setListaAberta] = useState(false);
  const celular = useCelular();
  const [tipoCelular, setTipoCelular] = useState<Tipo>('diario');
  const linhaHoje = useRef<HTMLTableRowElement | null>(null);
  const grade = useRef<HTMLDivElement>(null);

  // No celular cabe um mês por vez: `inicio` passa a ser o mês que está na tela.
  const quantos = celular ? 1 : MESES_NA_TELA;
  const fim = fimDoMes(somarMeses(inicio, quantos - 1));
  const porDia = useMemo(() => {
    const m = new Map<Dia, ResumoDia>();
    for (const r of resumoDiario(dados, inicio, fim, hoje)) m.set(r.dia, r);
    return m;
  }, [dados, inicio, fim, hoje]);

  const colunas = celular ? TIPOS.filter((t) => t.tipo === tipoCelular) : TIPOS;
  const meses = Array.from({ length: quantos }, (_, i) => somarMeses(inicio, i));
  const toque = useRef<{ x: number; y: number } | null>(null);

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
  // Ao trocar de mês no celular: volta para o topo, ou para hoje se for o mês atual.
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
  const rotuloPeriodo = (m: Dia) => (celular ? mesCurto(m) : `${mesAno(m)} - ${mesAno(fimDoMes(somarMeses(m, MESES_NA_TELA - 1)))}`);

  // Deslizar o dedo para os lados troca de mês (só no celular, e só se o gesto for mais lateral que vertical).
  const inicioToque = (e: React.TouchEvent) => {
    const t = e.touches[0];
    toque.current = { x: t.clientX, y: t.clientY };
  };
  const fimToque = (e: React.TouchEvent) => {
    const t0 = toque.current;
    toque.current = null;
    if (!celular || !t0) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - t0.x;
    const dy = t.clientY - t0.y;
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) setInicio(somarMeses(inicio, dx < 0 ? 1 : -1));
  };

  return (
    <>
      <BarraTitulo
        titulo="saldos"
        centro={
          <div className="seletor">
            <button className="seta so-largo" onClick={() => setInicio(somarMeses(inicio, -12))} aria-label="Ano anterior">
              <IconeChevronDuploEsq />
            </button>
            <button className="seta" onClick={() => setInicio(somarMeses(inicio, -1))} aria-label="Mês anterior">
              <IconeChevronEsq />
            </button>
            <div style={{ position: 'relative' }}>
              <button className="periodo" onClick={() => setListaAberta((v) => !v)} aria-haspopup="listbox" aria-expanded={listaAberta}>
                {rotuloPeriodo(inicio)}
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
                        {rotuloPeriodo(m)}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
            <button className="seta" onClick={() => setInicio(somarMeses(inicio, 1))} aria-label="Próximo mês">
              <IconeChevronDir />
            </button>
            <button className="seta so-largo" onClick={() => setInicio(somarMeses(inicio, 12))} aria-label="Próximo ano">
              <IconeChevronDuploDir />
            </button>
          </div>
        }
        direita={
          celular ? (
            <button className="icone-botao" onClick={irPraHoje} aria-label="Ir pra hoje">
              <IconeHoje dia={partes(hoje)[2]} />
            </button>
          ) : undefined
        }
      />

      <div className="grade-saldos" ref={grade} onTouchStart={inicioToque} onTouchEnd={fimToque}>
        {meses.map((mes) => {
          const [ano, m0] = partes(mes);
          const total = diasNoMes(ano, m0);
          const doMes = Array.from({ length: total }, (_, i) => porDia.get(fazerDia(ano, m0, i + 1))).filter((r): r is ResumoDia => !!r);
          return (
            <table className={`tabela${celular ? ' cheia' : ''}`} key={mes}>
              <thead>
                <tr>
                  <th className="titulo-mes" colSpan={colunas.length + 2}>
                    {nomeMes(m0)} de {ano}
                  </th>
                </tr>
                <tr>
                  <th className="col-dia">dia</th>
                  {colunas.map((c) => {
                    const recolhida = !celular && recolhidas.includes(c.tipo);
                    if (celular) {
                      return (
                        <th key={c.tipo}>
                          <label className="seletor-tipo">
                            <TipoIcone tipo={c.tipo} />
                            <span style={{ flex: 1, textAlign: 'left' }}>{c.plural}</span>
                            <IconeChevronBaixo />
                            <select value={tipoCelular} onChange={(e) => setTipoCelular(e.target.value as Tipo)} aria-label="Coluna">
                              {TIPOS.map((t) => (
                                <option key={t.tipo} value={t.tipo}>
                                  {t.plural}
                                </option>
                              ))}
                            </select>
                          </label>
                        </th>
                      );
                    }
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
                {Array.from({ length: celular ? total : 31 }, (_, i) => {
                  const r = i < total ? porDia.get(fazerDia(ano, m0, i + 1)) : undefined;
                  if (!r) {
                    return (
                      <tr key={i} className="vazia" aria-hidden="true">
                        <td className="col-dia" />
                        {colunas.map((c) => (
                          <td key={c.tipo}>
                            <div className={`celula-tipo${!celular && recolhidas.includes(c.tipo) ? ' recolhida' : ''}`} />
                          </td>
                        ))}
                        <td className="col-saldo" />
                      </tr>
                    );
                  }
                  const sem = diaDaSemana(r.dia);
                  const classes = [
                    r.dia === hoje ? 'hoje' : '',
                    sem === 'sáb' || sem === 'dom' ? 'fim-semana' : '',
                    dados.checkins.includes(r.dia) ? 'conferido' : '',
                  ].join(' ');
                  const rotuloDia = `${i + 1} de ${nomeMes(m0)} de ${ano}`;
                  return (
                    <tr key={r.dia} className={classes} ref={r.dia === hoje ? linhaHoje : undefined}>
                      <td className="col-dia">
                        <button className="dia" onClick={() => marcarCheckin(r.dia, !dados.checkins.includes(r.dia))} aria-label={`Alternar check-in do dia ${rotuloDia}`}>
                          {i + 1}
                        </button>
                      </td>
                      {colunas.map((c) => {
                        const v = r[CAMPO[c.tipo]];
                        const zero = Math.abs(v) < 0.005;
                        const previsto = c.tipo === 'diario' && r.diarioPrevisto;
                        const recolhida = !celular && recolhidas.includes(c.tipo);
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
                      })}
                      <td className={`col-saldo${r.saldo < -0.004 ? ' neg' : ''}`}>
                        <button className="saldo" onClick={() => verDia(r.dia)} aria-label={`Ver movimentações do dia ${rotuloDia}`}>
                          {moeda(r.saldo)}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr>
                  <td className="col-dia" />
                  {colunas.map((c) => {
                    const soma = doMes.reduce((s, r) => s + r[CAMPO[c.tipo]], 0);
                    const zero = Math.abs(soma) < 0.005;
                    const recolhida = !celular && recolhidas.includes(c.tipo);
                    return (
                      <td key={c.tipo}>
                        <div className={`celula-tipo${zero ? ' zero' : ''}${recolhida ? ' recolhida' : ''}`}>
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
