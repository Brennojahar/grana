import { useMemo, useState } from 'react';
import { BarraTitulo, mesCurto } from '../componentes/BarraTitulo';
import { useFolhas } from '../componentes/Folhas';
import { IconeChevronBaixo, IconeChevronDir, IconeChevronEsq, IconeFiltro, TipoIcone } from '../componentes/Icones';
import { diaDaSemana, fimDoMes, inicioDoMes, rotuloDia, somarMeses } from '../lib/datas';
import { useGrana } from '../lib/estado';
import { moeda } from '../lib/formato';
import { movimentos } from '../lib/motor';
import { rotulo, TIPOS } from '../lib/rotulos';
import type { Movimento, Tipo } from '../lib/tipos';

/** Todas as movimentações de um mês, agrupadas por dia, com filtro por tipo. */
export function Movimentacoes() {
  const { dados, hoje } = useGrana();
  const { editarMov } = useFolhas();
  const params = new URLSearchParams(location.search);
  const [mes, setMes] = useState(() => {
    const m = params.get('mes');
    return m && /^\d{4}-\d{2}$/.test(m) ? `${m}-01` : inicioDoMes(hoje);
  });
  const [filtro, setFiltro] = useState<Tipo | null>(() => (params.get('tipo') as Tipo | null) || null);

  const lista = useMemo(() => {
    const todos = movimentos(dados, mes, fimDoMes(mes));
    return filtro ? todos.filter((m) => m.tipo === filtro) : todos;
  }, [dados, mes, filtro]);

  const porDia = new Map<string, Movimento[]>();
  for (const m of lista) porDia.set(m.data, [...(porDia.get(m.data) ?? []), m]);
  const total = lista.reduce((s, m) => s + m.valor, 0);

  return (
    <>
      <BarraTitulo
        titulo="movimentações"
        voltar="/totais"
        centro={
          <div className="seletor">
            <button className="seta" onClick={() => setMes(somarMeses(mes, -1))} aria-label="Mês anterior">
              <IconeChevronEsq />
            </button>
            <span className="mes-atual" style={{ fontSize: 16 }}>
              {mesCurto(mes)}
            </span>
            <button className="seta" onClick={() => setMes(somarMeses(mes, 1))} aria-label="Próximo mês">
              <IconeChevronDir />
            </button>
          </div>
        }
      />
      <div className="pagina estreita">
        <label className="filtro-gaveta" style={{ margin: '0 0 16px' }}>
          <IconeFiltro />
          {filtro ? <TipoIcone tipo={filtro} /> : null}
          <span style={{ flex: 1 }}>{filtro ? rotulo(filtro).plural : 'todas as movimentações'}</span>
          <IconeChevronBaixo />
          <select value={filtro ?? ''} onChange={(e) => setFiltro((e.target.value || null) as Tipo | null)} aria-label="Filtrar por tipo">
            <option value="">todas as movimentações</option>
            {TIPOS.map((t) => (
              <option key={t.tipo} value={t.tipo}>
                {t.plural}
              </option>
            ))}
          </select>
        </label>

        {[...porDia.entries()].map(([d, movs]) => (
          <div key={d} style={{ marginBottom: 16 }}>
            <div className="rotulo" style={{ margin: '0 0 6px' }}>
              {diaDaSemana(d)}, {rotuloDia(d)}
            </div>
            <div className="caixa">
              {movs.map((mv) => (
                <button key={mv.chave} className="linha-caixa" onClick={() => editarMov(mv)}>
                  <TipoIcone tipo={mv.tipo} tamanho={20} />
                  <span className="desc">
                    <span className="forte">{mv.descricao || rotulo(mv.tipo).nome}</span>
                    <small>
                      {rotulo(mv.tipo).nome}
                      {mv.recorrencia_id ? ` · repete${mv.total ? ` · ${mv.posicao}/${mv.total}` : ''}` : ''}
                    </small>
                  </span>
                  <span className="fim">{moeda(mv.valor)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}

        {lista.length === 0 ? (
          <p className="meta" style={{ textAlign: 'center', padding: '40px 0' }}>
            nada {filtro ? `de ${rotulo(filtro).plural} ` : ''}neste mês.
          </p>
        ) : (
          filtro && (
            <div className="linha-caixa" style={{ borderTop: '1px solid var(--linha)', borderBottom: 0 }}>
              <span className="forte">total</span>
              <span className="fim forte">{moeda(total)}</span>
            </div>
          )
        )}
      </div>
    </>
  );
}
