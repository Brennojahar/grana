-- grana.com — esquema inicial.
-- Aplicada pela integração do Supabase com o GitHub a cada push no main.
-- Se precisar aplicar à mão: cole este arquivo inteiro no SQL Editor e clique em Run.
-- Cada pessoa só enxerga e altera as próprias linhas (Row Level Security).

create type public.tipo_movimento as enum ('entrada', 'saida', 'diario', 'economia', 'cartao');
create type public.frequencia as enum ('diaria', 'semanal', 'mensal', 'anual');

create table public.perfis (
  user_id uuid primary key references auth.users (id) on delete cascade,
  nome text not null default '',
  divisor_dias int not null default 30 check (divisor_dias between 1 and 31),
  criado_em timestamptz not null default now()
);

create table public.cartoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  nome text not null,
  dia_fechamento int not null check (dia_fechamento between 1 and 31),
  dia_vencimento int not null check (dia_vencimento between 1 and 31),
  criado_em timestamptz not null default now()
);

create table public.recorrencias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  tipo public.tipo_movimento not null,
  descricao text not null default '',
  valor numeric(14, 2) not null check (valor >= 0),
  frequencia public.frequencia not null,
  inicio date not null,
  ocorrencias int check (ocorrencias is null or ocorrencias between 1 and 999),
  fim date,
  cartao_id uuid references public.cartoes (id) on delete set null,
  criado_em timestamptz not null default now()
);

create table public.lancamentos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  data date not null,
  tipo public.tipo_movimento not null,
  valor numeric(14, 2) not null check (valor >= 0),
  descricao text not null default '',
  cartao_id uuid references public.cartoes (id) on delete set null,
  -- Quando preenchidos, este lançamento substitui (ou apaga, se pulado) uma ocorrência da série.
  recorrencia_id uuid references public.recorrencias (id) on delete cascade,
  ocorrencia date,
  pulado boolean not null default false,
  criado_em timestamptz not null default now(),
  check ((recorrencia_id is null) = (ocorrencia is null))
);

create unique index lancamentos_ocorrencia_unica on public.lancamentos (recorrencia_id, ocorrencia) where recorrencia_id is not null;
create index lancamentos_user_data on public.lancamentos (user_id, data);

create table public.previsao_itens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  descricao text not null,
  valor numeric(14, 2) not null check (valor >= 0),
  criado_em timestamptz not null default now()
);

create table public.checkins (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  dia date not null,
  primary key (user_id, dia)
);

-- Segurança: cada tabela só deixa a pessoa logada mexer nas próprias linhas.
do $$
declare t text;
begin
  foreach t in array array['perfis', 'cartoes', 'recorrencias', 'lancamentos', 'previsao_itens', 'checkins'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "dono le" on public.%I for select to authenticated using (user_id = (select auth.uid()))', t);
    execute format('create policy "dono cria" on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t);
    execute format('create policy "dono altera" on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t);
    execute format('create policy "dono apaga" on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t);
  end loop;
end $$;

-- Cria o perfil automaticamente quando alguém se cadastra.
create function public.criar_perfil() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.perfis (user_id, nome) values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', ''));
  return new;
end $$;

create trigger ao_criar_usuario after insert on auth.users
for each row execute function public.criar_perfil();
