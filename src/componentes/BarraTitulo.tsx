import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/** Cabeçalho fixo de cada tela: título à esquerda, controles da tela à direita. */
export function BarraTitulo({ titulo, children }: { titulo: string; children?: ReactNode }) {
  return (
    <header className="barra-titulo">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, minWidth: 0 }}>
        <Link to="/" className="marca so-celular" aria-label="grana.com, início">
          g<span>.</span>
        </Link>
        <h1 className="titulo">{titulo}</h1>
      </div>
      {children}
    </header>
  );
}
