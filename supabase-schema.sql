-- Klienti / Psi
create table clients (
  id uuid primary key default gen_random_uuid(),
  owner_name text not null,
  dog_name text not null,
  breed text,
  dog_age text,
  phone text,
  behavior_notes text,
  tips_notes text,
  created_at timestamptz default now()
);

-- Termíny
create table appointments (
  id uuid primary key default gen_random_uuid(),
  client_id uuid references clients(id) on delete cascade,
  scheduled_at timestamptz not null,
  duration_minutes int default 60,
  came_dirty boolean default false,
  price numeric(8,2),
  notes text,
  created_at timestamptz default now()
);

-- Index na rýchle načítanie termínov podľa dátumu
create index on appointments (scheduled_at);
create index on appointments (client_id);

-- RLS (Row Level Security) - všetci môžu čítať/písať (bez loginu)
alter table clients enable row level security;
alter table appointments enable row level security;

create policy "allow all" on clients for all using (true) with check (true);
create policy "allow all" on appointments for all using (true) with check (true);
