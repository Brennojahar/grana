import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

/**
 * Faixa de páginas lado a lado que segue o dedo e, ao soltar, assenta numa desaceleração
 * exponencial: a cada 38 ms o que falta cai para ~1/3. Medido quadro a quadro no app
 * original: ~90% do caminho em ~85 ms e o resto freando devagar até ~220 ms, sem quicar.
 *
 * A posição vai em duas variáveis CSS no elemento de `ref`: `--i` (página) e `--x`
 * (deslocamento em px). Assim o arraste não re-renderiza o React a cada quadro.
 */

interface Opcoes {
  paginas: number;
  indice: number;
  /** Ao soltar o dedo (ou escolher na lista), com a página de destino. */
  aoMudar(alvo: number): void;
  /** Quando a mola termina de assentar. */
  aoAssentar?(alvo: number): void;
  /** Sem faixa na tela (ex.: modo "todas"): o gesto só decide a página, sem arrastar nada. */
  fixo?: boolean;
}

interface Gesto {
  x0: number;
  y0: number;
  eixo: 'x' | 'y' | null;
  largura: number;
  amostras: { t: number; x: number }[];
}

const TAU = 0.038; // constante de tempo da desaceleração (s)
const LIMIAR_DISTANCIA = 0.22; // fração da largura que já conta como troca
const LIMIAR_VELOCIDADE = 0.35; // px/ms: um peteleco rápido também troca
const RESISTENCIA = 0.3; // nas pontas a faixa estica só um pouco

export function useFaixa<T extends HTMLElement>({ paginas, indice, aoMudar, aoAssentar, fixo }: Opcoes) {
  const ref = useRef<T>(null) as RefObject<T>;
  const gesto = useRef<Gesto | null>(null);
  const quadro = useRef<number | null>(null);
  const seguranca = useRef<number | null>(null);
  const largura = useRef(200);
  const pendente = useRef<{ alvo: number; d: number } | null>(null);
  const [rotuloArraste, setRotuloArraste] = useState<number | null>(null);
  const rotuloAtual = useRef<number | null>(null);

  const posicionar = (i: number, x: number) => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--i', String(i));
    el.style.setProperty('--x', `${x.toFixed(2)}px`);
  };

  const parar = () => {
    if (quadro.current !== null) cancelAnimationFrame(quadro.current);
    if (seguranca.current !== null) window.clearTimeout(seguranca.current);
    quadro.current = null;
    seguranca.current = null;
  };

  /** Leva a faixa de `d0` px (relativo à página alvo) até 0, freando exponencialmente. */
  const assentar = (alvo: number, d0: number) => {
    parar();
    const inicio = performance.now();
    const fim = () => {
      parar();
      posicionar(alvo, 0);
      aoAssentar?.(alvo);
    };
    const passo = (agora: number) => {
      const d = d0 * Math.exp(-(agora - inicio) / 1000 / TAU);
      if (Math.abs(d) < 0.3) return fim();
      posicionar(alvo, d);
      quadro.current = requestAnimationFrame(passo);
    };
    posicionar(alvo, d0);
    quadro.current = requestAnimationFrame(passo);
    // Se a aba ficar oculta o rAF para; garante que a faixa não fica no meio do caminho.
    seguranca.current = window.setTimeout(fim, 600);
  };

  // Quando a página muda por fora (estado do React), alinha a faixa — a não ser que esteja animando.
  useLayoutEffect(() => {
    const p = pendente.current;
    if (p) {
      pendente.current = null;
      assentar(p.alvo, p.d);
    } else if (quadro.current === null) {
      posicionar(indice, 0);
    }
  }, [indice, fixo]);

  const resistencia = (i: number, off: number) => ((i === 0 && off > 0) || (i === paginas - 1 && off < 0) ? off * RESISTENCIA : off);

  const onTouchStart = (e: React.TouchEvent) => {
    if (quadro.current !== null) {
      // Tocou durante a mola: termina na hora para o novo gesto partir de um lugar estável.
      parar();
      posicionar(indice, 0);
    }
    const t = e.touches[0];
    const janela = ref.current?.querySelector<HTMLElement>('.janela');
    if (janela) largura.current = janela.clientWidth;
    gesto.current = { x0: t.clientX, y0: t.clientY, eixo: null, largura: largura.current, amostras: [{ t: e.timeStamp, x: t.clientX }] };
  };

  const onTouchMove = (e: React.TouchEvent) => {
    const g = gesto.current;
    if (!g) return;
    const t = e.touches[0];
    const dx = t.clientX - g.x0;
    const dy = t.clientY - g.y0;
    if (!g.eixo) {
      if (Math.abs(dx) + Math.abs(dy) < 8) return;
      g.eixo = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
    }
    if (g.eixo !== 'x') return;
    g.amostras.push({ t: e.timeStamp, x: t.clientX });
    if (g.amostras.length > 6) g.amostras.shift();
    if (fixo) return;
    const off = resistencia(indice, dx);
    posicionar(indice, off);
    const vizinho = Math.max(0, Math.min(paginas - 1, indice + (off < 0 ? 1 : -1)));
    const r = Math.abs(off) > g.largura / 2 ? vizinho : null;
    if (r !== rotuloAtual.current) {
      rotuloAtual.current = r;
      setRotuloArraste(r);
    }
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    const g = gesto.current;
    gesto.current = null;
    if (rotuloAtual.current !== null) {
      rotuloAtual.current = null;
      setRotuloArraste(null);
    }
    if (!g || g.eixo !== 'x') return;
    const dx = e.changedTouches[0].clientX - g.x0;
    const a = g.amostras;
    const vel = a.length > 1 ? (a[a.length - 1].x - a[0].x) / Math.max(1, a[a.length - 1].t - a[0].t) : 0;

    let alvo = indice;
    if (dx < -g.largura * LIMIAR_DISTANCIA || vel < -LIMIAR_VELOCIDADE) alvo = indice + 1;
    else if (dx > g.largura * LIMIAR_DISTANCIA || vel > LIMIAR_VELOCIDADE) alvo = indice - 1;
    alvo = Math.max(0, Math.min(paginas - 1, alvo));

    if (fixo) {
      if (alvo === indice) return;
      // Sai do modo fixo: a faixa volta a aparecer já deslocada e assenta no lugar.
      pendente.current = { alvo, d: (indice - alvo) * -g.largura };
      aoMudar(alvo);
      return;
    }
    const off = resistencia(indice, dx);
    const d = off + (alvo - indice) * g.largura;
    if (alvo !== indice) aoMudar(alvo);
    assentar(alvo, d);
  };

  /** Vai para uma página com animação (escolha na lista). */
  const irPara = (alvo: number) => {
    if (alvo === indice) return;
    if (fixo) {
      pendente.current = { alvo, d: (indice - alvo) * -largura.current };
      aoMudar(alvo);
      return;
    }
    aoMudar(alvo);
    assentar(alvo, (alvo - indice) * largura.current);
  };

  return {
    ref,
    rotuloArraste,
    irPara,
    eventos: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: onTouchEnd },
  };
}
