import type { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { IconeVoltar } from './Icones';

interface Props {
  titulo: string;
  /** Rota para onde a seta de voltar leva; sem ela, não há seta. */
  voltar?: string;
  /** Controles no centro da barra (seletor de período). */
  centro?: ReactNode;
  direita?: ReactNode;
}

/** Barra fixa do topo de cada tela: título à esquerda, período no centro. */
export function BarraTitulo({ titulo, voltar, centro, direita }: Props) {
  const navegar = useNavigate();
  return (
    <header className="barra-titulo">
      <h1>
        {voltar && (
          <button className="voltar" onClick={() => navegar(voltar)} aria-label="Voltar">
            <IconeVoltar />
          </button>
        )}
        {titulo}
      </h1>
      <div className="centro">{centro}</div>
      <div className="direita">{direita}</div>
    </header>
  );
}
