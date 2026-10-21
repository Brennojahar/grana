import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { BarraTitulo } from '../componentes/BarraTitulo';
import {
  IconeAjuda,
  IconeBaixar,
  IconeCartao,
  IconeCartaoMais,
  IconeCheck,
  IconeChevronBaixo,
  IconeChevronDir,
  IconeDinheiro,
  IconeEngrenagem,
  IconeFechar,
  IconeKebab,
  IconeLapis,
  IconeLua,
  IconeMais,
  IconeNuvem,
  IconePessoa,
  IconeRecomecar,
  IconeRepetir,
  IconeSair,
  IconeSol,
  IconeSubir,
  PrevisaoIcone,
  TipoIcone,
} from '../componentes/Icones';
import { vazio } from '../lib/armazem';
import { rotuloDia, somarDias } from '../lib/datas';
import { useGrana } from '../lib/estado';
import { lerValor, moeda, valorParaCampo } from '../lib/formato';
import { ehArquivoExportado, paraDados } from '../lib/importar';
import { previsaoDiaria, totalPrevisaoMensal } from '../lib/motor';
import { rotulo } from '../lib/rotulos';
import type { Cartao, Dados, ItemPrevisao, Recorrencia } from '../lib/tipos';

/* ---------- peças comuns ---------- */

function LinhaMenu({ para, icone, children, onClick, perigo }: { para?: string; icone: ReactNode; children: ReactNode; onClick?(): void; perigo?: boolean }) {
  const conteudo = (
    <>
      {icone}
      <span className="desc">{children}</span>
      <span className="fim">
        <IconeChevronDir />
      </span>
    </>
  );
  if (para) {
    return (
      <Link to={para} className={`linha-caixa${perigo ? ' perigo' : ''}`}>
        {conteudo}
      </Link>
    );
  }
  return (
    <button className={`linha-caixa${perigo ? ' perigo' : ''}`} onClick={onClick}>
      {conteudo}
    </button>
  );
}

function ModalSimples({ titulo, onFechar, children, rodape }: { titulo: string; onFechar(): void; children: ReactNode; rodape: ReactNode }) {
  const fechar = useRef(onFechar);
  fechar.current = onFechar;
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && fechar.current();
    window.addEventListener('keydown', tecla);
    return () => window.removeEventListener('keydown', tecla);
  }, []);
  return (
    <div className="fundo-modal" onMouseDown={(e) => e.target === e.currentTarget && onFechar()}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="cabeca-modal">
          <h2>{titulo}</h2>
          <button type="button" className="icone-botao" onClick={onFechar} aria-label="Fechar">
            <IconeFechar />
          </button>
        </div>
        <div className="corpo-modal">{children}</div>
        <div className="rodape-modal">{rodape}</div>
      </div>
    </div>
  );
}

function BotaoConfirmar({ rotulo: texto, onConfirmar }: { rotulo: string; onConfirmar(): void }) {
  const [armado, setArmado] = useState(false);
  useEffect(() => {
    if (!armado) return;
    const t = window.setTimeout(() => setArmado(false), 3000);
    return () => window.clearTimeout(t);
  }, [armado]);
  return (
    <button type="button" className="botao" onClick={() => (armado ? onConfirmar() : setArmado(true))}>
      {armado ? 'toque de novo para confirmar' : texto}
    </button>
  );
}

/* ---------- menu ---------- */

export function Menu() {
  const { dados, email, modo, sair } = useGrana();
  return (
    <>
      <BarraTitulo titulo="menu" />
      <div className="pagina estreita">
        <div className="perfil-nome">{dados.perfil.nome || 'você'}</div>
        <div className="perfil-email">{email ?? 'sem conta, só neste navegador'}</div>
        <span className={`selo${modo === 'local' ? ' local' : ''}`}>
          {modo === 'nuvem' ? (
            <>
              <IconeCheck /> sincronizado
            </>
          ) : (
            'modo local'
          )}
        </span>
        <div className="caixa">
          <LinhaMenu para="/menu/perfil" icone={<IconePessoa />}>
            editar perfil
          </LinhaMenu>
          <LinhaMenu para="/menu/previsao-diario" icone={<PrevisaoIcone tamanho={20} />}>
            previsão de diário
          </LinhaMenu>
          <LinhaMenu para="/menu/cartoes" icone={<IconeCartao />}>
            cartões de crédito
          </LinhaMenu>
          <LinhaMenu para="/menu/repeticoes" icone={<IconeRepetir />}>
            repetições
          </LinhaMenu>
          <LinhaMenu para="/menu/configuracoes" icone={<IconeEngrenagem />}>
            configurações
          </LinhaMenu>
          <LinhaMenu para="/menu/ajuda" icone={<IconeAjuda />}>
            ajuda
          </LinhaMenu>
          {modo === 'nuvem' && (
            <LinhaMenu icone={<IconeSair />} onClick={sair} perigo>
              sair
            </LinhaMenu>
          )}
        </div>
      </div>
    </>
  );
}

/* ---------- editar perfil ---------- */

export function Perfil() {
  const { dados, email, salvarPerfil } = useGrana();
  const [nome, setNome] = useState(dados.perfil.nome);
  const [salvo, setSalvo] = useState(false);
  return (
    <>
      <BarraTitulo titulo="editar perfil" voltar="/menu" />
      <form
        className="pagina estreita"
        onSubmit={(e) => {
          e.preventDefault();
          salvarPerfil({ ...dados.perfil, nome: nome.trim() });
          setSalvo(true);
        }}
      >
        <label className="campo">
          <span>nome</span>
          <input value={nome} onChange={(e) => (setNome(e.target.value), setSalvo(false))} autoComplete="given-name" />
        </label>
        {email && (
          <label className="campo">
            <span>e-mail</span>
            <input value={email} disabled />
          </label>
        )}
        <button className="botao cheio" style={{ width: '100%', marginTop: 8 }}>
          {salvo ? 'salvo ✓' : 'salvar'}
        </button>
      </form>
    </>
  );
}

/* ---------- previsão de diário ---------- */

export function PrevisaoDiario() {
  const { dados, mudar, salvarPerfil } = useGrana();
  const [editando, setEditando] = useState<ItemPrevisao | 'novo' | null>(null);
  return (
    <>
      <BarraTitulo titulo="previsão de diário" voltar="/menu" />
      <div className="pagina estreita">
        <div className="rotulo">
          gastos mensais
          <button onClick={() => setEditando('novo')} aria-label="Adicionar gasto mensal">
            <IconeMais />
          </button>
        </div>
        <div className="caixa">
          {dados.previsao.map((i) => (
            <div className="linha-caixa" key={i.id}>
              <span className="forte desc">{i.descricao}</span>
              <span className="fim">
                {moeda(i.valor)}
                <button className="icone-botao" onClick={() => setEditando(i)} aria-label={`Editar ${i.descricao}`}>
                  <IconeKebab />
                </button>
              </span>
            </div>
          ))}
          {dados.previsao.length === 0 && <p className="meta" style={{ padding: 16, margin: 0 }}>Adicione quanto você gasta por mês com comida, transporte, lazer…</p>}
        </div>

        <div className="total-previsao">
          <div className="par">
            <b>total mensal</b>
            <span>{moeda(totalPrevisaoMensal(dados))}</span>
          </div>
          <div className="par">
            <b>dividido por</b>
            <label className="pilula-select">
              {dados.perfil.divisor_dias} dias
              <IconeChevronBaixo />
              <select
                value={dados.perfil.divisor_dias}
                onChange={(e) => salvarPerfil({ ...dados.perfil, divisor_dias: Number(e.target.value) })}
                aria-label="Dividir por quantos dias"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n} {n === 1 ? 'dia' : 'dias'}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="resultado">{moeda(previsaoDiaria(dados))}</div>
        </div>
      </div>

      {editando && (
        <ModalItemPrevisao
          item={editando === 'novo' ? null : editando}
          onFechar={() => setEditando(null)}
          onSalvar={(item) => mudar({ salvar: { previsao_itens: [item] }, apagar: {} })}
          onApagar={(id) => mudar({ salvar: {}, apagar: { previsao_itens: [id] } })}
        />
      )}
    </>
  );
}

function ModalItemPrevisao({ item, onFechar, onSalvar, onApagar }: { item: ItemPrevisao | null; onFechar(): void; onSalvar(i: ItemPrevisao): void; onApagar(id: string): void }) {
  const [desc, setDesc] = useState(item?.descricao ?? '');
  const [valor, setValor] = useState(item ? valorParaCampo(item.valor) : '');
  const v = lerValor(valor);
  const ok = desc.trim() && Number.isFinite(v) && v >= 0;
  return (
    <ModalSimples
      titulo={item ? 'editar gasto' : 'novo gasto'}
      onFechar={onFechar}
      rodape={
        <>
          <button
            className="botao-acao"
            style={{ '--cor': 'var(--diario)' } as React.CSSProperties}
            disabled={!ok}
            onClick={() => {
              onSalvar({ id: item?.id ?? crypto.randomUUID(), descricao: desc.trim(), valor: v });
              onFechar();
            }}
          >
            salvar
          </button>
          {item && (
            <BotaoConfirmar
              rotulo="apagar"
              onConfirmar={() => {
                onApagar(item.id);
                onFechar();
              }}
            />
          )}
        </>
      }
    >
      <label className="linha-form">
        <IconeLapis />
        <input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="comida, transporte, lazer…" autoFocus aria-label="Descrição" />
      </label>
      <label className="linha-form">
        <IconeDinheiro />
        <span>R$</span>
        <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" aria-label="Valor por mês" />
        <span className="direita">por mês</span>
      </label>
    </ModalSimples>
  );
}

/* ---------- cartões ---------- */

export function Cartoes() {
  const { dados, mudar } = useGrana();
  const [editando, setEditando] = useState<Cartao | 'novo' | null>(null);
  return (
    <>
      <BarraTitulo titulo="cartões de crédito" voltar="/menu" />
      <div className="pagina estreita">
        <div className="rotulo">
          cartões
          <button onClick={() => setEditando('novo')} aria-label="Adicionar cartão">
            <IconeCartaoMais />
          </button>
        </div>
        <div className="caixa">
          {dados.cartoes.map((c) => (
            <div className="linha-caixa" key={c.id} style={{ alignItems: 'flex-start' }}>
              <span className="desc">
                <span className="forte" style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <IconeCartao /> {c.nome}
                </span>
                <small style={{ marginTop: 8 }}>dia do fechamento: {c.dia_fechamento}</small>
                <small>dia do vencimento: {c.dia_vencimento}</small>
              </span>
              <button className="icone-botao" onClick={() => setEditando(c)} aria-label={`Editar ${c.nome}`}>
                <IconeKebab />
              </button>
            </div>
          ))}
          {dados.cartoes.length === 0 && <p className="meta" style={{ padding: 16, margin: 0 }}>Nenhum cartão ainda.</p>}
        </div>
      </div>
      {editando && (
        <ModalCartao
          cartao={editando === 'novo' ? null : editando}
          onFechar={() => setEditando(null)}
          onSalvar={(c) => mudar({ salvar: { cartoes: [c] }, apagar: {} })}
          onApagar={(id) => mudar({ salvar: {}, apagar: { cartoes: [id] } })}
        />
      )}
    </>
  );
}

const diaValido = (s: string) => Math.max(1, Math.min(31, parseInt(s, 10) || 1));

function ModalCartao({ cartao, onFechar, onSalvar, onApagar }: { cartao: Cartao | null; onFechar(): void; onSalvar(c: Cartao): void; onApagar(id: string): void }) {
  const [nome, setNome] = useState(cartao?.nome ?? '');
  const [fecha, setFecha] = useState(String(cartao?.dia_fechamento ?? ''));
  const [vence, setVence] = useState(String(cartao?.dia_vencimento ?? ''));
  const ok = nome.trim() && fecha && vence;
  return (
    <ModalSimples
      titulo={cartao ? 'editar cartão' : 'novo cartão'}
      onFechar={onFechar}
      rodape={
        <>
          <button
            className="botao-acao"
            style={{ '--cor': 'var(--cartao)', color: '#fff' } as React.CSSProperties}
            disabled={!ok}
            onClick={() => {
              onSalvar({ id: cartao?.id ?? crypto.randomUUID(), nome: nome.trim(), dia_fechamento: diaValido(fecha), dia_vencimento: diaValido(vence) });
              onFechar();
            }}
          >
            salvar
          </button>
          {cartao && (
            <BotaoConfirmar
              rotulo="apagar"
              onConfirmar={() => {
                onApagar(cartao.id);
                onFechar();
              }}
            />
          )}
        </>
      }
    >
      <label className="linha-form">
        <IconeCartao />
        <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="nome do cartão" autoFocus aria-label="Nome do cartão" />
      </label>
      <label className="linha-form">
        <span>dia do fechamento</span>
        <input inputMode="numeric" value={fecha} onChange={(e) => setFecha(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="1" style={{ textAlign: 'right' }} />
      </label>
      <label className="linha-form">
        <span>dia do vencimento</span>
        <input inputMode="numeric" value={vence} onChange={(e) => setVence(e.target.value.replace(/\D/g, '').slice(0, 2))} placeholder="10" style={{ textAlign: 'right' }} />
      </label>
    </ModalSimples>
  );
}

/* ---------- repetições ---------- */

const FREQ: Record<Recorrencia['frequencia'], string> = { diaria: 'todo dia', semanal: 'toda semana', mensal: 'todo mês', anual: 'todo ano' };

export function Repeticoes() {
  const { dados, hoje, mudar } = useGrana();
  return (
    <>
      <BarraTitulo titulo="repetições" voltar="/menu" />
      <div className="pagina estreita">
        <div className="rotulo">o que se repete</div>
        <div className="caixa">
          {dados.recorrencias.map((r) => {
            const encerrada = !!r.fim && r.fim < hoje;
            return (
              <div className="linha-caixa" key={r.id}>
                <TipoIcone tipo={r.tipo} tamanho={20} />
                <span className="desc">
                  <span className="forte">{r.descricao || rotulo(r.tipo).nome}</span> · {moeda(r.valor)}
                  <small>
                    {FREQ[r.frequencia]} desde {rotuloDia(r.inicio)}
                    {r.ocorrencias ? ` · ${r.ocorrencias} vezes` : ''}
                    {r.fim ? ` · até ${rotuloDia(r.fim)}` : !r.ocorrencias ? ' · sem fim' : ''}
                  </small>
                </span>
                <span className="fim" style={{ flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                  {!encerrada && (
                    <button
                      className="botao-texto"
                      onClick={() => mudar({ salvar: { recorrencias: [{ ...r, fim: somarDias(hoje, -1) < r.inicio ? r.inicio : somarDias(hoje, -1) }] }, apagar: {} })}
                    >
                      encerrar hoje
                    </button>
                  )}
                </span>
              </div>
            );
          })}
          {dados.recorrencias.length === 0 && <p className="meta" style={{ padding: 16, margin: 0 }}>Nada se repete ainda. Ao adicionar, escolha "todo mês" para criar uma repetição.</p>}
        </div>
        <p className="meta" style={{ marginTop: 14 }}>
          Para mudar o valor de uma repetição a partir de um mês, toque nela na grade de saldos e escolha "esta e as próximas".
        </p>
      </div>
    </>
  );
}

/* ---------- configurações ---------- */

type Tema = 'light' | 'dark' | 'auto';

function lerTema(): Tema {
  try {
    const t = localStorage.getItem('grana:tema');
    return t === 'light' || t === 'dark' ? t : 'auto';
  } catch {
    return 'auto';
  }
}

export function Configuracoes() {
  const { dados, hoje, importar } = useGrana();
  const [tema, setTema] = useState<Tema>(lerTema);
  const [pendente, setPendente] = useState<Dados | null>(null);
  const [msg, setMsg] = useState('');
  const arquivo = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tema === 'auto') document.documentElement.removeAttribute('data-theme');
    else document.documentElement.setAttribute('data-theme', tema);
    try {
      if (tema === 'auto') localStorage.removeItem('grana:tema');
      else localStorage.setItem('grana:tema', tema);
    } catch {
      /* sem armazenamento */
    }
  }, [tema]);

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

  const opcao = (valor: Tema, icone: ReactNode, texto: string) => (
    <button className="linha-caixa" onClick={() => setTema(valor)} aria-pressed={tema === valor}>
      {icone}
      <span className="desc">{texto}</span>
      <span className="fim">{tema === valor && <IconeCheck />}</span>
    </button>
  );

  return (
    <>
      <BarraTitulo titulo="configurações" voltar="/menu" />
      <div className="pagina estreita">
        <div className="rotulo">aparência</div>
        <div className="caixa">
          {opcao('light', <IconeSol />, 'modo claro')}
          {opcao('dark', <IconeLua />, 'modo escuro')}
          {opcao('auto', <IconeNuvem />, 'usar configuração do sistema')}
        </div>

        <div className="rotulo" style={{ marginTop: 28 }}>
          meus dados
        </div>
        <input ref={arquivo} type="file" accept="application/json,.json" hidden onChange={(e) => e.target.files?.[0] && lerArquivo(e.target.files[0])} />
        <div className="caixa">
          <button className="linha-caixa" onClick={() => arquivo.current?.click()}>
            <IconeSubir />
            <span className="desc">
              importar arquivo
              <small>traz uma exportação da conta antiga ou um backup do grana</small>
            </span>
          </button>
          <button className="linha-caixa" onClick={baixarBackup}>
            <IconeBaixar />
            <span className="desc">
              baixar backup
              <small>salva tudo num arquivo .json</small>
            </span>
          </button>
          <button className="linha-caixa" onClick={() => setPendente({ ...vazio(), perfil: dados.perfil })}>
            <IconeRecomecar />
            <span className="desc">
              zerar minha conta
              <small>apaga todas as movimentações e recomeça do zero</small>
            </span>
          </button>
        </div>

        {pendente && (
          <div className="aviso" style={{ margin: '14px 0' }}>
            <span>
              {pendente.lancamentos.length || pendente.recorrencias.length
                ? `${pendente.lancamentos.length} lançamentos, ${pendente.recorrencias.length} repetições, ${pendente.cartoes.length} cartões e ${pendente.previsao.length} gastos mensais. Substituir tudo o que está aqui?`
                : 'Apagar todas as movimentações, cartões e previsões?'}
            </span>
            <span style={{ display: 'flex', gap: 8 }}>
              <button className="botao" onClick={() => setPendente(null)}>
                não
              </button>
              <button
                className="botao cheio"
                onClick={async () => {
                  await importar(pendente);
                  setMsg(pendente.lancamentos.length || pendente.recorrencias.length ? 'Importado.' : 'Conta zerada.');
                  setPendente(null);
                }}
              >
                sim
              </button>
            </span>
          </div>
        )}
        {msg && <p className="meta">{msg}</p>}
      </div>
    </>
  );
}

/* ---------- ajuda ---------- */

export function Ajuda() {
  return (
    <>
      <BarraTitulo titulo="ajuda" voltar="/menu" />
      <div className="pagina estreita ajuda-artigo">
        <h2>como o saldo de cada dia é calculado?</h2>
        <p>
          O saldo é o acumulado de tudo o que entrou menos tudo o que saiu até aquele dia: entradas − saídas − diários − economias − cartão. Ele começa no primeiro lançamento que
          você fez.
        </p>
        <h2>o que é a previsão de diário?</h2>
        <p>
          É quanto você costuma gastar no dia a dia (comida, transporte, lazer). Você informa os gastos do mês em menu → previsão de diário, e o total dividido pelos dias vira um
          gasto previsto em cada dia futuro. Quando você lança um diário de verdade num dia, a previsão daquele dia sai da conta.
        </p>
        <h2>performance, economizado, custo de vida e diário médio</h2>
        <p>
          <b>Custo de vida</b> = saídas + diários + cartão (mais a previsão nos dias que faltam). <b>Performance</b> = entradas − custo de vida − economias: o que sobrou livre.{' '}
          <b>Economizado</b> = economias ÷ entradas. <b>Diário médio</b> = diários lançados ÷ dias que já passaram no mês.
        </p>
        <h2>como funcionam as tags?</h2>
        <p>
          Tags agrupam movimentações de qualquer tipo (viagem, casa, filhos…). Marque uma ou mais ao adicionar ou editar, e veja quanto cada tag movimentou no mês em tags. No
          avançado de cada tag, você escolhe se as movimentações dela entram nos saldos, na performance, no economizado, no custo de vida e no diário médio. Apagar uma tag só
          tira a etiqueta: as movimentações continuam.
        </p>
        <h2>o que é conferir o dia?</h2>
        <p>Toque no número do dia na grade de saldos para marcar que você já revisou os gastos dele. O dia ganha um canto verde.</p>
        <h2>como instalar no iPhone?</h2>
        <p>Abra o grana no Safari, toque em Compartilhar e depois em "Adicionar à Tela de Início". Ele abre em tela cheia, como um app.</p>
      </div>
    </>
  );
}
