import { useEffect, useRef, useState } from 'react';
import { partes } from '../lib/datas';
import { useGrana } from '../lib/estado';
import { lerValor, moeda, valorParaCampo } from '../lib/formato';
import { apagar, criar, editar, type Escopo } from '../lib/operacoes';
import { COR_TIPO, rotulo, TIPOS } from '../lib/rotulos';
import type { Dia, Frequencia, Movimento, Tipo } from '../lib/tipos';
import {
  IconeCalendario,
  IconeCartao,
  IconeChevronBaixo,
  IconeDinheiro,
  IconeFechar,
  IconeLapis,
  IconeMais,
  IconeRepetir,
  IconeTags,
  TipoIcone,
} from './Icones';
import { ChipsTags, ChipTag, ModalTag } from './Tags';

const FREQUENCIAS: { f: Frequencia | ''; nome: string }[] = [
  { f: '', nome: 'não repete' },
  { f: 'diaria', nome: 'todo dia' },
  { f: 'semanal', nome: 'toda semana' },
  { f: 'mensal', nome: 'todo mês' },
  { f: 'anual', nome: 'todo ano' },
];

const ESCOPOS: { e: Escopo; nome: string }[] = [
  { e: 'esta', nome: 'só esta' },
  { e: 'seguintes', nome: 'esta e as próximas' },
  { e: 'todas', nome: 'todas' },
];

type Props = { onFechar(): void } & ({ novo: { data: Dia; tipo?: Tipo; tagIds?: string[] } } | { mov: Movimento });

function dataCurta(d: Dia): string {
  const [y, m, dd] = partes(d);
  return `${String(dd).padStart(2, '0')}/${String(m + 1).padStart(2, '0')}/${String(y).slice(2)}`;
}

/** Janela "adicionar"/"editar": uma linha por campo, cada uma com seu ícone. */
export function FormLancamento(props: Props) {
  const { dados, mudar } = useGrana();
  const mov = 'mov' in props ? props.mov : null;
  const recorrente = !!mov?.recorrencia_id;
  const fechar = useRef(props.onFechar);
  fechar.current = props.onFechar;

  const [tipo, setTipo] = useState<Tipo>(mov?.tipo ?? ('novo' in props ? props.novo.tipo : undefined) ?? 'saida');
  const [valor, setValor] = useState(mov ? valorParaCampo(mov.valor) : '');
  const [descricao, setDescricao] = useState(mov?.descricao ?? '');
  const [data, setData] = useState<Dia>(mov?.data ?? ('novo' in props ? props.novo.data : ''));
  const [cartao, setCartao] = useState<string>(mov?.cartao_id ?? dados.cartoes[0]?.id ?? '');
  const [freq, setFreq] = useState<Frequencia | ''>('');
  const [vezes, setVezes] = useState('');
  const [semFim, setSemFim] = useState(true);
  const [dividir, setDividir] = useState(false);
  const [escopo, setEscopo] = useState<Escopo>('esta');
  const [tagIds, setTagIds] = useState<string[]>(mov?.tag_ids ?? ('novo' in props ? props.novo.tagIds : undefined) ?? []);
  const [tagsAbertas, setTagsAbertas] = useState(false);
  const [criandoTag, setCriandoTag] = useState(false);
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const [erro, setErro] = useState('');
  const campoValor = useRef<HTMLInputElement>(null);

  useEffect(() => {
    campoValor.current?.focus({ preventScroll: true });
    const corpo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Com a janela de nova tag aberta por cima, o Esc fecha só ela.
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && document.querySelectorAll('.fundo-modal').length === 1 && fechar.current();
    window.addEventListener('keydown', tecla);
    return () => {
      document.body.style.overflow = corpo;
      window.removeEventListener('keydown', tecla);
    };
  }, []);

  const numeroValor = lerValor(valor);
  const nVezes = semFim ? null : Math.max(2, Math.min(999, parseInt(vezes, 10) || 0));
  const r = rotulo(tipo);

  function salvar() {
    if (!Number.isFinite(numeroValor) || numeroValor < 0) return setErro('Digite um valor.');
    if (!data) return setErro('Escolha a data.');
    if (freq && !semFim && !(parseInt(vezes, 10) >= 2)) return setErro('Quantas vezes? Pelo menos 2.');
    const campos = {
      data,
      tipo,
      valor: numeroValor,
      descricao: descricao.trim(),
      cartao_id: tipo === 'cartao' ? cartao || null : null,
      tag_ids: tagIds.filter((id) => dados.tags.some((t) => t.id === id)),
    };
    const m = mov ? editar(dados, mov, campos, escopo) : criar(campos, freq ? { frequencia: freq, vezes: nVezes, dividir: dividir && !!nVezes } : null);
    mudar(m);
    props.onFechar();
  }

  function remover() {
    if (!mov) return;
    mudar(apagar(dados, mov, escopo));
    props.onFechar();
  }

  return (
    <div className="fundo-modal" onMouseDown={(e) => e.target === e.currentTarget && props.onFechar()}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={mov ? 'Editar movimentação' : 'Adicionar movimentação'}
        onSubmit={(e) => {
          e.preventDefault();
          salvar();
        }}
      >
        <div className="cabeca-modal">
          <h2>{mov ? 'editar' : 'adicionar'}</h2>
          <button type="button" className="icone-botao" onClick={props.onFechar} aria-label="Fechar">
            <IconeFechar />
          </button>
        </div>

        <div className="corpo-modal">
          <label className="linha-form">
            <IconeDinheiro />
            <span>R$</span>
            <input ref={campoValor} inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} autoComplete="off" aria-label="Valor" />
          </label>

          <label className="linha-form">
            <TipoIcone tipo={tipo} tamanho={20} />
            <span>{r.nome}</span>
            <span className="direita" />
            <IconeChevronBaixo />
            <select className="cobre" value={tipo} onChange={(e) => setTipo(e.target.value as Tipo)} aria-label="Tipo">
              {TIPOS.map((t) => (
                <option key={t.tipo} value={t.tipo}>
                  {t.menu}
                </option>
              ))}
            </select>
          </label>

          <label className="linha-form">
            <IconeLapis />
            <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder={r.nome} maxLength={80} aria-label="Descrição" />
          </label>

          <label className="linha-form">
            <IconeCalendario />
            <span>data</span>
            <span className="direita">{data ? dataCurta(data) : '—'}</span>
            <IconeChevronBaixo />
            <input
              type="date"
              value={data}
              onChange={(e) => setData(e.target.value)}
              required
              aria-label="Data"
              style={{ position: 'absolute', inset: 0, opacity: 0, height: '100%', cursor: 'pointer' }}
            />
          </label>

          {tipo === 'cartao' && (
            <label className="linha-form">
              <IconeCartao />
              <span>{dados.cartoes.find((c) => c.id === cartao)?.nome ?? 'sem cartão'}</span>
              <span className="direita" />
              <IconeChevronBaixo />
              <select className="cobre" value={cartao} onChange={(e) => setCartao(e.target.value)} aria-label="Cartão">
                <option value="">sem cartão</option>
                {dados.cartoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
          )}

          {!mov && (
            <label className="linha-form">
              <IconeRepetir />
              <span>{FREQUENCIAS.find((f) => f.f === freq)!.nome}</span>
              <span className="direita" />
              <IconeChevronBaixo />
              <select className="cobre" value={freq} onChange={(e) => setFreq(e.target.value as Frequencia | '')} aria-label="Repetir">
                {FREQUENCIAS.map((f) => (
                  <option key={f.f} value={f.f}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </label>
          )}

          <button type="button" className="linha-form" style={{ width: '100%', textAlign: 'left' }} onClick={() => setTagsAbertas((v) => !v)} aria-expanded={tagsAbertas}>
            <IconeTags />
            {tagIds.length ? <ChipsTags ids={tagIds} pequeno /> : <span>tags</span>}
            <span className="direita" />
            <span style={{ transform: tagsAbertas ? 'rotate(180deg)' : undefined, transition: 'transform 160ms', display: 'grid' }}>
              <IconeChevronBaixo />
            </span>
          </button>
          {tagsAbertas && (
            <div className="lista-tags-form">
              {dados.tags.map((t) => (
                <label key={t.id} className="marcador" style={{ borderBottom: 0 }}>
                  <input
                    type="checkbox"
                    checked={tagIds.includes(t.id)}
                    onChange={(e) => setTagIds((ids) => (e.target.checked ? [...ids, t.id] : ids.filter((x) => x !== t.id)))}
                  />
                  <ChipTag tag={t} />
                </label>
              ))}
              {dados.tags.length === 0 && <p className="meta" style={{ margin: '6px 0' }}>nenhuma tag ainda.</p>}
              <button type="button" className="botao-texto" style={{ display: 'flex', alignItems: 'center', gap: 6, minHeight: 40 }} onClick={() => setCriandoTag(true)}>
                <IconeMais /> nova tag
              </button>
            </div>
          )}

          {freq && !mov && (
            <>
              <label className="marcador">
                <input type="checkbox" checked={semFim} onChange={(e) => setSemFim(e.target.checked)} />
                sem data para acabar
              </label>
              {!semFim && (
                <>
                  <label className="linha-form">
                    <span>quantas vezes</span>
                    <input inputMode="numeric" value={vezes} onChange={(e) => setVezes(e.target.value.replace(/\D/g, ''))} placeholder="12" style={{ textAlign: 'right' }} />
                  </label>
                  <label className="marcador">
                    <input type="checkbox" checked={dividir} onChange={(e) => setDividir(e.target.checked)} />
                    <span>
                      o valor é o total: dividir entre as vezes
                      {dividir && nVezes && Number.isFinite(numeroValor) ? (
                        <span className="suave"> ({nVezes}× de {moeda(Math.round((numeroValor / nVezes) * 100) / 100)})</span>
                      ) : null}
                    </span>
                  </label>
                </>
              )}
            </>
          )}

          {recorrente && (
            <div className="opcoes-form" role="radiogroup" aria-label="Aplicar em">
              {ESCOPOS.map((x) => (
                <button type="button" key={x.e} className="botao" aria-pressed={escopo === x.e} onClick={() => setEscopo(x.e)}>
                  {x.nome}
                </button>
              ))}
            </div>
          )}
        </div>

        {erro && (
          <div className="aviso erro" role="alert">
            {erro}
          </div>
        )}

        <div className="rodape-modal">
          {confirmarApagar ? (
            <>
              <span className="meta">apagar {recorrente ? ESCOPOS.find((x) => x.e === escopo)!.nome : 'esta movimentação'}?</span>
              <button type="button" className="botao-acao" style={{ '--cor': 'var(--saida)' } as React.CSSProperties} onClick={remover}>
                apagar
              </button>
              <button type="button" className="botao" onClick={() => setConfirmarApagar(false)}>
                cancelar
              </button>
            </>
          ) : (
            <>
              <button type="submit" className="botao-acao" style={{ '--cor': COR_TIPO[tipo] } as React.CSSProperties}>
                {mov ? 'salvar' : `adicionar ${r.nome}`}
              </button>
              {mov && (
                <button type="button" className="botao" onClick={() => setConfirmarApagar(true)}>
                  apagar
                </button>
              )}
            </>
          )}
        </div>
      </form>
      {criandoTag && <ModalTag tag={null} onFechar={() => setCriandoTag(false)} onCriada={(t) => setTagIds((ids) => [...ids, t.id])} />}
    </div>
  );
}
