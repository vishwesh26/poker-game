-- Create profiles table linked to Supabase Auth
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  username text unique,
  avatar_url text,
  chips_balance bigint default 10000,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  
  primary key (id)
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Create policies for profiles
create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );


-- Create rooms table
create table public.rooms (
  id uuid default gen_random_uuid() primary key,
  code text unique not null,
  is_private boolean default false,
  game_type text default 'FAKE', -- FAKE or REAL
  game_name text default 'POKER', -- POKER or TEEN_PATTI
  entry_amount integer default 0, -- INR value of the 10k chips
  max_players integer default 6,
  small_blind integer default 10,
  big_blind integer default 20,
  host_id uuid references public.profiles(id),
  status text default 'waiting', -- waiting, active, finished
  settlements jsonb default '[]', -- List of players who left and their net win/loss
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.rooms enable row level security;

-- Create policies for rooms
create policy "Rooms are viewable by everyone."
  on rooms for select
  using ( true );

create policy "Authenticated users can create rooms"
  on rooms for insert
  with check ( auth.uid() is not null );

create policy "Room hosts can update their rooms"
  on rooms for update
  using ( auth.uid() = host_id );

-- Create trigger to automatically create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
