import { useState } from 'react';
import { useGrana } from '../lib/estado';
import { supabase } from '../lib/supabase';

type Modo = 'entrar' | 'criar' | 'esqueci';

const voltarPara = () => `${location.origin}${import.meta.env.BASE_URL}`;

export function Entrar() {
  const { recuperandoSenha, fimRecuperacao } = useGrana();
  const [modo, setModo] = useState<Modo>('entrar');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [msg, setMsg] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (!supabase) return;
    setOcupado(true);
    setMsg('');
    try {
      if (recuperandoSenha) {
        const { error } = await supabase.auth.updateUser({ password: senha });
        if (error) throw error;
        fimRecuperacao();
        return;
      }
      if (modo === 'entrar') {
        const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
        if (error) throw error;
      } else if (modo === 'criar') {
        const { data, error } = await supabase.auth.signUp({ email, password: senha, options: { data: { nome: nome.trim() }, emailRedirectTo: voltarPara() } });
        if (error) throw error;
        if (!data.session) setMsg('Conta criada. Abra o e-mail de confirmação e depois entre aqui.');
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: voltarPara() });
        if (error) throw error;
        setMsg('Se esse e-mail tiver conta, chegou um link para criar uma senha nova.');
      }
    } catch (err) {
      setMsg(traduzir((err as Error).message));
    } finally {
      setOcupado(false);
    }
  }

  const titulo = recuperandoSenha ? 'Nova senha' : modo === 'entrar' ? 'Entrar' : modo === 'criar' ? 'Criar conta' : 'Esqueci a senha';

  return (
    <main className="entrar">
      <div className="marca">
        grana<span>.com</span>
      </div>
      <form className="entrar-corpo" onSubmit={enviar}>
        <h1 className="titulo">{titulo}</h1>
        <div>
          {modo === 'criar' && !recuperandoSenha && (
            <label className="campo">
              <span className="meta">Nome</span>
              <input value={nome} onChange={(e) => setNome(e.target.value)} autoComplete="given-name" />
            </label>
          )}
          {!recuperandoSenha && (
            <label className="campo">
              <span className="meta">E-mail</span>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </label>
          )}
          {modo !== 'esqueci' && (
            <label className="campo">
              <span className="meta">{recuperandoSenha ? 'Senha nova' : 'Senha'}</span>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                autoComplete={modo === 'entrar' && !recuperandoSenha ? 'current-password' : 'new-password'}
                minLength={8}
                required
              />
            </label>
          )}
          {msg && <p className="aviso meta">{msg}</p>}
          <div className="acoes">
            <button className="botao cheio" disabled={ocupado}>
              {ocupado ? '…' : recuperandoSenha ? 'Salvar senha' : modo === 'esqueci' ? 'Enviar link' : titulo}
            </button>
          </div>
        </div>
        {!recuperandoSenha && (
          <div className="chips">
            {modo !== 'entrar' && (
              <button type="button" className="botao-texto" onClick={() => setModo('entrar')}>
                Já tenho conta
              </button>
            )}
            {modo !== 'criar' && (
              <button type="button" className="botao-texto" onClick={() => setModo('criar')}>
                Criar conta
              </button>
            )}
            {modo !== 'esqueci' && (
              <button type="button" className="botao-texto" onClick={() => setModo('esqueci')}>
                Esqueci a senha
              </button>
            )}
          </div>
        )}
      </form>
      <span className="meta suave">seu dinheiro, dia a dia</span>
    </main>
  );
}

function traduzir(m: string): string {
  if (/invalid login/i.test(m)) return 'E-mail ou senha não conferem.';
  if (/not confirmed/i.test(m)) return 'Confirme o e-mail antes de entrar (veja sua caixa de entrada).';
  if (/already registered/i.test(m)) return 'Esse e-mail já tem conta. Entre ou use "Esqueci a senha".';
  if (/password should be/i.test(m)) return 'A senha precisa ter pelo menos 8 caracteres.';
  if (/rate limit/i.test(m)) return 'Muitas tentativas. Espere um pouco e tente de novo.';
  return m;
}
