import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { diaDaSemana, rotuloDia } from '../lib/datas';
import { useGrana } from '../lib/estado';
import { movimentos, resumoDiario } from '../lib/motor';
import type { Dia, Movimento, Tipo } from '../lib/tipos';
import { Folha } from './Folha';
import { FormLancamento, TIPOS } from './FormLancamento';
import { TipoIcone } from './Icones';
import { Valor } from './Valor';

type Aberta = { qual: 'novo'; data: Dia; tipo?: Tipo } | { qual: 'editar'; mov: Movimento } | { qual: 'dia'; dia: Dia } | null;

interface Folhas {
  lancar(data?: Dia, tipo?: Tipo): void;
  editarMov(mov: Movimento): void;
  verDia(dia: Dia): void;
}

const Contexto = createContext<Folhas | null>(null);

export function useFolhas(): Folhas {
  const c = useContext(Contexto);
  if (!c) throw new Error('useFolhas fora do ProvedorFolhas');
  return c;
}

export const nomeTipo = (t: Tipo) => TIPOS.find((x) => x.tipo === t)!.nome;

export function ProvedorFolhas({ children }: { children: ReactNode }) {
  const { hoje } = useGrana();
  const [aberta, setAberta] = useState<Aberta>(null);
  const api = useMemo<Folhas>(
    () => ({
      lancar: (data, tipo) => setAberta({ qual: 'novo', data: data ?? hoje, tipo }),
      editarMov: (mov) => setAberta({ qual: 'editar', mov }),
      verDia: (dia) => setAberta({ qual: 'dia', dia }),
    }),
    [hoje],
  );
  const fechar = () => setAberta(null);

  return (
    <Contexto.Provider value={api}>
      {children}
      {aberta?.qual === 'novo' && <FormLancamento novo={{ data: aberta.data, tipo: aberta.tipo }} onFechar={fechar} />}
      {aberta?.qual === 'editar' && <FormLancamento mov={aberta.mov} onFechar={fechar} />}
      {aberta?.qual === 'dia' && <DiaDetalhe dia={aberta.dia} onFechar={fechar} abrir={setAberta} />}
    </Contexto.Provider>
  );
}

function DiaDetalhe({ dia, onFechar, abrir }: { dia: Dia; onFechar(): void; abrir(a: Aberta): void }) {
  const { dados, hoje, marcarCheckin } = useGrana();
  const movs = movimentos(dados, dia, dia);
  const resumo = resumoDiario(dados, dia, dia, hoje)[0];
  const feito = dados.checkins.includes(dia);

  return (
    <Folha titulo={rotuloDia(dia)} meta={`${diaDaSemana(dia)}${dia === hoje ? ' · hoje' : ''}`} onFechar={onFechar}>
      <ul className="lista">
        {movs.map((m) => (
          <li key={m.chave}>
            <button className="item" onClick={() => abrir({ qual: 'editar', mov: m })}>
              <TipoIcone tipo={m.tipo} />
              <span className="item-desc">
                {m.descricao || nomeTipo(m.tipo)}
                <span className="meta suave">
                  {nomeTipo(m.tipo)}
                  {m.recorrencia_id ? ` · repete${m.total ? ` · ${m.posicao}/${m.total}` : ''}` : ''}
                </span>
              </span>
              <span className="item-valor">
                {m.tipo === 'entrada' ? '+' : '−'}
                <Valor v={m.valor} />
              </span>
            </button>
          </li>
        ))}
        {resumo?.diarioPrevisto && (
          <li className="item">
            <TipoIcone tipo="diario" apagado />
            <span className="item-desc previsto">
              previsão de gasto diário
              <span className="meta suave">some quando você lança um diário neste dia</span>
            </span>
            <span className="item-valor previsto">
              −<Valor v={resumo.diarios} />
            </span>
          </li>
        )}
        {movs.length === 0 && !resumo?.diarioPrevisto && <li className="vazio meta suave">Nada lançado neste dia.</li>}
      </ul>

      <div className="linha-topo" style={{ marginTop: 18 }}>
        <span className="meta">saldo no fim do dia</span>
        <span className="meta-num">
          <Valor v={resumo?.saldo ?? 0} />
        </span>
      </div>

      <div className="acoes">
        {dia <= hoje && (
          <button className="botao" aria-pressed={feito} onClick={() => marcarCheckin(dia, !feito)}>
            {feito ? 'dia conferido ✓' : 'conferi este dia'}
          </button>
        )}
        <button className="botao cheio" onClick={() => abrir({ qual: 'novo', data: dia })}>
          lançar neste dia
        </button>
      </div>
    </Folha>
  );
}
