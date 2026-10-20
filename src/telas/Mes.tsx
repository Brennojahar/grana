import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useFolhas } from '../componentes/Folhas';
import { Valor } from '../componentes/Valor';
import { diaDaSemana, fimDoMes, inicioDoMes, nomeMes, partes, somarMeses } from '../lib/datas';
import { useGrana } from '../lib/estado';
import { resumoDiario, totaisMes } from '../lib/motor';

export function Mes() {
  const { dados, hoje } = useGrana();
  const { verDia } = useFolhas();
  const navegar = useNavigate();
  const { mes: param } = useParams();
  const mes = param && /^\d{4}-\d{2}$/.test(param) ? `${param}-01` : inicioDoMes(hoje);
  const [ano, m0] = partes(mes);

  const dias = useMemo(() => resumoDiario(dados, mes, fimDoMes(mes), hoje), [dados, mes, hoje]);
  const t = useMemo(() => totaisMes(dados, mes, hoje), [dados, mes, hoje]);
  const ir = (n: number) => navegar(`/mes/${somarMeses(mes, n).slice(0, 7)}`);

  return (
    <>
      <section className="hero">
        <div className="linha-topo">
          <span className="meta">Livro do mês</span>
          <div className="setas">
            <button className="seta" onClick={() => ir(-1)} aria-label="Mês anterior">
              ←
            </button>
            {mes !== inicioDoMes(hoje) && (
              <button className="botao" onClick={() => navegar('/mes')}>
                Hoje
              </button>
            )}
            <button className="seta" onClick={() => ir(1)} aria-label="Próximo mês">
              →
            </button>
          </div>
        </div>
        <h1 className="titulo">
          {nomeMes(m0)}
          <br />
          <span className="suave">{ano}</span>
        </h1>
      </section>

      <section className="secao">
        <div className="grade-meta">
          <div>
            <span className="meta">Entradas</span>
            <span className="meta-num">
              <Valor v={t.entradas} />
            </span>
          </div>
          <div>
            <span className="meta">Custo de vida</span>
            <span className="meta-num">
              <Valor v={t.custoDeVidaPrevisto} />
            </span>
            <span className="meta suave">{t.custoDeVidaPrevisto !== t.custoDeVida ? 'com previsão do diário' : 'tudo lançado'}</span>
          </div>
          <div>
            <span className="meta">Sobra</span>
            <span className="meta-num">
              <Valor v={t.sobraPrevista} />
            </span>
          </div>
          <div>
            <span className="meta">Saldo no fim</span>
            <span className="meta-num">
              <Valor v={t.saldoFinal} />
            </span>
          </div>
        </div>
      </section>

      <section className="secao" style={{ overflowX: 'auto' }}>
        <table className="livro">
          <thead>
            <tr>
              <th>Dia</th>
              <th>Entrou</th>
              <th className="col-estreita">Saiu</th>
              <th className="col-larga">Saídas</th>
              <th className="col-larga">Diário</th>
              <th className="col-larga">Cartão</th>
              <th className="col-larga">Economia</th>
              <th>Saldo</th>
            </tr>
          </thead>
          <tbody>
            {dias.map((d) => {
              const sem = diaDaSemana(d.dia);
              const saiu = d.saidas + d.diarios + d.cartao + d.economias;
              return (
                <tr key={d.dia} className={[d.dia === hoje ? 'hoje' : '', sem === 'sáb' || sem === 'dom' ? 'fim-semana' : ''].join(' ')}>
                  <td>
                    <button onClick={() => verDia(d.dia)}>
                      <b>{String(partes(d.dia)[2]).padStart(2, '0')}</b> <span className="meta">{sem}</span>
                    </button>
                  </td>
                  <td>
                    <button onClick={() => verDia(d.dia)}>
                      <Valor v={d.entradas} traco />
                    </button>
                  </td>
                  <td className="col-estreita">
                    <button onClick={() => verDia(d.dia)}>
                      <Valor v={saiu} traco previsto={d.diarioPrevisto && saiu === d.diarios} />
                    </button>
                  </td>
                  <td className="col-larga">
                    <button onClick={() => verDia(d.dia)}>
                      <Valor v={d.saidas} traco />
                    </button>
                  </td>
                  <td className="col-larga">
                    <button onClick={() => verDia(d.dia)}>
                      <Valor v={d.diarios} traco previsto={d.diarioPrevisto} />
                    </button>
                  </td>
                  <td className="col-larga">
                    <button onClick={() => verDia(d.dia)}>
                      <Valor v={d.cartao} traco />
                    </button>
                  </td>
                  <td className="col-larga">
                    <button onClick={() => verDia(d.dia)}>
                      <Valor v={d.economias} traco />
                    </button>
                  </td>
                  <td className="saldo">
                    <button onClick={() => verDia(d.dia)}>
                      <Valor v={d.saldo} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td>
                <span className="meta">Total</span>
              </td>
              <td>
                <span>
                  <Valor v={t.entradas} />
                </span>
              </td>
              <td className="col-estreita">
                <span>
                  <Valor v={t.custoDeVidaPrevisto + t.economias} />
                </span>
              </td>
              <td className="col-larga">
                <span>
                  <Valor v={t.saidas} />
                </span>
              </td>
              <td className="col-larga">
                <span>
                  <Valor v={t.custoDeVidaPrevisto - t.saidas - t.cartao} />
                </span>
              </td>
              <td className="col-larga">
                <span>
                  <Valor v={t.cartao} />
                </span>
              </td>
              <td className="col-larga">
                <span>
                  <Valor v={t.economias} />
                </span>
              </td>
              <td>
                <span>
                  <Valor v={t.saldoFinal} />
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
        <p className="meta suave" style={{ marginTop: 14 }}>
          <span className="previsto">Itálico</span> = previsão do gasto diário, até você lançar o gasto real do dia.
        </p>
      </section>
    </>
  );
}
