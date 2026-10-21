import type { ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { partes, somarMeses } from '../lib/datas';
import { useGrana } from '../lib/estado';
import type { Dia } from '../lib/tipos';
import { IconeChevronDir, IconeChevronEsq, IconeHoje, IconeHorizonte, IconeVoltar } from './Icones';

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

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

export const mesCurto = (d: Dia) => {
  const [y, m] = partes(d);
  return `${MESES_CURTOS[m]}/${String(y).slice(2)}`;
};

/** Topo do celular em saldos e totais: hoje à esquerda, "‹ out/26 ›" no meio, horizonte à direita. */
export function BarraMes({ mes, setMes, onHoje }: { mes: Dia; setMes(m: Dia): void; onHoje(): void }) {
  const { hoje } = useGrana();
  return (
    <header className="barra-titulo barra-mes">
      <button className="icone-botao" onClick={onHoje} aria-label="Ir pra hoje">
        <IconeHoje dia={partes(hoje)[2]} />
      </button>
      <div className="seletor">
        <button className="seta" onClick={() => setMes(somarMeses(mes, -1))} aria-label="Mês anterior">
          <IconeChevronEsq />
        </button>
        <span className="mes-atual">{mesCurto(mes)}</span>
        <button className="seta" onClick={() => setMes(somarMeses(mes, 1))} aria-label="Próximo mês">
          <IconeChevronDir />
        </button>
      </div>
      <Link to="/horizonte" className="icone-botao" aria-label="Horizonte de saldos">
        <IconeHorizonte />
      </Link>
    </header>
  );
}
