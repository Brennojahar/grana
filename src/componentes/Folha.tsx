import { useEffect, useRef, type ReactNode } from 'react';

interface Props {
  titulo: ReactNode;
  meta?: ReactNode;
  onFechar(): void;
  children: ReactNode;
}

/** Folha que sobe de baixo no celular e vira um cartão central no computador. */
export function Folha({ titulo, meta, onFechar, children }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const fechar = useRef(onFechar);
  fechar.current = onFechar;

  // Só na abertura: o pai costuma passar onFechar novo a cada render, e refocar no meio da digitação seria ruim.
  useEffect(() => {
    const anterior = document.activeElement as HTMLElement | null;
    const corpo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('[data-foco], input, select')?.focus({ preventScroll: true });
    const tecla = (e: KeyboardEvent) => {
      if (e.key === 'Escape') fechar.current();
    };
    window.addEventListener('keydown', tecla);
    return () => {
      window.removeEventListener('keydown', tecla);
      document.body.style.overflow = corpo;
      anterior?.focus?.({ preventScroll: true });
    };
  }, []);

  return (
    <div className="fundo-folha" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="folha" role="dialog" aria-modal="true" ref={ref}>
        <div className="cabeca-folha">
          <div>
            {meta && <div className="meta">{meta}</div>}
            <h2 className="subtitulo" style={{ marginTop: meta ? 6 : 0 }}>
              {titulo}
            </h2>
          </div>
          <button className="botao" onClick={onFechar} aria-label="Fechar">
            fechar
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
