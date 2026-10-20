# grana.com

Seu dinheiro, dia a dia: saldo projetado para os próximos 12 meses, livro do mês e totais do ano.
App web instalável (PWA) com React + Vite, dados no Supabase.

## Como o saldo é calculado

- **Saldo do dia** = acumulado de entradas − saídas − diários − economias − cartão.
- **Previsão diária** = soma dos itens de previsão ÷ dias do divisor (Ajustes). Em cada dia futuro sem diário lançado, ela entra no lugar do gasto real.
- **Custo de vida** = saídas + diários + cartão. **Sobra** = entradas − custo de vida.
- Repetições são guardadas como regra (`recorrencias`). Editar ou apagar "só esta" cria um lançamento que substitui aquela ocorrência; "esta e as próximas" encerra a série e abre outra.

O motor fica em `src/lib/motor.ts`, com testes em `src/lib/motor.test.ts` (`npm test`).

## Rodar no computador

```bash
npm install
npm run dev
```

Sem `.env.local`, o app abre em **modo local**: os dados ficam só naquele navegador.

## Ligar o Supabase

1. **Project Settings → Integrations → GitHub**: escolha o repositório `Brennojahar/grana`, deixe *Supabase directory* como `.` e ligue *Deploy to production* no branch `main`. A cada push, as migrações de `supabase/migrations` são aplicadas no banco.
   Sem a integração: **SQL Editor** → cole `supabase/migrations/20261020120000_grana.sql` → **Run**.
2. **Authentication → URL Configuration**: em *Site URL*, `https://brennojahar.github.io/grana/`; em *Redirect URLs*, acrescente `http://localhost:5183/`.
3. **Project Settings → API**: a *Project URL* e a chave *anon public* vão
   - no GitHub, em **Settings → Secrets and variables → Actions → Variables**, como `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (para o site publicado);
   - num `.env.local` (para rodar no computador; modelo em `.env.example`).
4. Abra o app, crie a conta, confirme o e-mail e, em **Ajustes → Seus dados → Importar arquivo**, escolha `dados-privados/meus-dados.json`.

## Publicar

Todo push no `main` roda `.github/workflows/publicar.yml`: testes, build com `GRANA_BASE=/grana/` e publicação no GitHub Pages (em **Settings → Pages**, a fonte deve ser *GitHub Actions*). O build copia `index.html` para `404.html`, para os links diretos funcionarem.

## Instalar no iPhone

Abra o endereço publicado no **Safari** → **Compartilhar** → **Adicionar à Tela de Início**.

## Pastas

- `src/lib`: motor de cálculo, datas, armazenamento (local e Supabase) e operações de edição.
- `src/telas`: Hoje, Mês, Totais, Ajustes, Entrar.
- `src/componentes`: folha de lançamento, detalhe do dia, gráfico.
- `dados-privados/`: a exportação da conta antiga. Fica **fora do git**.
