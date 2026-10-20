import type { SupabaseClient } from '@supabase/supabase-js';
import type { Cartao, Dados, Dia, ItemPrevisao, Lancamento, Perfil, Recorrencia } from './tipos';

export interface Linhas {
  lancamentos: Lancamento;
  recorrencias: Recorrencia;
  previsao_itens: ItemPrevisao;
  cartoes: Cartao;
}
export type Tabela = keyof Linhas;

const CHAVE_DADOS: Record<Tabela, keyof Dados> = {
  lancamentos: 'lancamentos',
  recorrencias: 'recorrencias',
  previsao_itens: 'previsao',
  cartoes: 'cartoes',
};

/** Onde os dados moram. Toda tela fala com esta interface, nunca direto com o Supabase. */
export interface Armazem {
  modo: 'local' | 'nuvem';
  carregar(): Promise<Dados>;
  salvar<T extends Tabela>(tabela: T, linhas: Linhas[T][]): Promise<void>;
  apagar(tabela: Tabela, ids: string[]): Promise<void>;
  salvarPerfil(perfil: Perfil): Promise<void>;
  marcarCheckin(dia: Dia, marcado: boolean): Promise<void>;
  /** Apaga tudo e grava `dados` no lugar (importação). */
  substituirTudo(dados: Dados): Promise<void>;
}

export function vazio(): Dados {
  return { perfil: { nome: '', divisor_dias: 30 }, lancamentos: [], recorrencias: [], previsao: [], cartoes: [], checkins: [] };
}

/* ---------- local: navegador, sem login ---------- */

const CHAVE_LOCAL = 'grana:dados:v1';

export function armazemLocal(): Armazem {
  let dados: Dados = vazio();
  try {
    const salvo = localStorage.getItem(CHAVE_LOCAL);
    if (salvo) dados = { ...vazio(), ...JSON.parse(salvo) };
  } catch {
    /* sem armazenamento disponível: segue só em memória */
  }
  const persistir = () => {
    try {
      localStorage.setItem(CHAVE_LOCAL, JSON.stringify(dados));
    } catch {
      /* idem */
    }
  };
  return {
    modo: 'local',
    async carregar() {
      return structuredClone(dados);
    },
    async salvar(tabela, linhas) {
      const k = CHAVE_DADOS[tabela];
      const atual = dados[k] as { id: string }[];
      const porId = new Map(atual.map((l) => [l.id, l]));
      for (const l of linhas) porId.set(l.id, l);
      (dados[k] as unknown) = [...porId.values()];
      persistir();
    },
    async apagar(tabela, ids) {
      const k = CHAVE_DADOS[tabela];
      const fora = new Set(ids);
      (dados[k] as unknown) = (dados[k] as { id: string }[]).filter((l) => !fora.has(l.id));
      if (tabela === 'recorrencias') dados.lancamentos = dados.lancamentos.filter((l) => !l.recorrencia_id || !fora.has(l.recorrencia_id));
      persistir();
    },
    async salvarPerfil(perfil) {
      dados.perfil = perfil;
      persistir();
    },
    async marcarCheckin(dia, marcado) {
      dados.checkins = marcado ? [...new Set([...dados.checkins, dia])] : dados.checkins.filter((d) => d !== dia);
      persistir();
    },
    async substituirTudo(novos) {
      dados = structuredClone(novos);
      persistir();
    },
  };
}

/* ---------- nuvem: Supabase com login ---------- */

const CAMPOS: Record<Tabela, string> = {
  lancamentos: 'id,data,tipo,valor,descricao,cartao_id,recorrencia_id,ocorrencia,pulado',
  recorrencias: 'id,tipo,descricao,valor,frequencia,inicio,ocorrencias,fim,cartao_id',
  previsao_itens: 'id,descricao,valor',
  cartoes: 'id,nome,dia_fechamento,dia_vencimento',
};

/** Ordem de gravação respeitando as chaves estrangeiras. */
const ORDEM: Tabela[] = ['cartoes', 'previsao_itens', 'recorrencias', 'lancamentos'];

export function armazemNuvem(sb: SupabaseClient, userId: string): Armazem {
  const falhou = (erro: { message: string } | null) => {
    if (erro) throw new Error(erro.message);
  };
  const numero = <T extends { valor: number }>(l: T): T => ({ ...l, valor: Number(l.valor) });

  return {
    modo: 'nuvem',
    async carregar() {
      const [perfil, lanc, rec, prev, cart, chk] = await Promise.all([
        sb.from('perfis').select('nome,divisor_dias').eq('user_id', userId).maybeSingle(),
        sb.from('lancamentos').select(CAMPOS.lancamentos).order('data').limit(20000),
        sb.from('recorrencias').select(CAMPOS.recorrencias).order('inicio'),
        sb.from('previsao_itens').select(CAMPOS.previsao_itens).order('criado_em'),
        sb.from('cartoes').select(CAMPOS.cartoes).order('nome'),
        sb.from('checkins').select('dia'),
      ]);
      for (const r of [perfil, lanc, rec, prev, cart, chk]) falhou(r.error);
      return {
        perfil: (perfil.data as Perfil | null) ?? { nome: '', divisor_dias: 30 },
        lancamentos: ((lanc.data ?? []) as unknown as Lancamento[]).map(numero),
        recorrencias: ((rec.data ?? []) as unknown as Recorrencia[]).map(numero),
        previsao: ((prev.data ?? []) as unknown as ItemPrevisao[]).map(numero),
        cartoes: (cart.data ?? []) as unknown as Cartao[],
        checkins: ((chk.data ?? []) as { dia: string }[]).map((c) => c.dia),
      };
    },
    async salvar(tabela, linhas) {
      if (linhas.length === 0) return;
      const { error } = await sb.from(tabela).upsert(linhas.map((l) => ({ ...l, user_id: userId })));
      falhou(error);
    },
    async apagar(tabela, ids) {
      if (ids.length === 0) return;
      const { error } = await sb.from(tabela).delete().in('id', ids);
      falhou(error);
    },
    async salvarPerfil(perfil) {
      const { error } = await sb.from('perfis').upsert({ user_id: userId, ...perfil });
      falhou(error);
    },
    async marcarCheckin(dia, marcado) {
      const { error } = marcado
        ? await sb.from('checkins').upsert({ user_id: userId, dia })
        : await sb.from('checkins').delete().eq('dia', dia);
      falhou(error);
    },
    async substituirTudo(novos) {
      for (const t of [...ORDEM].reverse()) {
        const { error } = await sb.from(t).delete().eq('user_id', userId);
        falhou(error);
      }
      falhou((await sb.from('checkins').delete().eq('user_id', userId)).error);
      for (const t of ORDEM) await this.salvar(t, novos[CHAVE_DADOS[t]] as Linhas[typeof t][]);
      if (novos.checkins.length) falhou((await sb.from('checkins').insert(novos.checkins.map((dia) => ({ user_id: userId, dia })))).error);
      await this.salvarPerfil(novos.perfil);
    },
  };
}
