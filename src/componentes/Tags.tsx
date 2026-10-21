import { useEffect, useRef, useState } from 'react';
import { useGrana } from '../lib/estado';
import { CONTAS_TAG, CORES_TAG } from '../lib/rotulos';
import type { ContasTag, CorTag, Tag } from '../lib/tipos';
import { IconeCheck, IconeChevronBaixo, IconeFechar, IconeTags } from './Icones';

export function ChipTag({ tag, pequeno }: { tag: Pick<Tag, 'nome' | 'cor'>; pequeno?: boolean }) {
  return (
    <span className={`chip-tag${pequeno ? ' pequeno' : ''}`} style={{ '--fundo-tag': `var(--tag-${tag.cor})` } as React.CSSProperties}>
      {tag.nome}
    </span>
  );
}

/** As tags de uma movimentação, na ordem em que foram criadas; ids de tags apagadas são ignorados. */
export function ChipsTags({ ids, pequeno }: { ids: string[]; pequeno?: boolean }) {
  const { dados } = useGrana();
  const tags = ids.map((id) => dados.tags.find((t) => t.id === id)).filter((t): t is Tag => !!t);
  if (tags.length === 0) return null;
  return (
    <span className="chips-tags">
      {tags.map((t) => (
        <ChipTag key={t.id} tag={t} pequeno={pequeno} />
      ))}
    </span>
  );
}

const CONTAS_PADRAO: ContasTag = { conta_saldo: true, conta_performance: true, conta_economizado: true, conta_custo_vida: true, conta_diario_medio: true };

interface PropsModal {
  tag: Tag | null;
  onFechar(): void;
  /** Recebe a tag criada (para já marcar no formulário que abriu a janela). */
  onCriada?(tag: Tag): void;
  onApagada?(): void;
}

/** Janela de criar e editar tag: nome, cor e, no avançado, em quais cálculos ela entra. */
export function ModalTag({ tag, onFechar, onCriada, onApagada }: PropsModal) {
  const { dados, mudar } = useGrana();
  const [nome, setNome] = useState(tag?.nome ?? '');
  const [cor, setCor] = useState<CorTag>(tag?.cor ?? 'cinza');
  const [contas, setContas] = useState<ContasTag>(() => (tag ? { ...CONTAS_PADRAO, ...pick(tag) } : CONTAS_PADRAO));
  const [avancado, setAvancado] = useState(false);
  const [confirmar, setConfirmar] = useState(false);
  const [erro, setErro] = useState('');
  const fechar = useRef(onFechar);
  fechar.current = onFechar;

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && fechar.current();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);

  function salvar() {
    const limpo = nome.trim();
    if (!limpo) return setErro('Dê um nome para a tag.');
    if (dados.tags.some((t) => t.id !== tag?.id && t.nome.toLowerCase() === limpo.toLowerCase())) return setErro('Já existe uma tag com esse nome.');
    const nova: Tag = { id: tag?.id ?? crypto.randomUUID(), nome: limpo, cor, ...contas };
    mudar({ salvar: { tags: [nova] }, apagar: {} });
    if (!tag) onCriada?.(nova);
    onFechar();
  }

  function remover() {
    if (!tag) return;
    mudar({ salvar: {}, apagar: { tags: [tag.id] } });
    onApagada?.();
    onFechar();
  }

  return (
    <div className="fundo-modal" style={{ zIndex: 60 }} onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={tag ? 'Editar tag' : 'Nova tag'}
        onSubmit={(e) => {
          e.preventDefault();
          salvar();
        }}
      >
        <div className="cabeca-modal">
          <h2>{tag ? 'editar tag' : 'nova tag'}</h2>
          <button type="button" className="icone-botao" onClick={onFechar} aria-label="Fechar">
            <IconeFechar />
          </button>
        </div>
        <div className="corpo-modal">
          <label className="linha-form">
            <IconeTags />
            <input value={nome} onChange={(e) => (setNome(e.target.value), setErro(''))} placeholder="nome da tag" maxLength={40} autoFocus aria-label="Nome da tag" />
            {nome.trim() && <ChipTag tag={{ nome: nome.trim(), cor }} pequeno />}
          </label>

          <div className="cores-tag" role="radiogroup" aria-label="Cor da tag">
            {CORES_TAG.map((c) => (
              <button
                type="button"
                key={c.cor}
                className="cor-tag"
                style={{ '--fundo-tag': `var(--tag-${c.cor})` } as React.CSSProperties}
                aria-pressed={cor === c.cor}
                aria-label={c.nome}
                onClick={() => setCor(c.cor)}
              >
                {cor === c.cor && <IconeCheck />}
              </button>
            ))}
          </div>

          <div className="avancado-tag">
            <button type="button" onClick={() => setAvancado((v) => !v)} aria-expanded={avancado}>
              <span>avançado</span>
              <span style={{ transform: avancado ? 'rotate(180deg)' : undefined, transition: 'transform 160ms' }}>
                <IconeChevronBaixo />
              </span>
            </button>
            {avancado && (
              <>
                <p className="meta" style={{ margin: '0 0 6px' }}>
                  escolha em quais cálculos as movimentações com esta tag entram
                </p>
                {CONTAS_TAG.map((c) => (
                  <button
                    type="button"
                    key={c.conta}
                    className="linha-conta"
                    role="switch"
                    aria-checked={contas[c.conta]}
                    onClick={() => setContas((v) => ({ ...v, [c.conta]: !v[c.conta] }))}
                  >
                    {c.nome}
                    <span className="interruptor" aria-hidden="true" />
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {erro && (
          <div className="aviso erro" role="alert">
            {erro}
          </div>
        )}

        <div className="rodape-modal">
          {confirmar ? (
            <>
              <span className="meta">apagar esta tag? só a tag sai; as movimentações continuam.</span>
              <button type="button" className="botao-acao" style={{ '--cor': 'var(--saida)' } as React.CSSProperties} onClick={remover}>
                apagar tag
              </button>
              <button type="button" className="botao" onClick={() => setConfirmar(false)}>
                cancelar
              </button>
            </>
          ) : (
            <>
              <button type="submit" className="botao-acao" style={{ '--cor': `var(--tag-${cor})`, color: 'var(--tag-texto)' } as React.CSSProperties}>
                {tag ? 'salvar' : 'criar tag'}
              </button>
              {tag && (
                <button type="button" className="botao" onClick={() => setConfirmar(true)}>
                  apagar tag
                </button>
              )}
            </>
          )}
        </div>
      </form>
    </div>
  );
}

function pick(t: Tag): ContasTag {
  return {
    conta_saldo: t.conta_saldo,
    conta_performance: t.conta_performance,
    conta_economizado: t.conta_economizado,
    conta_custo_vida: t.conta_custo_vida,
    conta_diario_medio: t.conta_diario_medio,
  };
}
