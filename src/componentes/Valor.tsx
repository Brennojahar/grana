import { numero } from '../lib/formato';

interface Props {
  v: number;
  /** Mostra "R$" pequeno na frente (nos números grandes). */
  cifrao?: boolean;
  previsto?: boolean;
  /** Valores zerados viram um traço. */
  traco?: boolean;
  className?: string;
}

/** Dinheiro no padrão do grana: negativo vira bloco de tinta, previsto fica em itálico suave. */
export function Valor({ v, cifrao, previsto, traco, className = '' }: Props) {
  if (traco && Math.abs(v) < 0.005) return <span className={`suave ${className}`}>—</span>;
  const neg = v < -0.004;
  const classes = [className, neg ? 'negativo' : '', previsto ? 'previsto' : ''].filter(Boolean).join(' ');
  return (
    <span className={classes}>
      {cifrao && <span className="moeda">R$</span>}
      {neg ? '−' : ''}
      {numero(Math.abs(v))}
    </span>
  );
}
