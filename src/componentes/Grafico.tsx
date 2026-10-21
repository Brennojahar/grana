import { useMemo, useRef, useState } from 'react';
import { partes, rotuloDia } from '../lib/datas';
import { moeda } from '../lib/formato';
import type { ResumoDia } from '../lib/tipos';

const L = 1000;
const A = 260;
const PAD_Y = 18;

/** Saldo dia a dia como uma faixa de tinta; toque ou passe o mouse para ler o valor. */
export function Grafico({ dias }: { dias: ResumoDia[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [foco, setFoco] = useState<number | null>(null);

  const g = useMemo(() => {
    if (dias.length < 2) return null;
    const valores = dias.map((d) => d.saldo);
    const min = Math.min(0, ...valores);
    const max = Math.max(0, ...valores);
    const faixa = max - min || 1;
    const x = (i: number) => (i / (dias.length - 1)) * L;
    const y = (v: number) => PAD_Y + (1 - (v - min) / faixa) * (A - PAD_Y * 2);
    const linha = dias.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.saldo).toFixed(1)}`).join('');
    const zero = y(0);
    const area = `${linha}L${L},${zero}L0,${zero}Z`;
    const meses = dias
      .map((d, i) => ({ d, i }))
      .filter(({ d, i }) => i > 0 && partes(d.dia)[2] === 1)
      .map(({ d, i }) => ({ x: x(i), rotulo: ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'][partes(d.dia)[1]] }));
    return { x, y, linha, area, zero, meses, temNegativo: min < 0 };
  }, [dias]);

  if (!g) return null;

  const mover = (clientX: number) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const t = Math.min(1, Math.max(0, (clientX - r.left) / r.width));
    setFoco(Math.round(t * (dias.length - 1)));
  };

  const d = foco !== null ? dias[foco] : null;
  const pctX = foco !== null ? (foco / (dias.length - 1)) * 100 : 0;

  return (
    <div
      className="grafico"
      ref={ref}
      onPointerMove={(e) => mover(e.clientX)}
      onPointerDown={(e) => mover(e.clientX)}
      onPointerLeave={() => setFoco(null)}
      role="img"
      aria-label={`Saldo projetado de ${rotuloDia(dias[0].dia)} a ${rotuloDia(dias.at(-1)!.dia)}`}
    >
      <svg viewBox={`0 0 ${L} ${A + 22}`} preserveAspectRatio="none" style={{ height: 'clamp(180px, 28vw, 300px)' }}>
        <path d={g.area} fill="var(--entrada)" opacity={0.16} />
        <path d={g.linha} fill="none" stroke="var(--entrada)" strokeWidth={2.2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        <line x1={0} x2={L} y1={g.zero} y2={g.zero} stroke="var(--linha-forte)" strokeWidth={1} vectorEffect="non-scaling-stroke" strokeDasharray={g.temNegativo ? '4 4' : undefined} />
        {g.meses.map((m) => (
          <line key={m.x} x1={m.x} x2={m.x} y1={A - 4} y2={A + 4} stroke="var(--linha-forte)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        ))}
        {d && <line x1={g.x(foco!)} x2={g.x(foco!)} y1={0} y2={A} stroke="var(--linha-forte)" strokeWidth={1} vectorEffect="non-scaling-stroke" />}
      </svg>
      <div style={{ position: 'relative', height: 14, marginTop: -14 }}>
        {g.meses.map((m) => (
          <span key={m.x} className="meta" style={{ position: 'absolute', left: `${(m.x / L) * 100}%`, transform: 'translateX(4px)' }}>
            {m.rotulo}
          </span>
        ))}
      </div>
      {d && (
        <div className="grafico-dica meta" style={{ left: `clamp(60px, ${pctX}%, calc(100% - 60px))` }}>
          {rotuloDia(d.dia)} · {moeda(d.saldo)}
        </div>
      )}
    </div>
  );
}
