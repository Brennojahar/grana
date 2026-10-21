import { useEffect, useMemo, useRef, useState } from 'react';
import { BarraTitulo } from '../componentes/BarraTitulo';
import { useFolhas } from '../componentes/Folhas';
import { TipoIcone } from '../componentes/Icones';
import { dia as fazerDia, diaDaSemana, diasNoMes, fimDoMes, inicioDoMes, nomeMes, partes, rotuloMesCurto, somarMeses } from '../lib/datas';
import { useGrana } from '../lib/estado';
import { numero } from '../lib/formato';
import { resumoDiario } from '../lib/motor';
import type { Dia, ResumoDia, Tipo } from '../lib/tipos';

const COLUNAS: { tipo: Tipo; nome: string; campo: 'entradas' | 'saidas' | 'diarios' | 'economias' | 'cartao' }[] = [
  { tipo: 'entrada', nome: 'entradas', campo: 'entradas' },
  { tipo: 'saida', nome: 'saídas', campo: 'saidas' },
  { tipo: 'diario', nome: 'diário', campo: 'diarios' },
  { tipo: 'economia', nome: 'economias', campo: 'economias' },
  { tipo: 'cartao', nome: 'cartão', campo: 'cartao' },
];

const MESES_NA_TELA = 12;
const CHAVE_COLUNAS = 'grana:colunas-ocultas';

function lerOcultas(): Tipo[] {
  try {
    return JSON.parse(localStorage.getItem(CHAVE_COLUNAS) ?? '[]');
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

export function Saldos() {
  const { dados, hoje, marcarCheckin } = useGrana();
  const { verDia, lancar } = useFolhas();
  const [inicio, setInicio] = useState<Dia>(() => inicioDoMes(hoje));
  const [ocultas, setOcultas] = useState<Tipo[]>(lerOcultas);
  // No celular cabe uma coluna de tipo por vez (mais o saldo); a pessoa escolhe qual nos botões.
  const celular = useCelular();
  const [colunaCelular, setColunaCelular] = useState<Tipo>('diario');
  const linhaHoje = useRef<HTMLTableRowElement | null>(null);
  const grade = useRef<HTMLDivElement>(null);

  const fim = fimDoMes(somarMeses(inicio, MESES_NA_TELA - 1));
  const porDia = useMemo(() => {
    const m = new Map<Dia, ResumoDia>();
    for (const r of resumoDiario(dados, inicio, fim, hoje)) m.set(r.dia, r);
    return m;
  }, [dados, inicio, fim, hoje]);

  const colunas = celular ? COLUNAS.filter((c) => c.tipo === colunaCelular) : COLUNAS.filter((c) => !ocultas.includes(c.tipo));
  const meses = Array.from({ length: MESES_NA_TELA }, (_, i) => somarMeses(inicio, i));

  useEffect(() => {
    try {
      localStorage.setItem(CHAVE_COLUNAS, JSON.stringify(ocultas));
    } catch {
      /* sem armazenamento */
    }
  }, [ocultas]);

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
    requestAnimationFrame(centralizarHoje);
  };

  // Abre já com o dia de hoje à vista.
  useEffect(centralizarHoje, []);

  return (
    <>
      <BarraTitulo titulo="saldos">
        <div className="seletor-periodo">
          <button className="seta so-largo" onClick={() => setInicio(somarMeses(inicio, -12))} aria-label="Ano anterior">
            «
          </button>
          <button className="seta" onClick={() => setInicio(somarMeses(inicio, -1))} aria-label="Mês anterior">
            ‹
          </button>
          <button className="periodo" onClick={irPraHoje} title="Voltar para hoje">
            {rotuloMesCurto(inicio)} – {rotuloMesCurto(fim)}
          </button>
          <button className="seta" onClick={() => setInicio(somarMeses(inicio, 1))} aria-label="Próximo mês">
            ›
          </button>
          <button className="seta so-largo" onClick={() => setInicio(somarMeses(inicio, 12))} aria-label="Próximo ano">
            »
          </button>
        </div>
      </BarraTitulo>

      <div className="cabeca-secao">
        <div className="colunas-escolha" aria-label="Colunas">
          {COLUNAS.map((c) => {
            const visivel = celular ? c.tipo === colunaCelular : !ocultas.includes(c.tipo);
            const alternar = () => setOcultas(visivel ? [...ocultas, c.tipo] : ocultas.filter((t) => t !== c.tipo));
            return (
              <button key={c.tipo} className="botao" aria-pressed={visivel} onClick={celular ? () => setColunaCelular(c.tipo) : alternar}>
                <TipoIcone tipo={c.tipo} />
                {c.nome}
              </button>
            );
          })}
        </div>
        <button className="botao-texto so-largo" onClick={irPraHoje}>
          ir pra hoje
        </button>
      </div>

      <div className="grade-saldos" ref={grade}>
        {meses.map((mes) => {
          const [ano, m0] = partes(mes);
          const total = diasNoMes(ano, m0);
          const doMes = Array.from({ length: total }, (_, i) => porDia.get(fazerDia(ano, m0, i + 1))!).filter(Boolean);
          const soma = (campo: (typeof COLUNAS)[number]['campo']) => doMes.reduce((s, r) => s + r[campo], 0);
          const temPrevisto = doMes.some((r) => r.diarioPrevisto);
          return (
            <section className="mes-bloco" key={mes}>
              <table className="tabela-mes">
                <thead>
                  <tr>
                    <th colSpan={colunas.length + 2}>
                      {nomeMes(m0)} de {ano}
                    </th>
                  </tr>
                  <tr>
                    <th className="col-dia" style={{ textAlign: 'center' }}>
                      dia
                    </th>
                    {colunas.map((c) => (
                      <th key={c.tipo}>
                        <span className="cab">
                          <TipoIcone tipo={c.tipo} />
                          {c.nome}
                        </span>
                      </th>
                    ))}
                    <th>saldo</th>
                  </tr>
                </thead>
                <tbody>
                  {Array.from({ length: 31 }, (_, i) => {
                    const r = i < total ? porDia.get(fazerDia(ano, m0, i + 1)) : undefined;
                    if (!r) {
                      return (
                        <tr key={i} aria-hidden="true">
                          <td className="col-dia">
                            <span className="celula" />
                          </td>
                          {colunas.map((c) => (
                            <td key={c.tipo} />
                          ))}
                          <td />
                        </tr>
                      );
                    }
                    const sem = diaDaSemana(r.dia);
                    const classes = [
                      r.dia === hoje ? 'hoje' : '',
                      sem === 'sáb' || sem === 'dom' ? 'fim-semana' : '',
                      dados.checkins.includes(r.dia) ? 'conferido' : '',
                    ].join(' ');
                    return (
                      <tr key={r.dia} className={classes} ref={r.dia === hoje ? linhaHoje : undefined}>
                        <td className="col-dia">
                          <button
                            className="celula"
                            onClick={() => (r.dia <= hoje ? marcarCheckin(r.dia, !dados.checkins.includes(r.dia)) : verDia(r.dia))}
                            title={r.dia <= hoje ? 'Marcar ou desmarcar o dia como conferido' : `${sem}, ver o dia`}
                          >
                            {i + 1}
                          </button>
                        </td>
                        {colunas.map((c) => {
                          const v = r[c.campo];
                          const zero = Math.abs(v) < 0.005;
                          const previsto = c.tipo === 'diario' && r.diarioPrevisto;
                          return (
                            <td key={c.tipo}>
                              <button
                                className={`celula${zero ? ' zero' : ''}`}
                                onClick={() => (zero ? lancar(r.dia, c.tipo) : verDia(r.dia))}
                                aria-label={zero ? `Lançar ${c.nome} em ${i + 1}/${m0 + 1}` : `Ver ${c.nome} de ${i + 1}/${m0 + 1}`}
                              >
                                <TipoIcone tipo={c.tipo} apagado={zero} />
                                <span className={`valor${previsto ? ' previsto' : ''}`}>{numero(v)}</span>
                              </button>
                            </td>
                          );
                        })}
                        <td className="col-saldo">
                          <button className={`celula${r.saldo < -0.004 ? ' neg' : ''}`} onClick={() => verDia(r.dia)}>
                            {numero(r.saldo)}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td className="col-dia">
                      <span className="celula meta">total</span>
                    </td>
                    {colunas.map((c) => (
                      <td key={c.tipo}>
                        <span className="celula">
                          <TipoIcone tipo={c.tipo} />
                          <span className={`valor${c.tipo === 'diario' && temPrevisto ? ' previsto' : ''}`}>{numero(soma(c.campo))}</span>
                        </span>
                      </td>
                    ))}
                    <td>
                      <span className="celula" style={{ justifyContent: 'flex-end' }}>
                        {numero(doMes.at(-1)?.saldo ?? 0)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </section>
          );
        })}
      </div>
      <p className="meta" style={{ marginTop: 12 }}>
        Toque no número do dia para marcar como conferido. Toque num valor zerado para lançar; num valor preenchido, para ver o dia. Diário em <span className="previsto">itálico</span> é a previsão.
      </p>
    </>
  );
}
