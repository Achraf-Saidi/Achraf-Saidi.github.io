-- BALEYETTE · Supabase schema
-- Run once in Supabase SQL Editor (project owner). Enable email auth.
-- This database stores only public sport-venue *city* coordinates.
-- Weight and age are self-declared, not medically/legally verified.

create table if not exists public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 alias text not null check (char_length(alias) between 2 and 40),
 city text not null,
 level text not null check (level in ('débutant','intermédiaire','confirmé')),
 weight_class integer not null check (weight_class between 35 and 220),
 sports text[] not null default '{}',
 age_confirmed boolean not null check (age_confirmed = true),
 created_at timestamptz not null default now()
);

create table if not exists public.events (
 id bigint generated always as identity primary key,
 host_id uuid not null references public.profiles(id) on delete cascade,
 host_name text not null check (char_length(host_name) between 2 and 80),
 title text not null check (char_length(title) between 4 and 90),
 discipline text not null check (discipline in ('MMA','Boxe','Kickboxing','JJB','Muay thaï','Judo','Grappling','Lutte')),
 kind text not null check (kind in ('technique','sparring')),
 start_time timestamptz not null,
 duration_minutes integer not null check (duration_minutes between 30 and 180),
 city text not null,
 venue text not null check (char_length(venue) between 4 and 140),
 lat numeric(9,6),
 lng numeric(9,6),
 level text not null check (level in ('tous','débutant','intermédiaire','confirmé')),
 capacity integer not null check (capacity between 2 and 60),
 joined_count integer not null default 0 check (joined_count >= 0),
 weight_min integer not null check (weight_min between 35 and 200),
 weight_max integer not null check (weight_max between 36 and 220),
 coach_name text not null check (char_length(coach_name) >= 2),
 referee_name text not null default '',
 gear text not null default '',
 notes text not null default '',
 created_at timestamptz not null default now(),
 constraint weight_range_valid check(weight_min < weight_max),
 constraint sparring_requires_referee check(kind <> 'sparring' or char_length(trim(referee_name)) >= 2)
);

create index if not exists ix_events_start on public.events(start_time);
create index if not exists ix_events_city_sport on public.events(city,discipline);

create table if not exists public.registrations (
 event_id bigint not null references public.events(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key (event_id,user_id)
);

create table if not exists public.groups (
 id bigint generated always as identity primary key,
 owner_id uuid not null references public.profiles(id) on delete cascade,
 owner_name text not null,
 name text not null check (char_length(name) between 3 and 70),
 description text not null check (char_length(description) between 15 and 300),
 discipline text not null,
 city text not null,
 member_count integer not null default 0 check(member_count >= 0),
 created_at timestamptz not null default now()
);

create table if not exists public.group_members (
 group_id bigint not null references public.groups(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(),
 primary key(group_id,user_id)
);

create table if not exists public.messages (
 id bigint generated always as identity primary key,
 group_id bigint not null references public.groups(id) on delete cascade,
 user_id uuid not null references public.profiles(id) on delete cascade,
 alias text not null,
 body text not null check (char_length(trim(body)) between 1 and 500),
 created_at timestamptz not null default now()
);

create index if not exists ix_messages_group_created on public.messages(group_id,created_at desc);

create table if not exists public.reports (
 id bigint generated always as identity primary key,
 event_id bigint not null references public.events(id) on delete cascade,
 reporter_id uuid not null references public.profiles(id) on delete cascade,
 reason text not null check(reason in ('danger','harassment','fake','privacy')),
 details text not null default '' check(char_length(details) <= 500),
 created_at timestamptz not null default now()
);

-- Event registration lock makes the capacity check safe under concurrent joins.
-- SECURITY DEFINER functions have a fixed search_path, and no user data is exposed.
create or replace function public.baleyette_enforce_registration()
returns trigger language plpgsql security definer set search_path = public, pg_temp
as $$
declare e public.events%rowtype; p public.profiles%rowtype;
begin
 if TG_OP='INSERT' then
   select * into e from public.events where id=NEW.event_id for update;
   if not found then raise exception 'Séance introuvable.'; end if;
   select * into p from public.profiles where id=NEW.user_id;
   if not found or not p.age_confirmed then raise exception 'Profil majeur requis.'; end if;
   if NEW.user_id=e.host_id then raise exception 'Organisateur déjà responsable de la séance.'; end if;
   if e.start_time<=now() then raise exception 'Séance déjà commencée.'; end if;
   if e.joined_count>=e.capacity then raise exception 'Séance complète.'; end if;
   if e.kind='sparring' and (p.weight_class<e.weight_min or p.weight_class>e.weight_max)
     then raise exception 'Catégorie de poids incompatible.'; end if;
   update public.events set joined_count=joined_count+1 where id=e.id;
   return NEW;
 else
   update public.events set joined_count=greatest(0,joined_count-1) where id=OLD.event_id;
   return OLD;
 end if;
end;
$$;
drop trigger if exists trg_baleyette_registration on public.registrations;
create trigger trg_baleyette_registration before insert or delete on public.registrations
for each row execute function public.baleyette_enforce_registration();

create or replace function public.baleyette_group_member_count()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
 if TG_OP='INSERT' then
  update public.groups set member_count=member_count+1 where id=NEW.group_id;
  return NEW;
 else
  update public.groups set member_count=greatest(0,member_count-1) where id=OLD.group_id;
  return OLD;
 end if;
end;
$$;
drop trigger if exists trg_baleyette_group_count on public.group_members;
create trigger trg_baleyette_group_count before insert or delete on public.group_members
for each row execute function public.baleyette_group_member_count();

create or replace function public.baleyette_join_creator()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
 insert into public.group_members(group_id,user_id) values(NEW.id,NEW.owner_id)
 on conflict do nothing;
 return NEW;
end;
$$;
drop trigger if exists trg_baleyette_join_creator on public.groups;
create trigger trg_baleyette_join_creator after insert on public.groups
for each row execute function public.baleyette_join_creator();

create or replace function public.baleyette_check_event_creation()
returns trigger language plpgsql security definer set search_path = public, pg_temp as $$
begin
 if NEW.start_time<=now()+interval '10 minutes'
 then raise exception 'Prévois une date au moins 10 minutes dans le futur.'; end if;
 return NEW;
end;
$$;
drop trigger if exists trg_baleyette_create_event on public.events;
create trigger trg_baleyette_create_event before insert on public.events
for each row execute function public.baleyette_check_event_creation();

-- RLS: profiles private to their owners; session and group summaries intentionally public.
alter table public.profiles enable row level security;
alter table public.events enable row level security;
alter table public.registrations enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.messages enable row level security;
alter table public.reports enable row level security;

drop policy if exists "Own profile read" on public.profiles;
create policy "Own profile read" on public.profiles for select to authenticated using (id=auth.uid());
drop policy if exists "Own profile insert" on public.profiles;
create policy "Own profile insert" on public.profiles for insert to authenticated with check(id=auth.uid() and age_confirmed=true);
drop policy if exists "Own profile update" on public.profiles;
create policy "Own profile update" on public.profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid() and age_confirmed=true);

drop policy if exists "Public events read" on public.events;
create policy "Public events read" on public.events for select to anon,authenticated using(true);
drop policy if exists "Adults create events" on public.events;
create policy "Adults create events" on public.events for insert to authenticated
with check(host_id=auth.uid() and exists(select 1 from public.profiles where id=auth.uid() and age_confirmed=true));
drop policy if exists "Hosts delete events" on public.events;
create policy "Hosts delete events" on public.events for delete to authenticated using(host_id=auth.uid());

drop policy if exists "Read own registrations" on public.registrations;
create policy "Read own registrations" on public.registrations for select to authenticated using(user_id=auth.uid());
drop policy if exists "Join own event slot" on public.registrations;
create policy "Join own event slot" on public.registrations for insert to authenticated
with check(user_id=auth.uid() and exists(select 1 from public.profiles where id=auth.uid() and age_confirmed=true));
drop policy if exists "Cancel own registration" on public.registrations;
create policy "Cancel own registration" on public.registrations for delete to authenticated using(user_id=auth.uid());

drop policy if exists "Public groups read" on public.groups;
create policy "Public groups read" on public.groups for select to anon,authenticated using(true);
drop policy if exists "Adults create groups" on public.groups;
create policy "Adults create groups" on public.groups for insert to authenticated
with check(owner_id=auth.uid() and exists(select 1 from public.profiles where id=auth.uid() and age_confirmed=true));
drop policy if exists "Owners delete groups" on public.groups;
create policy "Owners delete groups" on public.groups for delete to authenticated using(owner_id=auth.uid());

drop policy if exists "Read own memberships" on public.group_members;
create policy "Read own memberships" on public.group_members for select to authenticated using(user_id=auth.uid());
drop policy if exists "Join as self" on public.group_members;
create policy "Join as self" on public.group_members for insert to authenticated
with check(user_id=auth.uid() and exists(select 1 from public.profiles where id=auth.uid() and age_confirmed=true));
drop policy if exists "Leave as self" on public.group_members;
create policy "Leave as self" on public.group_members for delete to authenticated using(user_id=auth.uid());

drop policy if exists "Members read messages" on public.messages;
create policy "Members read messages" on public.messages for select to authenticated
using(exists(select 1 from public.group_members gm where gm.group_id=messages.group_id and gm.user_id=auth.uid()));
drop policy if exists "Members write messages" on public.messages;
create policy "Members write messages" on public.messages for insert to authenticated
with check(user_id=auth.uid() and exists(select 1 from public.group_members gm where gm.group_id=messages.group_id and gm.user_id=auth.uid()));

drop policy if exists "Only send own reports" on public.reports;
create policy "Only send own reports" on public.reports for insert to authenticated
with check(reporter_id=auth.uid() and exists(select 1 from public.profiles where id=auth.uid() and age_confirmed=true));

-- Least privilege for browser clients. Counters are maintained only by trigger functions.
revoke all on public.profiles,public.events,public.registrations,public.groups,public.group_members,public.messages,public.reports from anon,authenticated;
grant usage on schema public to anon,authenticated;
grant select on public.events,public.groups to anon,authenticated;
grant select,insert,update on public.profiles to authenticated;
grant insert,delete,select on public.registrations to authenticated;
grant insert,delete on public.events to authenticated;
grant insert,delete on public.groups to authenticated;
grant insert,delete,select on public.group_members to authenticated;
grant select,insert on public.messages to authenticated;
grant insert on public.reports to authenticated;
grant usage,select on sequence public.events_id_seq, public.groups_id_seq, public.messages_id_seq, public.reports_id_seq to authenticated;

-- No client SELECT grant for reports: moderation uses Supabase server-side admin.
-- Production: configure abuse prevention, account confirmation, rate limits,
-- human moderation, coach verification, and incident response before opening.
