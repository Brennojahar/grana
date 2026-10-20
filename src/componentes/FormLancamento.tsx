import { useState } from 'react';
import { rotuloDia } from '../lib/datas';
import { useGrana } from '../lib/estado';
import { lerValor, moeda, valorParaCampo } from '../lib/formato';
import { apagar, criar, editar, type Escopo } from '../lib/operacoes';
import type { Dia, Frequencia, Movimento, Tipo } from '../lib/tipos';
import { Folha } from './Folha';

export const TIPOS: { tipo: Tipo; nome: string; dica: string }[] = [
  { tipo: 'entrada', nome: 'Entrada', dica: 'dinheiro que chega' },
  { tipo: 'saida', nome: 'Saída', dica: 'contas e gastos fixos' },
  { tipo: 'diario', nome: 'Diário', dica: 'gasto do dia a dia; no dia lançado, substitui a previsão' },
  { tipo: 'cartao', nome: 'Cartão', dica: 'fatura ou compra no cartão' },
  { tipo: 'economia', nome: 'Economia', dica: 'o que você separou para guardar' },
];

const FREQUENCIAS: { f: Frequencia | ''; nome: string }[] = [
  { f: '', nome: 'Não repete' },
  { f: 'mensal', nome: 'Todo mês' },
  { f: 'semanal', nome: 'Toda semana' },
  { f: 'anual', nome: 'Todo ano' },
  { f: 'diaria', nome: 'Todo dia' },
];

const ESCOPOS: { e: Escopo; nome: string }[] = [
  { e: 'esta', nome: 'Só esta' },
  { e: 'seguintes', nome: 'Esta e as próximas' },
  { e: 'todas', nome: 'Todas' },
];

type Props = { onFechar(): void } & ({ novo: { data: Dia; tipo?: Tipo } } | { mov: Movimento });

export function FormLancamento(props: Props) {
  const { dados, mudar } = useGrana();
  const mov = 'mov' in props ? props.mov : null;
  const recorrente = !!mov?.recorrencia_id;

  const [tipo, setTipo] = useState<Tipo>(mov?.tipo ?? ('novo' in props ? props.novo.tipo : undefined) ?? 'saida');
  const [valor, setValor] = useState(mov ? valorParaCampo(mov.valor) : '');
  const [descricao, setDescricao] = useState(mov?.descricao ?? '');
  const [data, setData] = useState<Dia>(mov?.data ?? ('novo' in props ? props.novo.data : ''));
  const [cartao, setCartao] = useState<string>(mov?.cartao_id ?? dados.cartoes[0]?.id ?? '');
  const [freq, setFreq] = useState<Frequencia | ''>('');
  const [vezes, setVezes] = useState('');
  const [semFim, setSemFim] = useState(true);
  const [dividir, setDividir] = useState(false);
  const [escopo, setEscopo] = useState<Escopo>('esta');
  const [confirmarApagar, setConfirmarApagar] = useState(false);
  const [erro, setErro] = useState('');

  const numeroValor = lerValor(valor);
  const nVezes = semFim ? null : Math.max(2, Math.min(999, parseInt(vezes, 10) || 0));
  const dica = TIPOS.find((t) => t.tipo === tipo)?.dica;

  function salvar() {
    if (!Number.isFinite(numeroValor) || numeroValor < 0) return setErro('Digite um valor.');
    if (!data) return setErro('Escolha a data.');
    if (freq && !semFim && !(parseInt(vezes, 10) >= 2)) return setErro('Quantas vezes? Pelo menos 2.');
    const campos = { data, tipo, valor: numeroValor, descricao: descricao.trim(), cartao_id: tipo === 'cartao' ? cartao || null : null };
    const m = mov ? editar(dados, mov, campos, escopo) : criar(campos, freq ? { frequencia: freq, vezes: nVezes, dividir: dividir && !!nVezes } : null);
    mudar(m);
    props.onFechar();
  }

  function remover() {
    if (!mov) return;
    mudar(apagar(dados, mov, escopo));
    props.onFechar();
  }

  const posicao = mov?.posicao ? (mov.total ? `${mov.posicao} de ${mov.total}` : `${mov.posicao}ª vez`) : null;

  return (
    <Folha
      titulo={mov ? 'Editar' : 'Lançar'}
      meta={mov ? [rotuloDia(mov.data), recorrente ? `repete · ${posicao ?? ''}` : null].filter(Boolean).join(' · ') : 'novo lançamento'}
      onFechar={props.onFechar}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          salvar();
        }}
      >
        <div className="campo">
          <span className="meta">Tipo</span>
          <div className="chips" role="radiogroup">
            {TIPOS.map((t) => (
              <button type="button" key={t.tipo} className="botao" aria-pressed={tipo === t.tipo} onClick={() => setTipo(t.tipo)}>
                {t.nome}
              </button>
            ))}
          </div>
          <span className="meta suave">{dica}</span>
        </div>

        <label className="campo campo-valor">
          <span className="meta">Valor (R$)</span>
          <input data-foco inputMode="decimal" placeholder="0,00" value={valor} onChange={(e) => setValor(e.target.value)} autoComplete="off" />
        </label>

        <label className="campo">
          <span className="meta">Descrição</span>
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="aluguel, mercado, salário…" maxLength={80} />
        </label>

        <div className="dupla">
          <label className="campo">
            <span className="meta">Data</span>
            <input type="date" value={data} onChange={(e) => setData(e.target.value)} required />
          </label>
          {tipo === 'cartao' ? (
            <label className="campo">
              <span className="meta">Cartão</span>
              <select value={cartao} onChange={(e) => setCartao(e.target.value)}>
                <option value="">Sem cartão</option>
                {dados.cartoes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nome}
                  </option>
                ))}
              </select>
            </label>
          ) : !mov ? (
            <label className="campo">
              <span className="meta">Repetir</span>
              <select value={freq} onChange={(e) => setFreq(e.target.value as Frequencia | '')}>
                {FREQUENCIAS.map((f) => (
                  <option key={f.f} value={f.f}>
                    {f.nome}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div />
          )}
        </div>

        {tipo === 'cartao' && !mov && (
          <label className="campo">
            <span className="meta">Repetir</span>
            <select value={freq} onChange={(e) => setFreq(e.target.value as Frequencia | '')}>
              {FREQUENCIAS.map((f) => (
                <option key={f.f} value={f.f}>
                  {f.nome}
                </option>
              ))}
            </select>
          </label>
        )}

        {freq && !mov && (
          <div className="campo">
            <label className="marcador">
              <input type="checkbox" checked={semFim} onChange={(e) => setSemFim(e.target.checked)} />
              Sem data para acabar
            </label>
            {!semFim && (
              <>
                <label className="campo" style={{ marginBottom: 6 }}>
                  <span className="meta">Quantas vezes</span>
                  <input inputMode="numeric" value={vezes} onChange={(e) => setVezes(e.target.value.replace(/\D/g, ''))} placeholder="12" />
                </label>
                <label className="marcador">
                  <input type="checkbox" checked={dividir} onChange={(e) => setDividir(e.target.checked)} />
                  O valor é o total: dividir entre as vezes
                </label>
                {dividir && nVezes && Number.isFinite(numeroValor) && (
                  <span className="meta suave">
                    {nVezes}× de {moeda(Math.round((numeroValor / nVezes) * 100) / 100)}
                  </span>
                )}
              </>
            )}
          </div>
        )}

        {recorrente && (
          <div className="campo">
            <span className="meta">Aplicar em</span>
            <div className="chips">
              {ESCOPOS.map((x) => (
                <button type="button" key={x.e} className="botao" aria-pressed={escopo === x.e} onClick={() => setEscopo(x.e)}>
                  {x.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        {erro && (
          <div className="aviso cheio meta" role="alert">
            {erro}
          </div>
        )}

        {confirmarApagar ? (
          <div className="aviso">
            <span className="meta">
              Apagar {recorrente ? ESCOPOS.find((x) => x.e === escopo)!.nome.toLowerCase() : 'este lançamento'}?
            </span>
            <span className="acoes" style={{ margin: 0 }}>
              <button type="button" className="botao" onClick={() => setConfirmarApagar(false)}>
                Não
              </button>
              <button type="button" className="botao cheio" onClick={remover}>
                Apagar
              </button>
            </span>
          </div>
        ) : (
          <div className="acoes">
            {mov && (
              <button type="button" className="botao" onClick={() => setConfirmarApagar(true)}>
                Apagar
              </button>
            )}
            <button type="submit" className="botao cheio">
              Salvar
            </button>
          </div>
        )}
      </form>
    </Folha>
  );
}
