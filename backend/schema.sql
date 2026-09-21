-- Run once in the Supabase SQL Editor, after replacing ROOM_TOKEN_SHA256.
-- Public keys identify the app; a separate 256-bit room token protects the diary.
begin;
create table if not exists public.moment_access (
  id integer primary key check (id = 1),
  token_hash text not null check (token_hash ~ '^[a-f0-9]{64}$')
);
create table if not exists public.moment_meals (
  id uuid primary key,
  data jsonb not null,
  version bigint not null default 1,
  deleted boolean not null default false
);
alter table public.moment_access enable row level security;
alter table public.moment_meals enable row level security;
revoke all on public.moment_access, public.moment_meals from public, anon, authenticated;

insert into public.moment_access(id,token_hash) values(1,'ROOM_TOKEN_SHA256') on conflict(id) do nothing;

create or replace function public.moment_sync(p_token text,p_changes jsonb default '[]'::jsonb)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  c jsonb; r jsonb; existing public.moment_meals%rowtype; rid uuid;
  expected bigint; next_version bigint; result jsonb; meal_date date;
begin
  if p_token is null or p_token !~ '^[a-f0-9]{64}$' or not exists (
    select 1 from public.moment_access where id=1 and token_hash=pg_catalog.encode(pg_catalog.sha256(pg_catalog.convert_to(p_token,'UTF8')),'hex')
  ) then raise exception 'access denied' using errcode='42501'; end if;
  if p_changes is null or pg_catalog.jsonb_typeof(p_changes)<>'array' then raise exception 'invalid changes'; end if;
  if pg_catalog.jsonb_array_length(p_changes)>1000 then raise exception 'too many changes'; end if;
  if pg_catalog.jsonb_array_length(p_changes)>0 then
    perform pg_catalog.pg_advisory_xact_lock(7442026);
  end if;
  for c in select value from pg_catalog.jsonb_array_elements(p_changes) loop
    if c->>'op' is null or c->>'op' not in ('put','delete') then raise exception 'invalid operation'; end if;
    if c->>'expected' is null or c->>'expected' !~ '^[0-9]{1,15}$' then raise exception 'invalid version'; end if;
    expected=(c->>'expected')::bigint;
    if c->>'op'='put' then
      r=c->'record';
      if r is null or pg_catalog.jsonb_typeof(r)<>'object' or exists (
        select 1 from pg_catalog.unnest(array['id','date','time','district','venue','food','note','status']) k
        where not (r ? k) or pg_catalog.jsonb_typeof(r->k)<>'string'
      ) then raise exception 'invalid record'; end if;
      if r->>'id' !~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' then raise exception 'invalid id'; end if;
      rid=(r->>'id')::uuid;
      if r->>'date' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'invalid date'; end if;
      meal_date=(r->>'date')::date;
      if r->>'time' <> '' and r->>'time' !~ '^([01]\d|2[0-3]):[0-5]\d$' then raise exception 'invalid time'; end if;
      if r->>'district' not in ('上城区','拱墅区','西湖区','滨江区','萧山区','余杭区','临平区','钱塘区','富阳区','临安区') then raise exception 'invalid district'; end if;
      if pg_catalog.char_length(r->>'venue')>80 or pg_catalog.char_length(r->>'food')>60 or pg_catalog.char_length(r->>'note')>160 or pg_catalog.btrim(r->>'food')='' then raise exception 'invalid text length'; end if;
      if r->>'status' not in ('planned','visited') then raise exception 'invalid status'; end if;
      if r->>'status'='visited' and (meal_date>(pg_catalog.now() at time zone 'Asia/Shanghai')::date or pg_catalog.btrim(r->>'venue')='') then raise exception 'invalid visit'; end if;
    else rid=(c->>'id')::uuid;
    end if;
    if rid is null then raise exception 'invalid id'; end if;
    select * into existing from public.moment_meals where id=rid for update;
    if found then
      if existing.deleted or expected<>existing.version then raise exception 'conflict: refresh the record'; end if;
      next_version=existing.version+1;
    else
      if expected<>0 or c->>'op'='delete' then raise exception 'conflict: missing record'; end if;
      if (select pg_catalog.count(*) from public.moment_meals)>=1000 then raise exception 'record limit reached'; end if;
      next_version=1;
    end if;
    if c->>'op'='delete' then
      update public.moment_meals set deleted=true,version=next_version where id=rid;
    else
      r=pg_catalog.jsonb_build_object('id',rid::text,'date',r->>'date','time',r->>'time','district',r->>'district',
        'venue',pg_catalog.btrim(r->>'venue'),'food',pg_catalog.btrim(r->>'food'),'note',pg_catalog.btrim(r->>'note'),'status',r->>'status',
        'updatedAt',pg_catalog.to_char(pg_catalog.clock_timestamp() at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'));
      insert into public.moment_meals(id,data,version) values(rid,r,next_version)
        on conflict(id) do update set data=excluded.data,version=excluded.version;
    end if;
  end loop;
  select coalesce(pg_catalog.jsonb_agg(data||pg_catalog.jsonb_build_object('_version',version) order by data->>'date',id),'[]'::jsonb)
    into result from public.moment_meals where not deleted;
  return result;
end;
$$;
revoke all on function public.moment_sync(text,jsonb) from public;
grant execute on function public.moment_sync(text,jsonb) to anon, authenticated;
commit;
