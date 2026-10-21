-- grana.com — tags.
-- Cada pessoa cria as próprias tags (nome, cor e em quais cálculos as movimentações com ela entram)
-- e marca lançamentos e repetições com uma lista de tags.

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 40),
  cor text not null default 'cinza',
  conta_saldo boolean not null default true,
  conta_performance boolean not null default true,
  conta_economizado boolean not null default true,
  conta_custo_vida boolean not null default true,
  conta_diario_medio boolean not null default true,
  criado_em timestamptz not null default now()
);

alter table public.lancamentos add column tag_ids uuid[] not null default '{}';
alter table public.recorrencias add column tag_ids uuid[] not null default '{}';

alter table public.tags enable row level security;
create policy "dono le" on public.tags for select to authenticated using (user_id = (select auth.uid()));
create policy "dono cria" on public.tags for insert to authenticated with check (user_id = (select auth.uid()));
create policy "dono altera" on public.tags for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "dono apaga" on public.tags for delete to authenticated using (user_id = (select auth.uid()));

-- Apagar uma tag só tira a etiqueta: as movimentações continuam, sem ela.
create function public.tirar_tag_apagada() returns trigger
language plpgsql set search_path = '' as $$
begin
  update public.lancamentos set tag_ids = array_remove(tag_ids, old.id) where user_id = old.user_id and old.id = any (tag_ids);
  update public.recorrencias set tag_ids = array_remove(tag_ids, old.id) where user_id = old.user_id and old.id = any (tag_ids);
  return old;
end $$;

create trigger ao_apagar_tag after delete on public.tags
for each row execute function public.tirar_tag_apagada();
