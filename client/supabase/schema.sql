-- Run this in your Supabase SQL editor to set up the database

create table if not exists games (
  id uuid default gen_random_uuid() primary key,
  tx_hash text not null,
  player_x_lock text not null,
  player_o_lock text,
  stake_amount bigint not null,
  status text not null default 'waiting',
  winner text,
  created_at timestamptz default now(),
  finished_at timestamptz
);

create index if not exists idx_games_player_x on games(player_x_lock);
create index if not exists idx_games_player_o on games(player_o_lock);
create index if not exists idx_games_status on games(status);
create index if not exists idx_games_created_at on games(created_at desc);

-- Enable RLS
alter table games enable row level security;

-- Allow anyone to read games (public leaderboard/history)
create policy "Games are viewable by everyone"
  on games for select using (true);

-- Allow anyone to insert (client records game events)
create policy "Anyone can insert games"
  on games for insert with check (true);

-- Allow anyone to update (client updates game status)
create policy "Anyone can update games"
  on games for update using (true);

-- Leaderboard view (precomputed stats)
create or replace view leaderboard as
select
  lock_hash,
  count(*) filter (where result = 'win') as wins,
  count(*) filter (where result = 'loss') as losses,
  count(*) filter (where result = 'draw') as draws,
  count(*) as total_games,
  coalesce(sum(stake), 0) as total_staked,
  round(
    count(*) filter (where result = 'win')::numeric /
    nullif(count(*)::numeric, 0) * 100, 1
  ) as win_rate
from (
  -- Player X perspective
  select
    player_x_lock as lock_hash,
    stake_amount as stake,
    case
      when winner = 'x' then 'win'
      when winner = 'o' then 'loss'
      when winner = 'draw' then 'draw'
      else null
    end as result
  from games
  where status = 'finished' and winner is not null

  union all

  -- Player O perspective
  select
    player_o_lock as lock_hash,
    stake_amount as stake,
    case
      when winner = 'o' then 'win'
      when winner = 'x' then 'loss'
      when winner = 'draw' then 'draw'
      else null
    end as result
  from games
  where status = 'finished' and winner is not null and player_o_lock is not null
) stats
group by lock_hash
order by wins desc, win_rate desc;
