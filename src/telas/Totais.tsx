import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Valor } from '../componentes/Valor';
import { diferencaDias, nomeMes, partes } from '../lib/datas';
import { useGrana } from '../lib/estado';
import { porcentagem } from '../lib/formato';
import { primeiroDia, totaisAno } from '../lib/motor';

export function Totais() {
  const { dados, hoje } = useGrana();
  const navegar = useNavigate();
  const { ano: param } = useParams();
  const ano = param && /^\d{4}$/.test(param) ? Number(param) : partes(hoje)[0];
  const [comPrevisao, setComPrevisao] = useState(true);

  const meses = useMemo(() => totaisAno(dados, ano, hoje), [dados, ano, hoje]);
  const linhas = meses.map((t) => ({
    ...t,
    custo: comPrevisao ? t.custoDeVidaPrevisto : t.custoDeVida,
    sob: comPrevisao ? t.sobraPrevista : t.sobra,
  }));
  const soma = (k: 'entradas' | 'custo' | 'sob' | 'economias' | 'diarios') => linhas.reduce((s, l) => s + l[k], 0);
  const entradas = soma('entradas');
  // Dias com histórico no ano: do primeiro lançamento (ou 1º de janeiro) até hoje.
  const primeiro = primeiroDia(dados);
  const deAno = primeiro && primeiro > `${ano}-01-01` ? primeiro : `${ano}-01-01`;
  const ateAno = hoje < `${ano}-12-31` ? hoje : `${ano}-12-31`;
  const decorridos = Math.max(0, diferencaDias(deAno, ateAno) + 1);
  const maiorAbs = Math.max(1, ...linhas.map((l) => Math.abs(l.sob)));

  return (
    <>
      <section className="hero">
        <div className="linha-topo">
          <span className="meta">Totais do ano</span>
          <div className="setas">
            <button className="seta" onClick={() => navegar(`/totais/${ano - 1}`)} aria-label="Ano anterior">
              ←
            </button>
            <button className="seta" onClick={() => navegar(`/totais/${ano + 1}`)} aria-label="Próximo ano">
              →
            </button>
          </div>
        </div>
        <h1 className="gigante">{ano}</h1>
      </section>

      <section className="secao">
        <div className="cabeca-secao">
          <div className="chips">
            <button className="botao" aria-pressed={comPrevisao} onClick={() => setComPrevisao(true)}>
              Com previsão
            </button>
            <button className="botao" aria-pressed={!comPrevisao} onClick={() => setComPrevisao(false)}>
              Só o lançado
            </button>
          </div>
        </div>
        <div className="grade-meta">
          <div>
            <span className="meta">Entradas</span>
            <span className="meta-num">
              <Valor v={entradas} />
            </span>
          </div>
          <div>
            <span className="meta">Custo de vida</span>
            <span className="meta-num">
              <Valor v={soma('custo')} />
            </span>
          </div>
          <div>
            <span className="meta">Sobra</span>
            <span className="meta-num">
              <Valor v={soma('sob')} />
            </span>
          </div>
          <div>
            <span className="meta">Guardado</span>
            <span className="meta-num">{porcentagem(entradas > 0 ? soma('economias') / entradas : 0)}</span>
            <span className="meta suave">das entradas</span>
          </div>
          <div>
            <span className="meta">Diário médio</span>
            <span className="meta-num">
              <Valor v={decorridos ? soma('diarios') / decorridos : 0} />
            </span>
            <span className="meta suave">por dia, no que já passou</span>
          </div>
        </div>
      </section>

      <section className="secao" style={{ overflowX: 'auto' }}>
        <table className="livro">
          <thead>
            <tr>
              <th>Mês</th>
              <th>Entradas</th>
              <th>Custo</th>
              <th>Sobra</th>
              <th className="col-larga" style={{ width: '22%' }} />
              <th className="col-larga">Guardado</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l, i) => (
              <tr key={l.mes} className={l.mes.slice(0, 7) === hoje.slice(0, 7) ? 'hoje' : ''}>
                <td>
                  <Link to={`/mes/${l.mes.slice(0, 7)}`} style={{ display: 'block', padding: '9px 0' }}>
                    <b>{nomeMes(i).slice(0, 3)}</b>
                  </Link>
                </td>
                <td>
                  <span>
                    <Valor v={l.entradas} traco />
                  </span>
                </td>
                <td>
                  <span>
                    <Valor v={l.custo} traco previsto={comPrevisao && l.custo !== l.custoDeVida} />
                  </span>
                </td>
                <td>
                  <span>
                    <Valor v={l.sob} traco />
                  </span>
                </td>
                <td className="col-larga">
                  <span>
                    <span className={`barra-mes ${l.sob < 0 ? 'neg' : ''}`} style={{ display: 'block' }}>
                      <i style={{ width: `${(Math.abs(l.sob) / maiorAbs) * 100}%` }} />
                    </span>
                  </span>
                </td>
                <td className="col-larga">
                  <span>{l.entradas > 0 ? porcentagem(l.economizado) : '—'}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="meta suave" style={{ marginTop: 14 }}>
          Custo de vida = saídas + diários + cartão. Sobra = entradas − custo de vida. Economias não contam como custo.
        </p>
      </section>
    </>
  );
}
