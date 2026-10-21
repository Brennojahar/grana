import { BrowserRouter, Link, NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ProvedorFolhas, useFolhas } from './componentes/Folhas';
import { IconeAjustes, IconeHorizonte, IconeMais, IconeSaldos, IconeTotais } from './componentes/Icones';
import { ProvedorGrana, useGrana } from './lib/estado';
import { Ajustes } from './telas/Ajustes';
import { Entrar } from './telas/Entrar';
import { Horizonte } from './telas/Horizonte';
import { Saldos } from './telas/Saldos';
import { Totais } from './telas/Totais';

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
          <Route path="totais" element={<Totais />} />
          <Route path="horizonte" element={<Horizonte />} />
          <Route path="ajustes" element={<Ajustes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ProvedorFolhas>
  );
}

const LINKS = [
  { to: '/', nome: 'saldos', Icone: IconeSaldos, fim: true },
  { to: '/totais', nome: 'totais', Icone: IconeTotais },
  { to: '/horizonte', nome: 'horizonte', Icone: IconeHorizonte },
  { to: '/ajustes', nome: 'ajustes', Icone: IconeAjustes },
];

function Casca() {
  const { carregando, erro, limparErro, modo, email } = useGrana();
  const { lancar } = useFolhas();

  return (
    <div className="casca">
      <nav className="lateral" aria-label="Principal">
        <Link to="/" className="marca">
          <span>
            grana<span>.com</span>
          </span>
        </Link>
        {LINKS.map(({ to, nome, Icone, fim }) => (
          <NavLink key={to} to={to} end={fim}>
            <Icone />
            {nome}
          </NavLink>
        ))}
        <hr />
        <button onClick={() => lancar()}>
          <IconeMais />
          lançar
        </button>
        <div className="rodape meta">{modo === 'local' ? 'modo local, só neste navegador' : email}</div>
      </nav>

      <div className="conteudo">
        {erro && (
          <div className="aviso cheio" role="alert">
            <span className="meta">{erro}</span>
            <button className="botao-texto" onClick={limparErro}>
              ok
            </button>
          </div>
        )}
        <main>{carregando ? <div className="carregando meta">carregando…</div> : <Outlet />}</main>
      </div>

      <nav className="navegacao" aria-label="Principal">
        {LINKS.slice(0, 2).map(({ to, nome, Icone, fim }) => (
          <NavLink key={to} to={to} end={fim}>
            <Icone />
            {nome}
          </NavLink>
        ))}
        <button className="botao-lancar" onClick={() => lancar()} aria-label="Lançar">
          +
        </button>
        {LINKS.slice(2).map(({ to, nome, Icone }) => (
          <NavLink key={to} to={to}>
            <Icone />
            {nome}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
