import { useMemo, useState } from 'react';
import { BarraTitulo } from '../componentes/BarraTitulo';
import { TipoIcone } from '../componentes/Icones';
import { Valor } from '../componentes/Valor';
import { diferencaDias, inicioDoMes, nomeMes, partes, rotuloMesCurto, somarMeses } from '../lib/datas';
import { useGrana } from '../lib/estado';
import { moeda, porcentagem } from '../lib/formato';
import { primeiroDia, totaisAno, totaisMes } from '../lib/motor';

export function Totais() {
  const { dados, hoje } = useGrana();
  const [mes, setMes] = useState(() => inicioDoMes(hoje));
  const [ano, setAno] = useState(() => partes(hoje)[0]);
  const [comPrevisao, setComPrevisao] = useState(true);

  const t = useMemo(() => totaisMes(dados, mes, hoje), [dados, mes, hoje]);
  const meses = useMemo(() => totaisAno(dados, ano, hoje), [dados, ano, hoje]);

  const linhas = meses.map((m) => ({
    ...m,
    custo: comPrevisao ? m.custoDeVidaPrevisto : m.custoDeVida,
    sob: comPrevisao ? m.sobraPrevista : m.sobra,
  }));
  const soma = (k: 'entradas' | 'custo' | 'sob' | 'economias' | 'diarios') => linhas.reduce((s, l) => s + l[k], 0);
  const entradasAno = soma('entradas');
  // Dias com histórico no ano: do primeiro lançamento (ou 1º de janeiro) até hoje.
  const primeiro = primeiroDia(dados);
  const deAno = primeiro && primeiro > `${ano}-01-01` ? primeiro : `${ano}-01-01`;
  const ateAno = hoje < `${ano}-12-31` ? hoje : `${ano}-12-31`;
  const decorridos = Math.max(0, diferencaDias(deAno, ateAno) + 1);
  const maiorAbs = Math.max(1, ...linhas.map((l) => Math.abs(l.sob)));
  const temPrevisao = t.custoDeVidaPrevisto !== t.custoDeVida;

  return (
    <>
      <BarraTitulo titulo="totais">
        <div className="seletor-periodo">
          <button className="seta" onClick={() => setMes(somarMeses(mes, -1))} aria-label="Mês anterior">
            ‹
          </button>
          <button className="periodo" onClick={() => setMes(inicioDoMes(hoje))} title="Voltar para este mês">
            {rotuloMesCurto(mes)}
          </button>
          <button className="seta" onClick={() => setMes(somarMeses(mes, 1))} aria-label="Próximo mês">
            ›
          </button>
        </div>
      </BarraTitulo>

      <p className="meta" style={{ margin: '0 0 10px' }}>
        cálculos de {nomeMes(partes(mes)[1])}
        {temPrevisao ? ', já contando a previsão do diário nos dias que faltam' : ''}
      </p>

      <div className="cartoes">
        <article className="cartao-total">
          <h3>sobra</h3>
          <div className="formula">
            <TipoIcone tipo="entrada" /> − <TipoIcone tipo="saida" /> − <TipoIcone tipo="diario" /> − <TipoIcone tipo="cartao" />
          </div>
          <span className="grande">
            <Valor v={t.sobraPrevista} cifrao />
          </span>
          <span className="meta">{t.sobraPrevista >= 0 ? 'sobrou dinheiro' : 'faltou dinheiro'}</span>
        </article>

        <article className="cartao-total">
          <h3>guardado</h3>
          <div className="formula">
            <TipoIcone tipo="economia" /> ÷ <TipoIcone tipo="entrada" />
          </div>
          <div className="progresso" role="img" aria-label={`${porcentagem(t.economizado)} das entradas`}>
            <i style={{ width: `${Math.min(100, t.economizado * 100)}%` }} />
          </div>
          <span className="grande">{porcentagem(t.economizado)}</span>
          <span className="meta">{t.economias > 0 ? `${moeda(t.economias)} guardados` : 'nada guardado'}</span>
        </article>

        <article className="cartao-total">
          <h3>custo de vida</h3>
          <div className="formula">
            <TipoIcone tipo="saida" /> + <TipoIcone tipo="diario" /> + <TipoIcone tipo="cartao" />
          </div>
          <span className="grande">
            <Valor v={t.custoDeVidaPrevisto} cifrao />
          </span>
          <span className="meta">{t.custoDeVidaPrevisto <= t.entradas ? 'dentro da renda' : 'acima da renda'}</span>
        </article>

        <article className="cartao-total">
          <h3>diário médio</h3>
          <div className="formula">
            <TipoIcone tipo="diario" /> ÷ {t.diasDecorridos || '—'} {t.diasDecorridos === 1 ? 'dia' : 'dias'}
          </div>
          <span className="grande">
            <Valor v={t.diarioMedio} cifrao />
          </span>
          <span className="meta">previsão {moeda(t.previsaoDiaria)} por dia</span>
        </article>
      </div>

      <section className="secao">
        <div className="cabeca-secao">
          <div className="seletor-periodo">
            <button className="seta" onClick={() => setAno(ano - 1)} aria-label="Ano anterior">
              ‹
            </button>
            <h2 className="subtitulo">{ano}</h2>
            <button className="seta" onClick={() => setAno(ano + 1)} aria-label="Próximo ano">
              ›
            </button>
          </div>
          <div className="chips">
            <button className="botao" aria-pressed={comPrevisao} onClick={() => setComPrevisao(true)}>
              com previsão
            </button>
            <button className="botao" aria-pressed={!comPrevisao} onClick={() => setComPrevisao(false)}>
              só o lançado
            </button>
          </div>
        </div>

        <div className="grade-meta" style={{ marginBottom: 14 }}>
          <div>
            <span className="meta">entradas</span>
            <span className="meta-num">
              <Valor v={entradasAno} />
            </span>
          </div>
          <div>
            <span className="meta">custo de vida</span>
            <span className="meta-num">
              <Valor v={soma('custo')} />
            </span>
          </div>
          <div>
            <span className="meta">sobra</span>
            <span className="meta-num">
              <Valor v={soma('sob')} />
            </span>
          </div>
          <div>
            <span className="meta">diário médio</span>
            <span className="meta-num">
              <Valor v={decorridos ? soma('diarios') / decorridos : 0} />
            </span>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table className="livro">
            <thead>
              <tr>
                <th>mês</th>
                <th>entradas</th>
                <th>custo de vida</th>
                <th>sobra</th>
                <th className="col-larga" style={{ width: '22%' }} />
                <th className="col-larga">guardado</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l, i) => (
                <tr key={l.mes} className={l.mes.slice(0, 7) === hoje.slice(0, 7) ? 'hoje' : ''}>
                  <td>
                    <button className="botao-texto" style={{ color: 'inherit' }} onClick={() => setMes(l.mes)}>
                      {nomeMes(i)}
                    </button>
                  </td>
                  <td>
                    <Valor v={l.entradas} traco />
                  </td>
                  <td>
                    <Valor v={l.custo} traco previsto={comPrevisao && l.custo !== l.custoDeVida} />
                  </td>
                  <td>
                    <Valor v={l.sob} traco />
                  </td>
                  <td className="col-larga">
                    <span className={`barra-mes ${l.sob < 0 ? 'neg' : ''}`} style={{ display: 'block' }}>
                      <i style={{ width: `${(Math.abs(l.sob) / maiorAbs) * 100}%` }} />
                    </span>
                  </td>
                  <td className="col-larga">{l.entradas > 0 ? porcentagem(l.economizado) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="meta" style={{ marginTop: 12 }}>
          Custo de vida = saídas + diário + cartão. Sobra = entradas − custo de vida. Economias não contam como custo.
        </p>
      </section>
    </>
  );
}
