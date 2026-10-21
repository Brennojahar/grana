import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { nomeMes, partes, somarDias } from '../lib/datas';
import { useGrana } from '../lib/estado';
import { moeda } from '../lib/formato';
import { movimentos, resumoDiario } from '../lib/motor';
import { rotulo, TIPOS } from '../lib/rotulos';
import type { Dia, Movimento, Tipo } from '../lib/tipos';
import { FormLancamento } from './FormLancamento';
import { ChipsTags } from './Tags';
import { IconeChevronBaixo, IconeChevronDir, IconeChevronEsq, IconeFechar, IconeFiltro, IconeMais, IconeVoltar, PrevisaoIcone, TipoIcone } from './Icones';

type Aberta = { qual: 'novo'; data: Dia; tipo?: Tipo; tagIds?: string[] } | { qual: 'editar'; mov: Movimento } | null;

interface Folhas {
  /** Abre o menu "adicionar" perto do elemento (no celular, sobe de baixo). */
  abrirAdicionar(ancora?: HTMLElement | null, data?: Dia, tagIds?: string[]): void;
  lancar(data?: Dia, tipo?: Tipo, tagIds?: string[]): void;
  editarMov(mov: Movimento): void;
  verDia(dia: Dia, filtro?: Tipo | null): void;
}

const Contexto = createContext<Folhas | null>(null);

export function useFolhas(): Folhas {
  const c = useContext(Contexto);
  if (!c) throw new Error('useFolhas fora do ProvedorFolhas');
  return c;
}

export const nomeTipo = (t: Tipo) => rotulo(t).nome;

export function ProvedorFolhas({ children }: { children: ReactNode }) {
  const { hoje } = useGrana();
  const [aberta, setAberta] = useState<Aberta>(null);
  const [menu, setMenu] = useState<{ x: number; y: number; data?: Dia; tagIds?: string[] } | null>(null);
  const [gaveta, setGaveta] = useState<{ dia: Dia; filtro: Tipo | null } | null>(null);

  const api = useMemo<Folhas>(
    () => ({
      abrirAdicionar: (ancora, data, tagIds) => {
        const r = ancora?.getBoundingClientRect();
        setMenu({ x: r ? r.right + 8 : 0, y: r ? Math.min(r.top, window.innerHeight - 420) : 0, data, tagIds });
      },
      lancar: (data, tipo, tagIds) => setAberta({ qual: 'novo', data: data ?? hoje, tipo, tagIds }),
      editarMov: (mov) => setAberta({ qual: 'editar', mov }),
      verDia: (dia, filtro = null) => setGaveta({ dia, filtro }),
    }),
    [hoje],
  );

  return (
    <Contexto.Provider value={api}>
      {children}
      {menu && (
        <>
          <div className="fundo-transparente" onClick={() => setMenu(null)} />
          <div className="menu-adicionar" role="menu" style={{ left: menu.x, top: menu.y }}>
            <header>adicionar</header>
            {TIPOS.map((t) => (
              <button
                key={t.tipo}
                role="menuitem"
                onClick={() => {
                  setMenu(null);
                  setAberta({ qual: 'novo', data: menu.data ?? hoje, tipo: t.tipo, tagIds: menu.tagIds });
                }}
              >
                <span className="nome">
                  <TipoIcone tipo={t.tipo} tamanho={20} />
                  {t.menu}
                </span>
                <small>{t.dica}</small>
              </button>
            ))}
          </div>
        </>
      )}
      {gaveta && (
        <GavetaDia
          dia={gaveta.dia}
          filtro={gaveta.filtro}
          onMudar={(dia, filtro) => setGaveta({ dia, filtro })}
          onFechar={() => setGaveta(null)}
          onEditar={(mov) => setAberta({ qual: 'editar', mov })}
          onAdicionar={(el) => api.abrirAdicionar(el, gaveta.dia)}
        />
      )}
      {aberta?.qual === 'novo' && <FormLancamento novo={{ data: aberta.data, tipo: aberta.tipo, tagIds: aberta.tagIds }} onFechar={() => setAberta(null)} />}
      {aberta?.qual === 'editar' && <FormLancamento mov={aberta.mov} onFechar={() => setAberta(null)} />}
    </Contexto.Provider>
  );
}

const MESES_CURTOS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

interface PropsGaveta {
  dia: Dia;
  filtro: Tipo | null;
  onMudar(dia: Dia, filtro: Tipo | null): void;
  onFechar(): void;
  onEditar(mov: Movimento): void;
  onAdicionar(el: HTMLElement): void;
}

/** Painel lateral com as movimentações de um dia, com filtro por tipo. */
function GavetaDia({ dia, filtro, onMudar, onFechar, onEditar, onAdicionar }: PropsGaveta) {
  const { dados, hoje, marcarCheckin } = useGrana();
  const todos = movimentos(dados, dia, dia);
  const movs = filtro ? todos.filter((m) => m.tipo === filtro) : todos;
  const resumo = resumoDiario(dados, dia, dia, hoje)[0];
  const feito = dados.checkins.includes(dia);
  const [, m0, dd] = partes(dia);
  const mostrarPrevisao = resumo?.diarioPrevisto && (!filtro || filtro === 'diario');

  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && onFechar();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, [onFechar]);

  return (
    <>
      <div className="fundo-gaveta" onClick={onFechar} />
      <aside className="gaveta" role="dialog" aria-label={`Movimentações de ${dd} de ${nomeMes(m0)}`}>
        <div className="cabeca-gaveta">
          <button className="icone-botao" onClick={onFechar} aria-label="Fechar">
            <span className="so-largo">
              <IconeFechar />
            </span>
            <span className="so-celular">
              <IconeVoltar />
            </span>
          </button>
          <div className="dia-gaveta">
            <button className="icone-botao" onClick={() => onMudar(somarDias(dia, -1), filtro)} aria-label="Dia anterior">
              <IconeChevronEsq />
            </button>
            {dd}/{MESES_CURTOS[m0]}
            <button className="icone-botao" onClick={() => onMudar(somarDias(dia, 1), filtro)} aria-label="Próximo dia">
              <IconeChevronDir />
            </button>
          </div>
          <button className="icone-botao" onClick={(e) => onAdicionar(e.currentTarget)} aria-label="Adicionar neste dia">
            <IconeMais />
          </button>
        </div>

        <label className="filtro-gaveta">
          <IconeFiltro />
          {filtro ? <TipoIcone tipo={filtro} /> : null}
          <span style={{ flex: 1 }}>{filtro ? rotulo(filtro).plural : 'todas as movimentações'}</span>
          <IconeChevronBaixo />
          <select value={filtro ?? ''} onChange={(e) => onMudar(dia, (e.target.value || null) as Tipo | null)} aria-label="Filtrar por tipo">
            <option value="">todas as movimentações</option>
            {TIPOS.map((t) => (
              <option key={t.tipo} value={t.tipo}>
                {t.plural}
              </option>
            ))}
          </select>
        </label>

        <div className="corpo-gaveta">
          {movs.map((mv) => (
            <button key={mv.chave} className="mov" onClick={() => onEditar(mv)}>
              <TipoIcone tipo={mv.tipo} tamanho={20} />
              <span className="desc">
                <b>{mv.descricao || rotulo(mv.tipo).nome}</b>
                <small>
                  {rotulo(mv.tipo).nome}
                  {mv.recorrencia_id ? ` · repete${mv.total ? ` · ${mv.posicao}/${mv.total}` : ''}` : ''}
                </small>
                <ChipsTags ids={mv.tag_ids} pequeno />
              </span>
              <span className="valor">{moeda(mv.valor)}</span>
            </button>
          ))}
          {mostrarPrevisao && (
            <div className="mov" style={{ cursor: 'default' }}>
              <PrevisaoIcone tamanho={20} />
              <span className="desc">
                <b>previsão de diário</b>
                <small>sai quando você lança um diário neste dia</small>
              </span>
              <span className="valor suave">{moeda(resumo.diarios)}</span>
            </div>
          )}
          {movs.length === 0 && !mostrarPrevisao && (
            <div className="vazio-gaveta">
              <button onClick={(e) => onAdicionar(e.currentTarget)} aria-label="Adicionar neste dia">
                <IconeMais />
              </button>
              nada {filtro ? `de ${rotulo(filtro).plural} ` : ''}por aqui ainda.
              <br />
              toque no + para adicionar.
            </div>
          )}

          {resumo && (
            <div className={`saldo-gaveta${resumo.saldo < -0.004 ? ' neg' : ''}`}>
              <span>saldo do dia</span>
              <span>{moeda(resumo.saldo)}</span>
            </div>
          )}
          {dia <= hoje && (
            <button className="botao" style={{ width: '100%' }} aria-pressed={feito} onClick={() => marcarCheckin(dia, !feito)}>
              {feito ? 'dia conferido ✓' : 'marcar dia como conferido'}
            </button>
          )}
        </div>
      </aside>
    </>
  );
}
