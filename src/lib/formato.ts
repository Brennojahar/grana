const brl = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const brlCurto = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 });

/** "1.234,56" (sem o R$, que a interface desenha separado). */
export function numero(v: number): string {
  return brl.format(Math.abs(v) < 0.005 ? 0 : v);
}

export function moeda(v: number): string {
  return `${v < -0.004 ? '−' : ''}R$ ${numero(Math.abs(v))}`;
}

/** "5.92K", "11.01K", "1.20M": saldo compacto do horizonte (ponto decimal, como num painel). */
export function compacto(v: number): string {
  const a = Math.abs(v);
  const sinal = v < -0.004 ? '-' : '';
  if (a >= 1e6) return `${sinal}${(a / 1e6).toFixed(2)}M`;
  if (a >= 1e3) return `${sinal}${(a / 1e3).toFixed(2)}K`;
  return `${sinal}${Math.round(a)}`;
}

export function moedaCurta(v: number): string {
  const a = Math.abs(v);
  const s = a >= 1e6 ? `${brl.format(a / 1e6)} mi` : a >= 1e4 ? `${brlCurto.format(a / 1e3)} mil` : brlCurto.format(a);
  return `${v < 0 ? '−' : ''}${s}`;
}

export function porcentagem(v: number): string {
  return `${brlCurto.format(v * 100)}%`;
}

/** Lê "1.234,56", "1234.56", "1234" ou "R$ 12,3" → número; NaN se não der. */
export function lerValor(texto: string): number {
  const limpo = texto.replace(/[^\d,.-]/g, '');
  if (!limpo) return NaN;
  const temVirgula = limpo.includes(',');
  const normal = temVirgula ? limpo.replace(/\./g, '').replace(',', '.') : limpo;
  // Mais de 2 casas é quase sempre digitação errada ("440,00500"): melhor recusar do que arredondar calado.
  if (!/^-?\d*(\.\d{0,2})?$/.test(normal)) return NaN;
  return Math.round(parseFloat(normal) * 100) / 100;
}

export function valorParaCampo(v: number): string {
  return v ? brl.format(v) : '';
}
