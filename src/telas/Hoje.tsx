import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { nomeTipo, useFolhas } from '../componentes/Folhas';
import { Grafico } from '../componentes/Grafico';
import { Valor } from '../componentes/Valor';
import { diaDaSemana, fimDoMes, partes, rotuloDia, somarDias } from '../lib/datas';
import { useGrana } from '../lib/estado';
import { moeda, numero } from '../lib/formato';
import { horizonte, movimentos, previsaoDiaria, totalPrevisaoMensal } from '../lib/motor';

export function Hoje() {
  const { dados, hoje, marcarCheckin } = useGrana();
  const { verDia, editarMov, lancar } = useFolhas();

  const h = useMemo(() => horizonte(dados, hoje, 12), [dados, hoje]);
  const proximos = useMemo(() => movimentos(dados, somarDias(hoje, 1), somarDias(hoje, 14)), [dados, hoje]);
  const deHoje = useMemo(() => movimentos(dados, hoje, hoje), [dados, hoje]);

  const saldoHoje = h.dias[0]?.saldo ?? 0;
  const fimMes = h.dias.find((d) => d.dia === fimDoMes(hoje));
  const prev = previsaoDiaria(dados);
  const conferido = dados.checkins.includes(hoje);
  const vazio = dados.lancamentos.length === 0 && dados.recorrencias.length === 0;
  const [, m] = partes(hoje);

  const porDia = new Map<string, typeof proximos>();
  for (const mv of proximos) porDia.set(mv.data, [...(porDia.get(mv.data) ?? []), mv]);

  return (
    <>
      <section className="hero">
        <div className="linha-topo">
          <span className="meta">
            Saldo hoje
            <br />
            {diaDaSemana(hoje)}, {rotuloDia(hoje)}
          </span>
          <button className="botao" aria-pressed={conferido} onClick={() => marcarCheckin(hoje, !conferido)}>
            {conferido ? 'Dia conferido ✓' : 'Conferi o dia'}
          </button>
        </div>
        <h1 className="gigante" style={{ '--chars': numero(saldoHoje).length + 2 } as React.CSSProperties}>
          <Valor v={saldoHoje} cifrao />
        </h1>
      </section>

      {vazio ? (
        <section className="secao">
          <p className="subtitulo" style={{ maxWidth: 680 }}>
            Comece lançando quanto você tem hoje como uma entrada.
          </p>
          <div className="acoes" style={{ maxWidth: 520 }}>
            <button className="botao cheio" onClick={() => lancar(hoje, 'entrada')}>
              Lançar saldo de hoje
            </button>
            <Link className="botao" to="/ajustes">
              Importar meus dados
            </Link>
          </div>
        </section>
      ) : (
        <>
          <section className="secao">
            <div className="grade-meta">
              <div>
                <span className="meta">Fim de {['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][m]}</span>
                <span className="meta-num">
                  <Valor v={fimMes?.saldo ?? saldoHoje} />
                </span>
              </div>
              <div>
                <span className="meta">Menor saldo em 12 meses</span>
                <span className="meta-num">
                  <Valor v={h.menor?.saldo ?? 0} />
                </span>
                <span className="meta suave">{h.menor ? rotuloDia(h.menor.dia) : ''}</span>
              </div>
              <div>
                <span className="meta">Daqui a 12 meses</span>
                <span className="meta-num">
                  <Valor v={h.final?.saldo ?? 0} />
                </span>
              </div>
              <div>
                <span className="meta">Previsão diária</span>
                <span className="meta-num">{moeda(prev)}</span>
                <Link to="/ajustes#previsao" className="meta suave">
                  {moeda(totalPrevisaoMensal(dados))}/mês ÷ {dados.perfil.divisor_dias} dias
                </Link>
              </div>
            </div>
            {h.primeiroNegativo && (
              <div className="aviso cheio">
                <span className="meta">
                  O saldo fica negativo em {rotuloDia(h.primeiroNegativo.dia)} ({moeda(h.primeiroNegativo.saldo)}).
                </span>
                <button className="botao-texto" onClick={() => verDia(h.primeiroNegativo!.dia)}>
                  Ver dia
                </button>
              </div>
            )}
          </section>

          <section className="secao">
            <div className="cabeca-secao">
              <span className="meta">Próximos 12 meses</span>
              <span className="meta suave">toque para ler</span>
            </div>
            <Grafico dias={h.dias} />
          </section>

          <section className="secao">
            <div className="cabeca-secao">
              <h2 className="subtitulo">Hoje</h2>
              <button className="botao-texto" onClick={() => lancar(hoje, 'diario')}>
                + gasto do dia
              </button>
            </div>
            <ul className="lista">
              {deHoje.map((mv) => (
                <li key={mv.chave}>
                  <button className="item" onClick={() => editarMov(mv)}>
                    <span className="item-desc">
                      {mv.descricao || nomeTipo(mv.tipo)}
                      <span className="meta suave">{nomeTipo(mv.tipo)}</span>
                    </span>
                    <span className="item-valor">
                      {mv.tipo === 'entrada' ? '+' : '−'}
                      <Valor v={mv.valor} />
                    </span>
                  </button>
                </li>
              ))}
              {deHoje.length === 0 && <li className="vazio meta suave">Nada lançado hoje ainda.</li>}
            </ul>
          </section>

          <section className="secao">
            <div className="cabeca-secao">
              <h2 className="subtitulo">Próximos dias</h2>
              <Link className="botao-texto" to="/mes">
                Ver mês
              </Link>
            </div>
            {[...porDia.entries()].map(([d, lista]) => (
              <div className="grupo-dia" key={d}>
                <button className="meta" onClick={() => verDia(d)}>
                  {diaDaSemana(d)} · {rotuloDia(d)}
                </button>
                <ul className="lista">
                  {lista.map((mv) => (
                    <li key={mv.chave}>
                      <button className="item" onClick={() => editarMov(mv)}>
                        <span className="item-desc">
                          {mv.descricao || nomeTipo(mv.tipo)}
                          <span className="meta suave">
                            {nomeTipo(mv.tipo)}
                            {mv.recorrencia_id ? ' · repete' : ''}
                          </span>
                        </span>
                        <span className="item-valor">
                          {mv.tipo === 'entrada' ? '+' : '−'}
                          <Valor v={mv.valor} />
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            {porDia.size === 0 && <p className="vazio meta suave">Nada previsto nas próximas duas semanas além do diário.</p>}
          </section>
        </>
      )}
    </>
  );
}
