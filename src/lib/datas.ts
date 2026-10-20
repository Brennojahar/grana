import type { Dia } from './tipos';

const pad = (n: number) => String(n).padStart(2, '0');

export function dia(y: number, m0: number, d: number): Dia {
  return `${y}-${pad(m0 + 1)}-${pad(d)}`;
}

export function partes(d: Dia): [number, number, number] {
  const [y, m, dd] = d.split('-').map(Number);
  return [y, m - 1, dd];
}

export function diasNoMes(y: number, m0: number): number {
  return new Date(Date.UTC(y, m0 + 1, 0)).getUTCDate();
}

export function hojeLocal(agora = new Date()): Dia {
  return dia(agora.getFullYear(), agora.getMonth(), agora.getDate());
}

export function somarDias(d: Dia, n: number): Dia {
  const [y, m, dd] = partes(d);
  const t = new Date(Date.UTC(y, m, dd + n));
  return dia(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
}

/** Soma meses mantendo o dia; se o mês for mais curto, cai no último dia (30 → 28/fev). */
export function somarMeses(d: Dia, n: number, diaAncora?: number): Dia {
  const [y, m, dd] = partes(d);
  const alvo = m + n;
  const ano = y + Math.floor(alvo / 12);
  const mes = ((alvo % 12) + 12) % 12;
  return dia(ano, mes, Math.min(diaAncora ?? dd, diasNoMes(ano, mes)));
}

export function inicioDoMes(d: Dia): Dia {
  const [y, m] = partes(d);
  return dia(y, m, 1);
}

export function fimDoMes(d: Dia): Dia {
  const [y, m] = partes(d);
  return dia(y, m, diasNoMes(y, m));
}

export function diferencaDias(a: Dia, b: Dia): number {
  const [ya, ma, da] = partes(a);
  const [yb, mb, db] = partes(b);
  return Math.round((Date.UTC(yb, mb, db) - Date.UTC(ya, ma, da)) / 864e5);
}

export function cadaDia(de: Dia, ate: Dia): Dia[] {
  const out: Dia[] = [];
  for (let d = de; d <= ate; d = somarDias(d, 1)) out.push(d);
  return out;
}

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

export function nomeMes(m0: number): string {
  return MESES[m0];
}

export function rotuloMes(d: Dia): string {
  const [y, m] = partes(d);
  return `${MESES[m]} ${y}`;
}

export function rotuloMesCurto(d: Dia): string {
  const [y, m] = partes(d);
  return `${MESES[m].slice(0, 3)}/${String(y).slice(2)}`;
}

export function diaDaSemana(d: Dia): string {
  const [y, m, dd] = partes(d);
  return SEMANA[new Date(Date.UTC(y, m, dd)).getUTCDay()];
}

export function rotuloDia(d: Dia): string {
  const [, m, dd] = partes(d);
  return `${dd} de ${MESES[m]}`;
}
