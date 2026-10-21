import { useEffect, useRef, useState } from 'react';
import { BarraTitulo } from '../componentes/BarraTitulo';
import { nomeTipo } from '../componentes/Folhas';
import { TipoIcone } from '../componentes/Icones';
import { Valor } from '../componentes/Valor';
import { rotuloDia, somarDias } from '../lib/datas';
import { useGrana } from '../lib/estado';
import { lerValor, moeda, valorParaCampo } from '../lib/formato';
import { ehArquivoExportado, paraDados } from '../lib/importar';
import { previsaoDiaria, totalPrevisaoMensal } from '../lib/motor';
import type { Cartao, Dados, ItemPrevisao, Recorrencia } from '../lib/tipos';

const FREQ: Record<Recorrencia['frequencia'], string> = { diaria: 'todo dia', semanal: 'toda semana', mensal: 'todo mês', anual: 'todo ano' };

export function Ajustes() {
  const { dados, hoje, mudar, salvarPerfil, importar, modo, email, sair } = useGrana();
  const [nome, setNome] = useState(dados.perfil.nome);
  const [divisor, setDivisor] = useState(String(dados.perfil.divisor_dias));
  const [msg, setMsg] = useState('');
  const [pendente, setPendente] = useState<Dados | null>(null);
  const arquivo = useRef<HTMLInputElement>(null);

  useEffect(() => setNome(dados.perfil.nome), [dados.perfil.nome]);
  useEffect(() => setDivisor(String(dados.perfil.divisor_dias)), [dados.perfil.divisor_dias]);
  useEffect(() => {
    if (location.hash) document.querySelector(location.hash)?.scrollIntoView();
  }, []);

  const salvarDivisor = () => {
    const n = Math.max(1, Math.min(31, parseInt(divisor, 10) || 30));
    setDivisor(String(n));
    if (n !== dados.perfil.divisor_dias) salvarPerfil({ ...dados.perfil, divisor_dias: n });
  };

  async function lerArquivo(f: File) {
    setMsg('');
    try {
      const json = JSON.parse(await f.text());
      if (ehArquivoExportado(json)) setPendente(paraDados(json, dados.perfil.nome));
      else if (json?.grana === 1 && json.dados) setPendente(json.dados as Dados);
      else setMsg('Esse arquivo não parece uma exportação nem um backup do grana.');
    } catch {
      setMsg('Não consegui ler esse arquivo.');
    }
  }

  function baixarBackup() {
    const blob = new Blob([JSON.stringify({ grana: 1, exportado_em: new Date().toISOString(), dados }, null, 1)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `grana-backup-${hoje}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  return (
    <>
      <BarraTitulo titulo="ajustes" />

      <section className="secao" id="previsao" style={{ paddingTop: 4 }}>
        <div className="cabeca-secao">
          <h2 className="subtitulo">Previsão diária</h2>
          <span className="meta-num">{moeda(previsaoDiaria(dados))}/dia</span>
        </div>
        <p className="meta suave" style={{ maxWidth: 560, marginTop: 0 }}>
          Quanto você costuma gastar no mês com o dia a dia. O total dividido pelos dias vira o gasto previsto de cada dia futuro, até você lançar o real.
        </p>
        <ul className="lista">
          {dados.previsao.map((i) => (
            <LinhaPrevisao key={i.id} item={i} />
          ))}
        </ul>
        <div className="acoes" style={{ maxWidth: 520 }}>
          <button
            className="botao"
            onClick={() => mudar({ salvar: { previsao_itens: [{ id: crypto.randomUUID(), descricao: 'Novo item', valor: 0 }] }, apagar: {} })}
          >
            + Item
          </button>
        </div>
        <div className="dupla" style={{ marginTop: 18, maxWidth: 520 }}>
          <div className="campo">
            <span className="meta">Total no mês</span>
            <span className="meta-num" style={{ padding: '10px 0' }}>
              {moeda(totalPrevisaoMensal(dados))}
            </span>
          </div>
          <label className="campo">
            <span className="meta">Dividir por (dias)</span>
            <input inputMode="numeric" value={divisor} onChange={(e) => setDivisor(e.target.value.replace(/\D/g, ''))} onBlur={salvarDivisor} />
          </label>
        </div>
      </section>

      <section className="secao">
        <div className="cabeca-secao">
          <h2 className="subtitulo">Cartões</h2>
          <button
            className="botao-texto"
            onClick={() => mudar({ salvar: { cartoes: [{ id: crypto.randomUUID(), nome: 'novo cartão', dia_fechamento: 1, dia_vencimento: 10 }] }, apagar: {} })}
          >
            + Cartão
          </button>
        </div>
        <ul className="lista">
          {dados.cartoes.map((c) => (
            <LinhaCartao key={c.id} cartao={c} />
          ))}
          {dados.cartoes.length === 0 && <li className="vazio meta suave">Nenhum cartão.</li>}
        </ul>
      </section>

      <section className="secao">
        <div className="cabeca-secao">
          <h2 className="subtitulo">Repetições</h2>
          <span className="meta suave">{dados.recorrencias.length}</span>
        </div>
        <ul className="lista">
          {dados.recorrencias.map((r) => {
            const encerrada = !!r.fim && r.fim < hoje;
            return (
              <li key={r.id} className="item">
                <TipoIcone tipo={r.tipo} />
                <span className="item-desc">
                  {r.descricao || nomeTipo(r.tipo)} · <Valor v={r.valor} />
                  <span className="meta suave">
                    {nomeTipo(r.tipo)} · {FREQ[r.frequencia]} desde {rotuloDia(r.inicio)}
                    {r.ocorrencias ? ` · ${r.ocorrencias} vezes` : ''}
                    {r.fim ? ` · até ${rotuloDia(r.fim)}` : !r.ocorrencias ? ' · sem fim' : ''}
                  </span>
                </span>
                <span className="chips">
                  {!encerrada && (
                    <button className="botao-texto" onClick={() => mudar({ salvar: { recorrencias: [{ ...r, fim: somarDias(hoje, -1) < r.inicio ? r.inicio : somarDias(hoje, -1) }] }, apagar: {} })}>
                      Encerrar hoje
                    </button>
                  )}
                  <BotaoConfirmar rotulo="Apagar" onConfirmar={() => mudar({ salvar: {}, apagar: { recorrencias: [r.id] } })} />
                </span>
              </li>
            );
          })}
          {dados.recorrencias.length === 0 && <li className="vazio meta suave">Nada se repete ainda.</li>}
        </ul>
      </section>

      <section className="secao" id="dados">
        <div className="cabeca-secao">
          <h2 className="subtitulo">Seus dados</h2>
        </div>
        <p className="meta suave" style={{ maxWidth: 560, marginTop: 0 }}>
          Importe o arquivo exportado da sua conta antiga ou um backup do grana. Importar substitui tudo o que está aqui.
        </p>
        <input ref={arquivo} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && lerArquivo(e.target.files[0])} />
        <div className="acoes" style={{ maxWidth: 520 }}>
          <button className="botao" onClick={() => arquivo.current?.click()}>
            Importar arquivo
          </button>
          <button className="botao" onClick={baixarBackup}>
            Baixar backup
          </button>
        </div>
        {pendente && (
          <div className="aviso">
            <span className="meta">
              {pendente.lancamentos.length} lançamentos, {pendente.recorrencias.length} repetições, {pendente.cartoes.length} cartões e {pendente.previsao.length} itens de previsão. Substituir tudo?
            </span>
            <span className="acoes" style={{ margin: 0 }}>
              <button className="botao" onClick={() => setPendente(null)}>
                Não
              </button>
              <button
                className="botao cheio"
                onClick={async () => {
                  await importar(pendente);
                  setPendente(null);
                  setMsg('Importado.');
                }}
              >
                Importar
              </button>
            </span>
          </div>
        )}
        {msg && <p className="meta">{msg}</p>}
      </section>

      <section className="secao">
        <div className="cabeca-secao">
          <h2 className="subtitulo">Conta</h2>
        </div>
        <div className="dupla" style={{ maxWidth: 520 }}>
          <label className="campo">
            <span className="meta">Seu nome</span>
            <input value={nome} onChange={(e) => setNome(e.target.value)} onBlur={() => nome !== dados.perfil.nome && salvarPerfil({ ...dados.perfil, nome: nome.trim() })} />
          </label>
          <SeletorTema />
        </div>
        <p className="meta suave">
          {modo === 'nuvem' ? `Sincronizado na nuvem como ${email}.` : 'Modo local: os dados ficam só neste navegador. Configure o Supabase para sincronizar entre aparelhos.'}
        </p>
        {modo === 'nuvem' && (
          <div className="acoes" style={{ maxWidth: 260 }}>
            <button className="botao" onClick={sair}>
              Sair
            </button>
          </div>
        )}
      </section>
    </>
  );
}

function LinhaPrevisao({ item }: { item: ItemPrevisao }) {
  const { mudar } = useGrana();
  const [desc, setDesc] = useState(item.descricao);
  const [valor, setValor] = useState(valorParaCampo(item.valor));
  const salvar = () => {
    const v = lerValor(valor);
    const novo = { ...item, descricao: desc.trim() || 'Item', valor: Number.isFinite(v) ? v : 0 };
    setValor(valorParaCampo(novo.valor));
    if (novo.descricao !== item.descricao || novo.valor !== item.valor) mudar({ salvar: { previsao_itens: [novo] }, apagar: {} });
  };
  return (
    <li className="item" style={{ gridTemplateColumns: '1fr 120px auto', alignItems: 'center' }}>
      <input className="item-desc" aria-label="Descrição" value={desc} onChange={(e) => setDesc(e.target.value)} onBlur={salvar} style={{ background: 'none', border: 0, padding: 0 }} />
      <input
        className="item-valor"
        aria-label="Valor no mês"
        inputMode="decimal"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        onBlur={salvar}
        style={{ background: 'none', border: 0, padding: 0, textAlign: 'right', width: '100%' }}
      />
      <button className="remover" aria-label={`Remover ${item.descricao}`} onClick={() => mudar({ salvar: {}, apagar: { previsao_itens: [item.id] } })}>
        ×
      </button>
    </li>
  );
}

function LinhaCartao({ cartao }: { cartao: Cartao }) {
  const { mudar } = useGrana();
  const [c, setC] = useState(cartao);
  const salvar = (novo: Cartao) => {
    const limpo = { ...novo, nome: novo.nome.trim() || 'cartão', dia_fechamento: dia(novo.dia_fechamento), dia_vencimento: dia(novo.dia_vencimento) };
    setC(limpo);
    if (JSON.stringify(limpo) !== JSON.stringify(cartao)) mudar({ salvar: { cartoes: [limpo] }, apagar: {} });
  };
  return (
    <li className="item" style={{ gridTemplateColumns: '1fr auto auto auto', alignItems: 'center' }}>
      <input aria-label="Nome do cartão" className="item-desc" value={c.nome} onChange={(e) => setC({ ...c, nome: e.target.value })} onBlur={() => salvar(c)} style={{ background: 'none', border: 0, padding: 0 }} />
      <label className="meta">
        fecha{' '}
        <input inputMode="numeric" value={c.dia_fechamento} onChange={(e) => setC({ ...c, dia_fechamento: Number(e.target.value.replace(/\D/g, '')) })} onBlur={() => salvar(c)} style={{ width: 28, background: 'none', border: 0, borderBottom: '1px solid var(--linha-forte)' }} />
      </label>
      <label className="meta">
        vence{' '}
        <input inputMode="numeric" value={c.dia_vencimento} onChange={(e) => setC({ ...c, dia_vencimento: Number(e.target.value.replace(/\D/g, '')) })} onBlur={() => salvar(c)} style={{ width: 28, background: 'none', border: 0, borderBottom: '1px solid var(--linha-forte)' }} />
      </label>
      <BotaoConfirmar rotulo="×" rotuloAcessivel={`Remover ${cartao.nome}`} onConfirmar={() => mudar({ salvar: {}, apagar: { cartoes: [cartao.id] } })} />
    </li>
  );
}

const dia = (n: number) => Math.max(1, Math.min(31, Math.trunc(n) || 1));

function BotaoConfirmar({ rotulo, rotuloAcessivel, onConfirmar }: { rotulo: string; rotuloAcessivel?: string; onConfirmar(): void }) {
  const [armado, setArmado] = useState(false);
  useEffect(() => {
    if (!armado) return;
    const t = window.setTimeout(() => setArmado(false), 3000);
    return () => window.clearTimeout(t);
  }, [armado]);
  return (
    <button
      className={rotulo === '×' && !armado ? 'remover' : 'botao-texto'}
      aria-label={armado ? 'Confirmar' : rotuloAcessivel}
      onClick={() => (armado ? onConfirmar() : setArmado(true))}
    >
      {armado ? 'Confirmar?' : rotulo}
    </button>
  );
}

function SeletorTema() {
  const [tema, setTema] = useState(() => {
    try {
      return localStorage.getItem('grana:tema') ?? 'auto';
    } catch {
      return 'auto';
    }
  });
  useEffect(() => {
    if (tema === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', tema);
    try {
      localStorage.setItem('grana:tema', tema);
    } catch {
      /* sem armazenamento */
    }
  }, [tema]);
  return (
    <label className="campo">
      <span className="meta">Tema</span>
      <select value={tema} onChange={(e) => setTema(e.target.value)}>
        <option value="auto">Igual ao aparelho</option>
        <option value="light">Claro</option>
        <option value="dark">Escuro</option>
      </select>
    </label>
  );
}
