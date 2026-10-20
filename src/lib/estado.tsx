import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { armazemLocal, armazemNuvem, vazio, type Armazem, type Linhas, type Tabela } from './armazem';
import { hojeLocal } from './datas';
import { aplicar, type Mudanca } from './operacoes';
import { supabase } from './supabase';
import type { Dados, Dia, Perfil } from './tipos';

interface Estado {
  modo: 'local' | 'nuvem';
  /** Supabase configurado mas ninguém logado. */
  precisaEntrar: boolean;
  recuperandoSenha: boolean;
  carregando: boolean;
  erro: string | null;
  email: string | null;
  dados: Dados;
  hoje: Dia;
  mudar(m: Mudanca): Promise<void>;
  salvarPerfil(p: Perfil): Promise<void>;
  marcarCheckin(dia: Dia, marcado: boolean): Promise<void>;
  importar(d: Dados): Promise<void>;
  limparErro(): void;
  fimRecuperacao(): void;
  sair(): Promise<void>;
}

const Contexto = createContext<Estado | null>(null);

export function useGrana(): Estado {
  const c = useContext(Contexto);
  if (!c) throw new Error('useGrana fora do ProvedorGrana');
  return c;
}

function useHoje(): Dia {
  const [hoje, setHoje] = useState(hojeLocal);
  useEffect(() => {
    const atualizar = () => setHoje(hojeLocal());
    const t = window.setInterval(atualizar, 60_000);
    document.addEventListener('visibilitychange', atualizar);
    return () => {
      window.clearInterval(t);
      document.removeEventListener('visibilitychange', atualizar);
    };
  }, []);
  return hoje;
}

export function ProvedorGrana({ children }: { children: ReactNode }) {
  const hoje = useHoje();
  const [sessao, setSessao] = useState<Session | null>(null);
  const [sessaoLida, setSessaoLida] = useState(!supabase);
  const [recuperandoSenha, setRecuperando] = useState(false);
  const [dados, setDados] = useState<Dados>(vazio);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const dadosRef = useRef(dados);
  dadosRef.current = dados;

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSessao(data.session);
      setSessaoLida(true);
    });
    const { data } = supabase.auth.onAuthStateChange((evento, s) => {
      setSessao(s);
      if (evento === 'PASSWORD_RECOVERY') setRecuperando(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = sessao?.user.id ?? null;
  const armazem: Armazem | null = useMemo(() => {
    if (!supabase) return armazemLocal();
    return userId ? armazemNuvem(supabase, userId) : null;
  }, [userId]);

  const recarregar = useCallback(async () => {
    if (!armazem) {
      setDados(vazio());
      setCarregando(false);
      return;
    }
    setCarregando(true);
    try {
      setDados(await armazem.carregar());
    } catch (e) {
      setErro(`Não deu para carregar seus dados: ${(e as Error).message}`);
    } finally {
      setCarregando(false);
    }
  }, [armazem]);

  useEffect(() => {
    if (sessaoLida) recarregar();
  }, [sessaoLida, recarregar]);

  /** Atualiza a tela na hora e grava em seguida; se a gravação falhar, recarrega do armazém. */
  const comArmazem = useCallback(
    async (otimista: (d: Dados) => Dados, gravar: (a: Armazem) => Promise<void>) => {
      if (!armazem) return;
      setDados((d) => otimista(d));
      try {
        await gravar(armazem);
      } catch (e) {
        setErro(`Não salvou: ${(e as Error).message}`);
        await recarregar();
      }
    },
    [armazem, recarregar],
  );

  const mudar = useCallback(
    (m: Mudanca) =>
      comArmazem(
        (d) => aplicar(d, m),
        async (a) => {
          const ordem: Tabela[] = ['cartoes', 'previsao_itens', 'recorrencias', 'lancamentos'];
          for (const t of ordem) {
            const linhas = m.salvar[t];
            if (linhas?.length) await a.salvar(t, linhas as Linhas[typeof t][]);
          }
          for (const t of [...ordem].reverse()) {
            const ids = m.apagar[t];
            if (ids?.length) await a.apagar(t, ids);
          }
        },
      ),
    [comArmazem],
  );

  const estado: Estado = {
    modo: supabase ? 'nuvem' : 'local',
    precisaEntrar: !!supabase && sessaoLida && !sessao,
    recuperandoSenha,
    carregando: !sessaoLida || carregando,
    erro,
    email: sessao?.user.email ?? null,
    dados,
    hoje,
    mudar,
    salvarPerfil: (p) => comArmazem((d) => ({ ...d, perfil: p }), (a) => a.salvarPerfil(p)),
    marcarCheckin: (dia, marcado) =>
      comArmazem(
        (d) => ({ ...d, checkins: marcado ? [...new Set([...d.checkins, dia])] : d.checkins.filter((x) => x !== dia) }),
        (a) => a.marcarCheckin(dia, marcado),
      ),
    importar: (novos) => comArmazem(() => novos, (a) => a.substituirTudo(novos)),
    limparErro: () => setErro(null),
    fimRecuperacao: () => setRecuperando(false),
    sair: async () => {
      if (supabase) await supabase.auth.signOut();
    },
  };

  return <Contexto.Provider value={estado}>{children}</Contexto.Provider>;
}
