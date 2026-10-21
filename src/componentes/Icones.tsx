import type { ReactNode } from 'react';
import type { Tipo } from '../lib/tipos';

const traco = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

function Svg({ children, tamanho = 20 }: { children: ReactNode; tamanho?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={tamanho} height={tamanho} aria-hidden="true" className="icone">
      {children}
    </svg>
  );
}

/* ---------- tipos de movimento: círculo colorido com seta ou letra ---------- */

const COR: Record<Tipo, string> = {
  entrada: 'var(--entrada)',
  saida: 'var(--saida)',
  diario: 'var(--diario)',
  economia: 'var(--economia)',
  cartao: 'var(--cartao)',
};

const LETRA: Partial<Record<Tipo, string>> = { diario: 'D', economia: 'E', cartao: 'C' };

function Glifo({ tipo }: { tipo: Tipo }) {
  if (tipo === 'entrada') return <path d="M13.2 6.8 7 13M7 8.6V13h4.4" fill="none" stroke="var(--glifo)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />;
  if (tipo === 'saida') return <path d="M6.8 13.2 13 7M8.6 7H13v4.4" fill="none" stroke="var(--glifo)" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />;
  return (
    <text x="10" y="14.1" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--glifo)" fontFamily="'DM Sans', sans-serif">
      {LETRA[tipo]}
    </text>
  );
}

/** Ícone redondo do tipo. `apagado` = cinza, para valores zerados. */
export function TipoIcone({ tipo, apagado, tamanho = 16 }: { tipo: Tipo; apagado?: boolean; tamanho?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={tamanho} height={tamanho} aria-hidden="true" className={`tipo-icone${apagado ? ' apagado' : ''}`}>
      <circle cx="10" cy="10" r="9.2" fill={apagado ? 'var(--icone-apagado)' : COR[tipo]} />
      <Glifo tipo={tipo} />
    </svg>
  );
}

/** "D" com anel pontilhado: a previsão de gasto diário. */
export function PrevisaoIcone({ tamanho = 16 }: { tamanho?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={tamanho} height={tamanho} aria-hidden="true" className="tipo-icone">
      <circle cx="10" cy="10" r="8.4" fill="none" stroke="var(--diario)" strokeWidth={1.8} strokeDasharray="2.2 2.2" />
      <text x="10" y="14.1" textAnchor="middle" fontSize="11" fontWeight="800" fill="var(--diario)" fontFamily="'DM Sans', sans-serif">
        D
      </text>
    </svg>
  );
}

/* ---------- navegação ---------- */

export const IconeSaldos = () => (
  <Svg>
    <path d="M3 4.5h14M3 8.5h14M3 12.5h14M3 16.5h14M7 4.5v12" {...traco} />
  </Svg>
);

export const IconeTotais = () => (
  <Svg>
    <path d="M3.5 6h5M6 3.5v5M3.5 14.5h5M11.5 3.8l4 4M15.5 3.8l-4 4M11.5 13h4M11.5 16h4" {...traco} />
  </Svg>
);

export const IconeMenu = () => (
  <Svg>
    <path d="M3.5 5h13M3.5 10h13M3.5 15h13" {...traco} />
  </Svg>
);

export const IconeAdicionar = () => (
  <Svg>
    <circle cx="10" cy="10" r="8.5" fill="currentColor" />
    <path d="M10 6v8M6 10h8" stroke="var(--fundo)" strokeWidth={2} strokeLinecap="round" />
  </Svg>
);

export function IconeHoje({ dia }: { dia: number }) {
  return (
    <svg viewBox="0 0 20 20" width={20} height={20} aria-hidden="true" className="icone">
      <rect x="2" y="3.5" width="16" height="14.5" rx="2.5" fill="var(--painel-2)" />
      <path d="M2 6a2.5 2.5 0 0 1 2.5-2.5h11A2.5 2.5 0 0 1 18 6v1.5H2z" fill="var(--laranja)" />
      <path d="M6 2v3M14 2v3" stroke="var(--laranja)" strokeWidth={1.6} strokeLinecap="round" />
      <text x="10" y="15.8" textAnchor="middle" fontSize="8" fontWeight="700" fill="currentColor" fontFamily="'DM Sans', sans-serif">
        {dia}
      </text>
    </svg>
  );
}

export const IconeHorizonte = () => (
  <Svg>
    <rect x="2" y="3" width="16" height="4" rx="2" fill="var(--entrada)" />
    <rect x="2" y="8" width="16" height="4" rx="2" fill="var(--entrada)" opacity={0.85} />
    <rect x="2" y="13" width="16" height="4" rx="2" fill="var(--entrada)" opacity={0.7} />
  </Svg>
);

/* ---------- utilitários ---------- */

export const IconeFechar = () => (
  <Svg>
    <path d="M5 5l10 10M15 5L5 15" {...traco} />
  </Svg>
);

export const IconeMais = () => (
  <Svg>
    <path d="M10 4v12M4 10h12" {...traco} />
  </Svg>
);

export const IconeVoltar = () => (
  <Svg>
    <path d="M16 10H4M9 5l-5 5 5 5" {...traco} />
  </Svg>
);

export const IconeChevronEsq = () => (
  <Svg>
    <path d="M12.5 4.5 7 10l5.5 5.5" {...traco} />
  </Svg>
);

export const IconeChevronDir = () => (
  <Svg>
    <path d="M7.5 4.5 13 10l-5.5 5.5" {...traco} />
  </Svg>
);

export const IconeChevronDuploEsq = () => (
  <Svg>
    <path d="M10 4.5 4.5 10l5.5 5.5M15.5 4.5 10 10l5.5 5.5" {...traco} />
  </Svg>
);

export const IconeChevronDuploDir = () => (
  <Svg>
    <path d="M10 4.5l5.5 5.5-5.5 5.5M4.5 4.5 10 10l-5.5 5.5" {...traco} />
  </Svg>
);

export const IconeChevronBaixo = () => (
  <Svg tamanho={16}>
    <path d="M5 7.5l5 5 5-5" {...traco} />
  </Svg>
);

export const IconeCheck = () => (
  <Svg tamanho={16}>
    <path d="M4.5 10.5l3.5 3.5 7.5-8" {...traco} />
  </Svg>
);

export const IconeKebab = () => (
  <Svg>
    <circle cx="10" cy="4.5" r="1.5" fill="currentColor" />
    <circle cx="10" cy="10" r="1.5" fill="currentColor" />
    <circle cx="10" cy="15.5" r="1.5" fill="currentColor" />
  </Svg>
);

export const IconeDinheiro = () => (
  <Svg>
    <rect x="2" y="5" width="16" height="10" rx="2" {...traco} />
    <circle cx="10" cy="10" r="2.2" {...traco} />
    <path d="M4 17h12" {...traco} />
  </Svg>
);

export const IconeLapis = () => (
  <Svg>
    <path d="M12.5 4.5l3 3L7 16H4v-3z" {...traco} />
  </Svg>
);

export const IconeCalendario = () => (
  <Svg>
    <rect x="3" y="4" width="14" height="13" rx="2.5" {...traco} />
    <path d="M3 8h14M7 2.5v3M13 2.5v3" {...traco} />
  </Svg>
);

export const IconeRepetir = () => (
  <Svg>
    <rect x="3" y="4" width="12" height="11" rx="2.5" {...traco} />
    <path d="M3 8h12M7 2.5v3M11 2.5v3M17.5 13.5a3 3 0 1 1-1-2.2M17.5 10.5v1.6h-1.6" {...traco} />
  </Svg>
);

export const IconeCartao = () => (
  <Svg>
    <rect x="2" y="4.5" width="16" height="11" rx="2" {...traco} />
    <path d="M2 8.5h16" {...traco} />
  </Svg>
);

export const IconeCartaoMais = () => (
  <Svg>
    <path d="M18 9V6.5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h7M2 8.5h16M16 12v6M13 15h6" {...traco} />
  </Svg>
);

export const IconePessoa = () => (
  <Svg>
    <circle cx="10" cy="6.5" r="3.2" {...traco} />
    <path d="M3.5 17c.8-3.2 3.3-5 6.5-5s5.7 1.8 6.5 5z" {...traco} />
  </Svg>
);

export const IconeEngrenagem = () => (
  <Svg>
    <circle cx="10" cy="10" r="2.6" {...traco} />
    <path
      d="M10 2.5v2M10 15.5v2M2.5 10h2M15.5 10h2M4.7 4.7l1.4 1.4M13.9 13.9l1.4 1.4M4.7 15.3l1.4-1.4M13.9 6.1l1.4-1.4"
      {...traco}
    />
  </Svg>
);

export const IconeAjuda = () => (
  <Svg>
    <circle cx="10" cy="10" r="7.8" {...traco} />
    <path d="M7.8 8a2.3 2.3 0 1 1 3.3 2.1c-.7.3-1.1.9-1.1 1.6v.3" {...traco} />
    <circle cx="10" cy="14.6" r="1" fill="currentColor" />
  </Svg>
);

export const IconeSair = () => (
  <Svg>
    <path d="M8 3.5H5a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 5 16.5h3M12.5 6.5 16 10l-3.5 3.5M16 10H8" {...traco} />
  </Svg>
);

export const IconeSol = () => (
  <Svg tamanho={16}>
    <circle cx="10" cy="10" r="3.2" {...traco} />
    <path d="M10 2.5v1.8M10 15.7v1.8M2.5 10h1.8M15.7 10h1.8M4.7 4.7l1.3 1.3M14 14l1.3 1.3M4.7 15.3 6 14M14 6l1.3-1.3" {...traco} />
  </Svg>
);

export const IconeLua = () => (
  <Svg tamanho={16}>
    <path d="M15.5 12.2A6.5 6.5 0 0 1 7.8 4.5a6.5 6.5 0 1 0 7.7 7.7z" {...traco} />
  </Svg>
);

export const IconeNuvem = () => (
  <Svg tamanho={16}>
    <path d="M6 15.5h8.2a3.3 3.3 0 0 0 .4-6.6 4.8 4.8 0 0 0-9.2 1A2.8 2.8 0 0 0 6 15.5z" {...traco} />
  </Svg>
);

export const IconeRecomecar = () => (
  <Svg tamanho={16}>
    <path d="M4.5 10a5.5 5.5 0 1 0 1.8-4.1M4.5 3.5v3h3" {...traco} />
  </Svg>
);

export const IconeLixeira = () => (
  <Svg tamanho={16}>
    <path d="M4 6h12M8 6V4h4v2M5.5 6l.8 10.5h7.4L14.5 6" {...traco} />
  </Svg>
);

export const IconeBaixar = () => (
  <Svg tamanho={16}>
    <path d="M10 3v9.5M6 9l4 4 4-4M4 16.5h12" {...traco} />
  </Svg>
);

export const IconeSubir = () => (
  <Svg tamanho={16}>
    <path d="M10 13V3.5M6 7l4-4 4 4M4 16.5h12" {...traco} />
  </Svg>
);

export const IconeFiltro = () => (
  <Svg tamanho={16}>
    <path d="M3.5 5h13M6 10h8M8.5 15h3" {...traco} />
  </Svg>
);

export const IconeRecolher = () => (
  <Svg>
    <path d="M12.5 4.5 7 10l5.5 5.5" {...traco} />
  </Svg>
);
