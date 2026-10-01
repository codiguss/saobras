-- Histórico completo de chamadas: uma chamada por turma/data e um status por aluno.
create table if not exists public.chamadas (
  id uuid primary key default gen_random_uuid(),
  turma_id uuid not null references public.turmas(id) on delete cascade,
  curso_id uuid not null references public.cursos(id) on delete restrict,
  data date not null,
  operador_id uuid references public.operadores(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint chamadas_turma_data_unique unique (turma_id, data)
);

create table if not exists public.chamada_alunos (
  id uuid primary key default gen_random_uuid(),
  chamada_id uuid not null references public.chamadas(id) on delete cascade,
  aluno_id uuid not null references public.alunos(id) on delete cascade,
  status text not null check (status in ('presente', 'falta')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint chamada_alunos_unique unique (chamada_id, aluno_id)
);

create index if not exists chamadas_turma_data_idx on public.chamadas(turma_id, data desc);
create index if not exists chamada_alunos_chamada_idx on public.chamada_alunos(chamada_id);
create index if not exists chamada_alunos_aluno_idx on public.chamada_alunos(aluno_id);

alter table public.chamadas enable row level security;
alter table public.chamada_alunos enable row level security;

drop policy if exists "chamadas_authenticated_select" on public.chamadas;
drop policy if exists "chamadas_authenticated_insert" on public.chamadas;
drop policy if exists "chamadas_authenticated_update" on public.chamadas;
drop policy if exists "chamada_alunos_authenticated_select" on public.chamada_alunos;
drop policy if exists "chamada_alunos_authenticated_insert" on public.chamada_alunos;
drop policy if exists "chamada_alunos_authenticated_update" on public.chamada_alunos;

create policy "chamadas_authenticated_select" on public.chamadas for select to authenticated using (true);
create policy "chamadas_authenticated_insert" on public.chamadas for insert to authenticated with check (true);
create policy "chamadas_authenticated_update" on public.chamadas for update to authenticated using (true) with check (true);

create policy "chamada_alunos_authenticated_select" on public.chamada_alunos for select to authenticated using (true);
create policy "chamada_alunos_authenticated_insert" on public.chamada_alunos for insert to authenticated with check (true);
create policy "chamada_alunos_authenticated_update" on public.chamada_alunos for update to authenticated using (true) with check (true);

-- Migra presenças antigas para o novo histórico quando possível.
-- Dias antigos em que só existem presenças ficam com os demais alunos como falta
-- quando forem consultados pela nova estrutura.
insert into public.chamadas (turma_id, curso_id, data, operador_id)
select distinct p.turma_id, p.curso_id, (p.data_hora at time zone 'America/Bahia')::date, p.operador_id
from public.presencas p
where p.turma_id is not null and p.curso_id is not null
on conflict (turma_id, data) do nothing;

insert into public.chamada_alunos (chamada_id, aluno_id, status)
select c.id, p.aluno_id, 'presente'
from public.presencas p
join public.chamadas c
  on c.turma_id = p.turma_id
 and c.data = (p.data_hora at time zone 'America/Bahia')::date
where p.aluno_id is not null
on conflict (chamada_id, aluno_id) do update set status = 'presente', atualizado_em = now();

-- Fonte pronta para futuros dashboards de frequência.
create or replace view public.vw_frequencia_dashboard as
select
  c.id as chamada_id,
  c.data,
  c.turma_id,
  c.curso_id,
  c.operador_id,
  ca.aluno_id,
  ca.status,
  c.criado_em,
  c.atualizado_em
from public.chamadas c
join public.chamada_alunos ca on ca.chamada_id = c.id;
