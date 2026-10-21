import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { BarraTitulo, mesCurto } from '../componentes/BarraTitulo';
import { useFolhas } from '../componentes/Folhas';
import { IconeBusca, IconeChevronDir, IconeChevronEsq, IconeLapis, IconeMais, TipoIcone } from '../componentes/Icones';
import { ChipsTags, ChipTag, ModalTag } from '../componentes/Tags';
import { diaDaSemana, fimDoMes, inicioDoMes, rotuloDia, somarMeses } from '../lib/datas';
import { useGrana } from '../lib/estado';
import { moeda } from '../lib/formato';
import { totaisPorTag } from '../lib/motor';
import { CONTAS_TAG, rotulo, TIPOS } from '../lib/rotulos';
import type { Dia, Movimento, Tag } from '../lib/tipos';

function SeletorMes({ mes, setMes }: { mes: Dia; setMes(m: Dia): void }) {
  return (
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
  );
}

function mesDaUrl(padrao: Dia): Dia {
  const m = new URLSearchParams(location.search).get('mes');
  return m && /^\d{4}-\d{2}$/.test(m) ? `${m}-01` : padrao;
}

/** Os cálculos de que a tag fica de fora, para avisar na lista. */
function foraDe(t: Tag): string[] {
  return CONTAS_TAG.filter((c) => !t[c.conta]).map((c) => c.nome);
}

export function Tags() {
  const { dados, hoje } = useGrana();
  const [mes, setMes] = useState(() => mesDaUrl(inicioDoMes(hoje)));
  const [busca, setBusca] = useState('');
  const [criando, setCriando] = useState(false);

  const totais = useMemo(() => totaisPorTag(dados, mes, fimDoMes(mes)), [dados, mes]);
  const termo = busca.trim().toLowerCase();
  const lista = [...dados.tags].sort((a, b) => a.nome.localeCompare(b.nome)).filter((t) => !termo || t.nome.toLowerCase().includes(termo));

  return (
    <>
      <BarraTitulo
        titulo="tags"
        centro={<SeletorMes mes={mes} setMes={setMes} />}
        direita={
          <button className="icone-botao" onClick={() => setCriando(true)} aria-label="Nova tag">
            <IconeMais />
          </button>
        }
      />
      <div className="pagina estreita">
        {dados.tags.length > 0 && (
          <label className="busca">
            <IconeBusca />
            <input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="filtrar tags" aria-label="Filtrar tags" />
          </label>
        )}

        {dados.tags.length === 0 ? (
          <div className="vazio-tags">
            <button onClick={() => setCriando(true)} aria-label="Criar tag">
              <IconeMais />
            </button>
            nenhuma tag ainda.
            <br />
            toque no + para criar a primeira.
          </div>
        ) : lista.length === 0 ? (
          <p className="meta" style={{ textAlign: 'center', padding: '40px 0' }}>
            nenhuma tag encontrada.
          </p>
        ) : (
          <div className="caixa">
            {lista.map((t) => {
              const tt = totais.get(t.id)!;
              const fora = foraDe(t);
              return (
                <Link key={t.id} className="linha-caixa" to={`/tags/${t.id}?mes=${mes.slice(0, 7)}`}>
                  <span className="desc">
                    <ChipTag tag={t} />
                    <small>
                      {tt.movimentos.length === 0 ? 'nada neste mês' : `${tt.movimentos.length} ${tt.movimentos.length === 1 ? 'movimentação' : 'movimentações'}`}
                      {fora.length ? ` · fora de ${fora.join(', ')}` : ''}
                    </small>
                  </span>
                  <span className="fim" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                    <span className="forte">{moeda(tt.gastos)}</span>
                    {tt.entradas > 0 && <small className="meta">+ {moeda(tt.entradas)}</small>}
                  </span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
      {criando && <ModalTag tag={null} onFechar={() => setCriando(false)} />}
    </>
  );
}

export function TagDetalhe() {
  const { dados, hoje } = useGrana();
  const { editarMov, abrirAdicionar } = useFolhas();
  const { id } = useParams();
  const [mes, setMes] = useState(() => mesDaUrl(inicioDoMes(hoje)));
  const [editando, setEditando] = useState(false);
  const tag = dados.tags.find((t) => t.id === id);
  const totais = useMemo(() => totaisPorTag(dados, mes, fimDoMes(mes)), [dados, mes]);

  if (!tag) {
    return (
      <>
        <BarraTitulo titulo="tag" voltar="/tags" />
        <p className="meta" style={{ textAlign: 'center', padding: '60px 16px' }}>
          essa tag não existe mais.
        </p>
      </>
    );
  }

  const tt = totais.get(tag.id)!;
  const porDia = new Map<string, Movimento[]>();
  for (const m of tt.movimentos) porDia.set(m.data, [...(porDia.get(m.data) ?? []), m]);
  const fora = foraDe(tag);

  return (
    <>
      <BarraTitulo
        titulo={tag.nome}
        voltar={`/tags?mes=${mes.slice(0, 7)}`}
        centro={<SeletorMes mes={mes} setMes={setMes} />}
        direita={
          <button className="icone-botao" onClick={() => setEditando(true)} aria-label="Editar tag">
            <IconeLapis />
          </button>
        }
      />
      <div className="pagina estreita">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 16 }}>
          <ChipTag tag={tag} />
          <button className="botao" onClick={(e) => abrirAdicionar(e.currentTarget, mes.slice(0, 7) === hoje.slice(0, 7) ? hoje : mes, [tag.id])}>
            <IconeMais /> adicionar com esta tag
          </button>
        </div>
        {fora.length > 0 && <p className="meta" style={{ margin: '0 0 14px' }}>esta tag fica fora de: {fora.join(', ')}.</p>}

        <div className="rotulo">movimentações da tag em {mesCurto(mes)}</div>
        <div className="caixa">
          {TIPOS.map((tp) => {
            const v = { entrada: tt.entradas, saida: tt.saidas, diario: tt.diarios, economia: tt.economias, cartao: tt.cartao }[tp.tipo];
            return (
              <div className="linha-caixa" key={tp.tipo}>
                <TipoIcone tipo={tp.tipo} tamanho={20} />
                <span className="forte">{tp.tipo === 'cartao' ? 'gastos com cartão' : tp.plural}</span>
                <span className="fim">{moeda(v)}</span>
              </div>
            );
          })}
        </div>

        <div className="rotulo" style={{ marginTop: 26 }}>
          lançamentos
        </div>
        {[...porDia.entries()].map(([d, movs]) => (
          <div key={d} style={{ marginBottom: 14 }}>
            <div className="meta" style={{ margin: '0 0 6px' }}>
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
                      {mv.recorrencia_id ? ' · repete' : ''}
                    </small>
                    {mv.tag_ids.length > 1 && <ChipsTags ids={mv.tag_ids.filter((x) => x !== tag.id)} pequeno />}
                  </span>
                  <span className="fim">{moeda(mv.valor)}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
        {porDia.size === 0 && (
          <p className="meta" style={{ textAlign: 'center', padding: '30px 0' }}>
            nenhuma movimentação com esta tag em {mesCurto(mes)}.
          </p>
        )}
      </div>
      {editando && <ModalTag tag={tag} onFechar={() => setEditando(false)} />}
    </>
  );
}
