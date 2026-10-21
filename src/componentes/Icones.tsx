import type { Tipo } from '../lib/tipos';

const traco = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const IconeSaldos = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <rect x="2.5" y="3" width="15" height="14" rx="2.5" {...traco} />
    <path d="M2.5 7.5h15M7.5 7.5V17M12.5 7.5V17" {...traco} />
  </svg>
);

export const IconeTotais = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M4 16V9M10 16V4M16 16v-5" {...traco} strokeWidth={2.4} />
  </svg>
);

export const IconeHorizonte = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M2.5 14.5l4.5-4 3 2.5 7.5-7" {...traco} />
    <path d="M13 5.5h4.5V10" {...traco} />
  </svg>
);

export const IconeAjustes = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <path d="M3 5.5h8M15 5.5h2M3 14.5h2M9 14.5h8" {...traco} />
    <circle cx="13" cy="5.5" r="2" {...traco} />
    <circle cx="7" cy="14.5" r="2" {...traco} />
  </svg>
);

export const IconeMais = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <circle cx="10" cy="10" r="7.5" {...traco} />
    <path d="M10 6.5v7M6.5 10h7" {...traco} />
  </svg>
);

export const IconeHoje = () => (
  <svg viewBox="0 0 20 20" aria-hidden="true">
    <rect x="3" y="4" width="14" height="13" rx="2.5" {...traco} />
    <path d="M3 8h14M7 2.5v3M13 2.5v3" {...traco} />
    <circle cx="10" cy="12.5" r="1.6" fill="currentColor" />
  </svg>
);

const SIMBOLO: Record<Tipo, string> = { entrada: '+', saida: '−', diario: '≈', economia: '◆', cartao: '▭' };

/** Quadradinho colorido de cada tipo de movimento; `apagado` desenha só o contorno. */
export function TipoIcone({ tipo, apagado }: { tipo: Tipo; apagado?: boolean }) {
  return (
    <span className={`tipo ${tipo}${apagado ? ' vazio-tipo' : ''}`} aria-hidden="true">
      {SIMBOLO[tipo]}
    </span>
  );
}
