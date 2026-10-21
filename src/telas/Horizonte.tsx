import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { BarraTitulo } from '../componentes/BarraTitulo';
import { nomeTipo, useFolhas } from '../componentes/Folhas';
import { Grafico } from '../componentes/Grafico';
import { TipoIcone } from '../componentes/Icones';
import { Valor } from '../componentes/Valor';
import { diaDaSemana, fimDoMes, nomeMes, partes, rotuloDia, somarDias } from '../lib/datas';
import { useGrana } from '../lib/estado';
import { moeda } from '../lib/formato';
import { horizonte, movimentos, previsaoDiaria, totalPrevisaoMensal } from '../lib/motor';
import type { Movimento } from '../lib/tipos';

export function Horizonte() {
  const { dados, hoje, marcarCheckin } = useGrana();
  const { verDia, editarMov, lancar } = useFolhas();

  const h = useMemo(() => horizonte(dados, hoje, 12), [dados, hoje]);
  const proximos = useMemo(() => movimentos(dados, somarDias(hoje, 1), somarDias(hoje, 14)), [dados, hoje]);
  const deHoje = useMemo(() => movimentos(dados, hoje, hoje), [dados, hoje]);

  const saldoHoje = h.dias[0]?.saldo ?? 0;
  const fimMes = h.dias.find((d) => d.dia === fimDoMes(hoje));
  const conferido = dados.checkins.includes(hoje);
  const vazio = dados.lancamentos.length === 0 && dados.recorrencias.length === 0;

  const porDia = new Map<string, Movimento[]>();
  for (const mv of proximos) porDia.set(mv.data, [...(porDia.get(mv.data) ?? []), mv]);

  const linha = (mv: Movimento) => (
    <li key={mv.chave}>
      <button className="item" onClick={() => editarMov(mv)}>
        <TipoIcone tipo={mv.tipo} />
        <span className="item-desc">
          {mv.descricao || nomeTipo(mv.tipo)}
          <span className="meta">
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
  );

  return (
    <>
      <BarraTitulo titulo="horizonte">
        <button className="botao" aria-pressed={conferido} onClick={() => marcarCheckin(hoje, !conferido)}>
          {conferido ? 'dia conferido ✓' : 'conferi o dia'}
        </button>
      </BarraTitulo>

      <section className="hero">
        <span className="meta">
          saldo hoje · {diaDaSemana(hoje)}, {rotuloDia(hoje)}
        </span>
        <h2 className="gigante">
          <Valor v={saldoHoje} cifrao />
        </h2>
      </section>

      {vazio ? (
        <section className="secao painel">
          <p className="subtitulo" style={{ marginBottom: 14 }}>
            Comece lançando quanto você tem hoje como uma entrada.
          </p>
          <div className="acoes" style={{ maxWidth: 520 }}>
            <button className="botao cheio" onClick={() => lancar(hoje, 'entrada')}>
              lançar saldo de hoje
            </button>
            <Link className="botao" to="/ajustes#dados">
              importar meus dados
            </Link>
          </div>
        </section>
      ) : (
        <>
          <div className="grade-meta">
            <div>
              <span className="meta">fim de {nomeMes(partes(hoje)[1])}</span>
              <span className="meta-num">
                <Valor v={fimMes?.saldo ?? saldoHoje} />
              </span>
            </div>
            <div>
              <span className="meta">menor saldo em 12 meses</span>
              <span className="meta-num">
                <Valor v={h.menor?.saldo ?? 0} />
              </span>
              <span className="meta">{h.menor ? rotuloDia(h.menor.dia) : ''}</span>
            </div>
            <div>
              <span className="meta">daqui a 12 meses</span>
              <span className="meta-num">
                <Valor v={h.final?.saldo ?? 0} />
              </span>
            </div>
            <div>
              <span className="meta">previsão diária</span>
              <span className="meta-num">{moeda(previsaoDiaria(dados))}</span>
              <Link to="/ajustes#previsao" className="meta">
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
                ver dia
              </button>
            </div>
          )}

          <section className="secao">
            <div className="painel">
              <div className="cabeca-secao">
                <h2 className="subtitulo">próximos 12 meses</h2>
                <span className="meta">toque para ler</span>
              </div>
              <Grafico dias={h.dias} />
            </div>
          </section>

          <section className="secao" style={{ paddingTop: 0 }}>
            <div className="cabeca-secao">
              <h2 className="subtitulo">hoje</h2>
              <button className="botao-texto" onClick={() => lancar(hoje, 'diario')}>
                + gasto do dia
              </button>
            </div>
            {deHoje.length > 0 ? <ul className="lista">{deHoje.map(linha)}</ul> : <p className="vazio meta painel">Nada lançado hoje ainda.</p>}
          </section>

          <section className="secao" style={{ paddingTop: 0 }}>
            <div className="cabeca-secao">
              <h2 className="subtitulo">próximos dias</h2>
              <Link className="botao-texto" to="/">
                ver saldos
              </Link>
            </div>
            {[...porDia.entries()].map(([d, lista]) => (
              <div className="grupo-dia" key={d}>
                <button className="meta" onClick={() => verDia(d)}>
                  {diaDaSemana(d)} · {rotuloDia(d)}
                </button>
                <ul className="lista">{lista.map(linha)}</ul>
              </div>
            ))}
            {porDia.size === 0 && <p className="vazio meta painel">Nada previsto nas próximas duas semanas além do diário.</p>}
          </section>
        </>
      )}
    </>
  );
}
