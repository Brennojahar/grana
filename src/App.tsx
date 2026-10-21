import { useState } from 'react';
import { BrowserRouter, Link, NavLink, Navigate, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ProvedorFolhas, useFolhas } from './componentes/Folhas';
import { IconeAdicionar, IconeHoje, IconeHorizonte, IconeMenu, IconeRecolher, IconeSaldos, IconeTags, IconeTotais } from './componentes/Icones';
import { partes } from './lib/datas';
import { ProvedorGrana, useGrana } from './lib/estado';
import { Entrar } from './telas/Entrar';
import { Horizonte } from './telas/Horizonte';
import { Ajuda, Cartoes, Configuracoes, Menu, Perfil, PrevisaoDiario, Repeticoes } from './telas/Menu';
import { Movimentacoes } from './telas/Movimentacoes';
import { TagDetalhe, Tags } from './telas/Tags';
import { EVENTO_IR_PRA_HOJE, Saldos } from './telas/Saldos';
import { Totais, TotaisMetrica } from './telas/Totais';

export function App() {
  return (
    <ProvedorGrana>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
        <Portao />
      </BrowserRouter>
    </ProvedorGrana>
  );
}

function Portao() {
  const { precisaEntrar, recuperandoSenha } = useGrana();
  if (precisaEntrar || recuperandoSenha) return <Entrar />;
  return (
    <ProvedorFolhas>
      <Routes>
        <Route element={<Casca />}>
          <Route index element={<Saldos />} />
          <Route path="horizonte" element={<Horizonte />} />
          <Route path="totais" element={<Totais />} />
          <Route path="totais/:metrica" element={<TotaisMetrica />} />
          <Route path="movimentacoes" element={<Movimentacoes />} />
          <Route path="tags" element={<Tags />} />
          <Route path="tags/:id" element={<TagDetalhe />} />
          <Route path="menu" element={<Menu />} />
          <Route path="menu/perfil" element={<Perfil />} />
          <Route path="menu/previsao-diario" element={<PrevisaoDiario />} />
          <Route path="menu/cartoes" element={<Cartoes />} />
          <Route path="menu/repeticoes" element={<Repeticoes />} />
          <Route path="menu/configuracoes" element={<Configuracoes />} />
          <Route path="menu/ajuda" element={<Ajuda />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ProvedorFolhas>
  );
}

const CHAVE_RECOLHIDA = 'grana:menu-recolhido';

function Casca() {
  const { carregando, erro, limparErro, hoje, email, modo } = useGrana();
  const { abrirAdicionar } = useFolhas();
  const navegar = useNavigate();
  const local = useLocation();
  const [recolhida, setRecolhida] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_RECOLHIDA) === '1';
    } catch {
      return false;
    }
  });

  const alternarRecolhida = () => {
    setRecolhida((r) => {
      try {
        localStorage.setItem(CHAVE_RECOLHIDA, r ? '0' : '1');
      } catch {
        /* sem armazenamento */
      }
      return !r;
    });
  };

  const irPraHoje = () => {
    if (local.pathname !== '/') navegar('/');
    // Espera a grade montar (se acabou de navegar) antes de pedir para centralizar.
    window.setTimeout(() => window.dispatchEvent(new Event(EVENTO_IR_PRA_HOJE)), 60);
  };

  const menuAtivo = local.pathname.startsWith('/menu');

  return (
    <div className={`casca${recolhida ? ' recolhida' : ''}`}>
      <nav className="lateral" aria-label="Principal">
        <Link to="/" className="logo" aria-label="grana.com, início">
          <span className="logo-marca">g.</span>
        </Link>
        <NavLink to="/" end className="item-nav">
          <IconeSaldos />
          <span>saldos</span>
        </NavLink>
        <NavLink to="/totais" className="item-nav">
          <IconeTotais />
          <span>totais</span>
        </NavLink>
        <NavLink to="/tags" className="item-nav">
          <IconeTags />
          <span>tags</span>
        </NavLink>
        <NavLink to="/menu" className="item-nav" aria-current={menuAtivo ? 'page' : undefined}>
          <IconeMenu />
          <span>menu</span>
        </NavLink>
        <hr />
        <button className="item-nav" onClick={(e) => abrirAdicionar(e.currentTarget)}>
          <IconeAdicionar />
          <span>adicionar</span>
        </button>
        <button className="item-nav" onClick={irPraHoje}>
          <IconeHoje dia={partes(hoje)[2]} />
          <span>ir pra hoje</span>
        </button>
        <NavLink to="/horizonte" className="item-nav">
          <IconeHorizonte />
          <span>horizonte</span>
        </NavLink>
        <div className="rodape-lateral" title={email ?? undefined}>
          {modo === 'local' ? 'modo local' : email}
        </div>
        <button className="recolher" onClick={alternarRecolhida} aria-label={recolhida ? 'Abrir menu lateral' : 'Fechar menu lateral'}>
          <IconeRecolher />
        </button>
      </nav>

      <div className="principal">
        {erro && (
          <div className="aviso erro" role="alert">
            <span>{erro}</span>
            <button className="botao-texto" onClick={limparErro}>
              ok
            </button>
          </div>
        )}
        <main>{carregando ? <div className="carregando">carregando…</div> : <Outlet />}</main>
      </div>

      <nav className="navegacao" aria-label="Principal">
        <NavLink to="/" end>
          <IconeSaldos />
          saldos
        </NavLink>
        <NavLink to="/totais">
          <IconeTotais />
          totais
        </NavLink>
        <button className="botao-lancar" onClick={() => abrirAdicionar(null)} aria-label="Adicionar">
          <svg viewBox="0 0 20 20" width={22} height={22} aria-hidden="true">
            <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" />
          </svg>
        </button>
        <NavLink to="/tags">
          <IconeTags />
          tags
        </NavLink>
        <NavLink to="/menu" aria-current={menuAtivo ? 'page' : undefined}>
          <IconeMenu />
          menu
        </NavLink>
      </nav>
    </div>
  );
}
