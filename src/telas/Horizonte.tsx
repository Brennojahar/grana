import { useEffect, useMemo, useRef } from 'react';
import { BarraTitulo } from '../componentes/BarraTitulo';
import { useFolhas } from '../componentes/Folhas';
import { dia as fazerDia, diaDaSemana, diasNoMes, fimDoMes, inicioDoMes, partes, somarMeses } from '../lib/datas';
import { useGrana } from '../lib/estado';
import { compacto, moeda } from '../lib/formato';
import { resumoDiario } from '../lib/motor';
import type { Dia, ResumoDia } from '../lib/tipos';

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

/** Os próximos 12 meses de saldo, um mês por coluna, num relance. */
export function Horizonte() {
  const { dados, hoje } = useGrana();
  const { verDia } = useFolhas();
  const linhaHoje = useRef<HTMLTableCellElement | null>(null);
  const grade = useRef<HTMLDivElement>(null);

  const inicio = inicioDoMes(hoje);
  const meses = Array.from({ length: 12 }, (_, i) => somarMeses(inicio, i));
  const porDia = useMemo(() => {
    const m = new Map<Dia, ResumoDia>();
    for (const r of resumoDiario(dados, inicio, fimDoMes(somarMeses(inicio, 11)), hoje)) m.set(r.dia, r);
    return m;
  }, [dados, inicio, hoje]);

  useEffect(() => {
    const g = grade.current;
    const l = linhaHoje.current;
    if (!g || !l) return;
    const topo = l.getBoundingClientRect().top - g.getBoundingClientRect().top + g.scrollTop;
    g.scrollTo({ top: Math.max(0, topo - g.clientHeight / 2) });
  }, []);

  return (
    <>
      <BarraTitulo titulo="horizonte de saldos" />
      <div className="grade-horizonte" ref={grade}>
        <table className="tabela-horizonte">
          <thead>
            <tr>
              {meses.map((m, i) => {
                const [y, m0] = partes(m);
                return (
                  <th key={m} colSpan={2} className={i === 0 ? 'atual' : ''}>
                    {MESES_CURTOS[m0]}/{String(y).slice(2)}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 31 }, (_, d) => (
              <tr key={d}>
                {meses.map((m) => {
                  const [y, m0] = partes(m);
                  if (d >= diasNoMes(y, m0)) {
                    return [<td key={`${m}d`} className="h-dia" />, <td key={`${m}s`} className="h-saldo vazio" />];
                  }
                  const dia = fazerDia(y, m0, d + 1);
                  const r = porDia.get(dia);
                  const sem = diaDaSemana(dia);
                  const classeDia = ['h-dia', dia === hoje ? 'hoje' : '', sem === 'sáb' || sem === 'dom' ? 'fim-semana' : ''].join(' ');
                  return [
                    <td key={`${m}d`} className={classeDia} ref={dia === hoje ? linhaHoje : undefined}>
                      {d + 1}
                    </td>,
                    <td
                      key={`${m}s`}
                      className={`h-saldo${r && r.saldo < -0.004 ? ' neg' : ''}`}
                      title={r ? moeda(r.saldo) : ''}
                      onClick={() => verDia(dia)}
                      style={{ cursor: 'pointer' }}
                    >
                      {r ? compacto(r.saldo) : ''}
                    </td>,
                  ];
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
