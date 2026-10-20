import { BrowserRouter, NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ProvedorFolhas, useFolhas } from './componentes/Folhas';
import { diaDaSemana, rotuloDia } from './lib/datas';
import { ProvedorGrana, useGrana } from './lib/estado';
import { Ajustes } from './telas/Ajustes';
import { Entrar } from './telas/Entrar';
import { Hoje } from './telas/Hoje';
import { Mes } from './telas/Mes';
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
        <Route element={<Moldura />}>
          <Route index element={<Hoje />} />
          <Route path="mes" element={<Mes />} />
          <Route path="mes/:mes" element={<Mes />} />
          <Route path="totais" element={<Totais />} />
          <Route path="totais/:ano" element={<Totais />} />
          <Route path="ajustes" element={<Ajustes />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </ProvedorFolhas>
  );
}

const LINKS = [
  { to: '/', nome: 'Hoje', fim: true },
  { to: '/mes', nome: 'Mês' },
  { to: '/totais', nome: 'Totais' },
  { to: '/ajustes', nome: 'Ajustes' },
];

function Moldura() {
  const { hoje, carregando, erro, limparErro, modo } = useGrana();
  const { lancar } = useFolhas();

  return (
    <div className="app">
      <header className="topo">
        <NavLink to="/" className="marca" aria-label="grana.com, início">
          grana<span>.com</span>
        </NavLink>
        <nav className="nav-topo meta" aria-label="Principal">
          {LINKS.map((l) => (
            <NavLink key={l.to} to={l.to} end={l.fim}>
              {l.nome}
            </NavLink>
          ))}
          <button className="botao-lancar" onClick={() => lancar()}>
            + Lançar
          </button>
        </nav>
        <div className="topo-info meta">
          {diaDaSemana(hoje)}
          <br />
          {rotuloDia(hoje)}
          {modo === 'local' && (
            <>
              <br />
              <span className="suave">modo local</span>
            </>
          )}
        </div>
      </header>

      {erro && (
        <div className="aviso cheio" role="alert">
          <span className="meta">{erro}</span>
          <button className="botao-texto" onClick={limparErro}>
            Ok
          </button>
        </div>
      )}

      <main>{carregando ? <div className="carregando meta">carregando…</div> : <Outlet />}</main>

      <nav className="navegacao meta" aria-label="Principal">
        {LINKS.slice(0, 2).map((l) => (
          <NavLink key={l.to} to={l.to} end={l.fim}>
            {l.nome}
          </NavLink>
        ))}
        <button className="botao-lancar" onClick={() => lancar()} aria-label="Lançar">
          +
        </button>
        {LINKS.slice(2).map((l) => (
          <NavLink key={l.to} to={l.to}>
            {l.nome}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
