-- Hiên Nhà Bun — tài khoản, đồng bộ nhiều thiết bị, sổ xu phía máy chủ
-- Chạy một lần trong Supabase: SQL Editor -> dán toàn bộ tệp -> Run.
-- Chạy lại nhiều lần vẫn an toàn (idempotent).
--
-- Thiết kế:
--   game_saves    : 1 dòng cho mỗi tài khoản, giữ số phiên bản (rev) để phát hiện xung đột giữa các thiết bị.
--   game_sections : thế giới của Bun chia thành các phần (bun, house, tasks, ...). Chỉ phần nào đổi mới được gửi lên.
--   coin_events   : sổ xu bất biến. Số dư = tổng sổ, do máy chủ tính, không tin số dư gửi từ trình duyệt.
--                   Mỗi giao dịch có event_id duy nhất nên gửi lại (retry) hay hai thiết bị cùng nhận một thưởng
--                   cũng chỉ được cộng một lần.
--   migrations    : ghi nhận lần chuyển dữ liệu khách lên tài khoản, theo mã migration_id (idempotent).
--   profiles      : hồ sơ tối thiểu của người dùng.
--   storage 'photos': ảnh tường ảnh, riêng tư, mỗi người một thư mục <user_id>/.
-- Không có bảng nào cho dữ liệu tĩnh (cửa tiệm, món ăn, đồ đạc...) vì đó là tài nguyên của ứng dụng.

begin;

-- ---------------------------------------------------------------- Bảng

create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  display_name  text check (display_name is null or char_length(display_name) <= 60),
  created_at    timestamptz not null default now(),
  last_seen_at  timestamptz not null default now()
);

create table if not exists public.game_saves (
  user_id       uuid primary key references auth.users (id) on delete cascade,
  rev           bigint not null default 1 check (rev > 0),
  schema_v      int not null default 2,
  device_id     text check (device_id is null or char_length(device_id) <= 64),
  migration_id  uuid,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create table if not exists public.game_sections (
  user_id     uuid not null references public.game_saves (user_id) on delete cascade,
  section     text not null check (section in ('core','bun','house','tasks','history','memories','health','pets','media','settings','misc')),
  data        jsonb not null check (jsonb_typeof(data) = 'object' and octet_length(data::text) <= 5000000),
  rev         bigint not null check (rev > 0),
  updated_at  timestamptz not null default now(),
  primary key (user_id, section)
);
create index if not exists game_sections_user_rev_idx on public.game_sections (user_id, rev);

create table if not exists public.coin_events (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  event_id    text not null check (char_length(event_id) between 1 and 80),
  amount      int not null,
  kind        text not null check (kind in ('opening','earn','spend','refund','reset')),
  client_at   timestamptz,
  created_at  timestamptz not null default now(),
  unique (user_id, event_id)
);
create index if not exists coin_events_user_time_idx on public.coin_events (user_id, created_at);
-- Mỗi tài khoản chỉ có một số dư mở đầu
create unique index if not exists coin_events_one_opening on public.coin_events (user_id) where kind = 'opening';

create table if not exists public.migrations (
  user_id       uuid not null references auth.users (id) on delete cascade,
  migration_id  uuid not null,
  source        text not null check (source in ('guest','fresh')),
  status        text not null default 'completed' check (status in ('completed')),
  summary       jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now(),
  primary key (user_id, migration_id)
);

-- ---------------------------------------------------------------- Kiểm tra sổ xu (chạy cho mọi đường ghi, kể cả ghi thẳng vào bảng)

create or replace function public.coin_events_guard() returns trigger
language plpgsql set search_path = '' as $$
declare earned bigint;
begin
  -- Giao dịch không hợp lệ bị bỏ qua (không làm hỏng cả lần đồng bộ); máy khách sẽ nhận lại số dư đúng từ máy chủ
  if new.kind = 'opening' then
    if new.amount < 0 or new.amount > 200000 then return null; end if;
  elsif new.kind = 'earn' then
    if new.amount < 0 or new.amount > 1000 then return null; end if;
  elsif new.kind in ('spend','refund') then
    if new.amount > 0 or new.amount < -5000 then return null; end if;
  elsif new.kind = 'reset' then
    if new.amount > 60 or new.amount < -1000000 then return null; end if;
  else
    return null;
  end if;
  -- Trần thu nhập: tối đa 6000 xu trong 24 giờ (rộng hơn nhiều so với mức chơi thật)
  if new.amount > 0 and new.kind <> 'opening' then
    perform pg_advisory_xact_lock(hashtextextended(new.user_id::text, 7));
    select coalesce(sum(amount), 0) into earned from public.coin_events
      where user_id = new.user_id and amount > 0 and kind <> 'opening' and created_at > now() - interval '24 hours';
    if earned + new.amount > 6000 then return null; end if;
  end if;
  new.created_at := now();
  return new;
end $$;

drop trigger if exists coin_events_guard on public.coin_events;
create trigger coin_events_guard before insert on public.coin_events
  for each row execute function public.coin_events_guard();

-- ---------------------------------------------------------------- Row Level Security

alter table public.profiles      enable row level security;
alter table public.game_saves    enable row level security;
alter table public.game_sections enable row level security;
alter table public.coin_events   enable row level security;
alter table public.migrations    enable row level security;

-- Khách chưa đăng nhập (anon) không được chạm vào bất kỳ bảng nào
revoke all on public.profiles, public.game_saves, public.game_sections, public.coin_events, public.migrations from anon;
revoke all on public.profiles, public.game_saves, public.game_sections, public.coin_events, public.migrations from authenticated;
grant select, insert, update on public.profiles      to authenticated;
grant select, insert, update on public.game_saves    to authenticated;
grant select, insert, update on public.game_sections to authenticated;
grant select, insert         on public.coin_events   to authenticated;  -- sổ xu: không sửa, không xóa
grant select, insert         on public.migrations    to authenticated;

do $$
declare t text;
begin
  foreach t in array array['profiles','game_saves','game_sections','coin_events','migrations'] loop
    execute format('drop policy if exists own_select on public.%I', t);
    execute format('drop policy if exists own_insert on public.%I', t);
    execute format('drop policy if exists own_update on public.%I', t);
  end loop;
end $$;

create policy own_select on public.profiles for select to authenticated using (id = (select auth.uid()));
create policy own_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
create policy own_update on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy own_select on public.game_saves for select to authenticated using (user_id = (select auth.uid()));
create policy own_insert on public.game_saves for insert to authenticated with check (user_id = (select auth.uid()));
create policy own_update on public.game_saves for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy own_select on public.game_sections for select to authenticated using (user_id = (select auth.uid()));
create policy own_insert on public.game_sections for insert to authenticated with check (user_id = (select auth.uid()));
create policy own_update on public.game_sections for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

create policy own_select on public.coin_events for select to authenticated using (user_id = (select auth.uid()));
create policy own_insert on public.coin_events for insert to authenticated with check (user_id = (select auth.uid()));

create policy own_select on public.migrations for select to authenticated using (user_id = (select auth.uid()));
create policy own_insert on public.migrations for insert to authenticated with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------- Hàm (SECURITY INVOKER: chạy bằng quyền người gọi, RLS vẫn áp dụng)

create or replace function public.coin_balance() returns bigint
language sql stable security invoker set search_path = '' as $$
  select coalesce(sum(amount), 0)::bigint from public.coin_events where user_id = (select auth.uid());
$$;

-- Tóm tắt để đối chiếu sau khi chuyển dữ liệu
create or replace function public.game_summary() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); s jsonb; h record;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select rev, updated_at into h from public.game_saves where user_id = uid;
  if not found then return jsonb_build_object('exists', false); end if;
  select coalesce(jsonb_object_agg(section, data), '{}'::jsonb) into s from public.game_sections where user_id = uid;
  return jsonb_build_object(
    'exists', true, 'rev', h.rev, 'updated_at', h.updated_at, 'balance', public.coin_balance(),
    'tasks',        case when jsonb_typeof(s #> '{tasks,tasks}') = 'array' then jsonb_array_length(s #> '{tasks,tasks}') else 0 end,
    'memories',     case when jsonb_typeof(s #> '{memories,memories}') = 'array' then jsonb_array_length(s #> '{memories,memories}') else 0 end,
    'achievements', (select count(*) from jsonb_object_keys(case when jsonb_typeof(s #> '{memories,achievements}') = 'object' then s #> '{memories,achievements}' else '{}'::jsonb end)),
    'owned',        case when jsonb_typeof(s #> '{house,house,owned}') = 'array' then jsonb_array_length(s #> '{house,house,owned}') else 0 end,
    'pets',         case when jsonb_typeof(s #> '{pets,pets}') = 'array' then jsonb_array_length(s #> '{pets,pets}') else 0 end,
    'photos',       case when jsonb_typeof(s #> '{media,photos}') = 'array' then jsonb_array_length(s #> '{media,photos}') else 0 end,
    'ledger',       case when jsonb_typeof(s #> '{history,ledger}') = 'array' then jsonb_array_length(s #> '{history,ledger}') else 0 end,
    'bun_gen',      s #>> '{bun,bun,gen}',
    'sections',     (select count(*) from jsonb_object_keys(s)));
end $$;

-- Tải toàn bộ thế giới trong một lần gọi (một ảnh chụp nhất quán)
create or replace function public.load_game() returns jsonb
language plpgsql stable security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); h record; s jsonb;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  select rev, updated_at, device_id into h from public.game_saves where user_id = uid;
  if not found then return jsonb_build_object('exists', false); end if;
  select coalesce(jsonb_object_agg(section, data), '{}'::jsonb) into s from public.game_sections where user_id = uid;
  return jsonb_build_object('exists', true, 'rev', h.rev, 'updated_at', h.updated_at, 'device_id', h.device_id, 'sections', s, 'balance', public.coin_balance());
end $$;

-- Kiểm tra gói dữ liệu gửi lên
create or replace function public.check_payload(p_sections jsonb, p_events jsonb) returns void
language plpgsql immutable security invoker set search_path = '' as $$
declare k text;
begin
  if p_sections is null or jsonb_typeof(p_sections) <> 'object' then raise exception 'bad_payload' using errcode = '22023'; end if;
  if p_events is null or jsonb_typeof(p_events) <> 'array' or jsonb_array_length(p_events) > 500 then raise exception 'bad_payload' using errcode = '22023'; end if;
  for k in select jsonb_object_keys(p_sections) loop
    if k not in ('core','bun','house','tasks','history','memories','health','pets','media','settings','misc') then
      raise exception 'bad_section' using errcode = '22023';
    end if;
  end loop;
end $$;

-- Tạo bản lưu đầu tiên của tài khoản: từ dữ liệu khách (source = guest) hoặc thế giới mới (fresh).
-- Toàn bộ chạy trong MỘT giao dịch: hoặc xong hết, hoặc không có gì thay đổi.
-- Gọi lại với cùng migration_id sau khi đã thành công sẽ chỉ trả về bản tóm tắt (không nhân đôi dữ liệu).
create or replace function public.create_save(p_migration_id uuid, p_sections jsonb, p_opening int, p_source text, p_summary jsonb, p_device text)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  if p_migration_id is null or p_source not in ('guest','fresh') then raise exception 'bad_payload' using errcode = '22023'; end if;
  perform public.check_payload(p_sections, '[]'::jsonb);
  if exists (select 1 from public.migrations where user_id = uid and migration_id = p_migration_id) then
    return public.game_summary() || jsonb_build_object('repeat', true);
  end if;
  if exists (select 1 from public.game_saves where user_id = uid) then
    raise exception 'cloud_not_empty' using errcode = 'P0001';
  end if;
  insert into public.game_saves (user_id, rev, device_id, migration_id) values (uid, 1, left(p_device, 64), p_migration_id);
  insert into public.game_sections (user_id, section, data, rev)
    select uid, e.key, e.value, 1 from jsonb_each(p_sections) e;
  insert into public.coin_events (user_id, event_id, amount, kind, client_at)
    values (uid, 'opening:' || p_migration_id::text, greatest(0, least(coalesce(p_opening, 0), 200000)), 'opening', now())
    on conflict do nothing;
  insert into public.migrations (user_id, migration_id, source, summary)
    values (uid, p_migration_id, p_source, coalesce(p_summary, '{}'::jsonb));
  insert into public.profiles (id) values (uid) on conflict (id) do update set last_seen_at = now();
  return public.game_summary() || jsonb_build_object('repeat', false);
end $$;

-- Lưu các phần đã đổi + giao dịch xu mới. p_base_rev là phiên bản thiết bị đã biết;
-- nếu trên máy chủ đã có phiên bản mới hơn (thiết bị khác vừa lưu) thì báo xung đột, không ghi đè.
create or replace function public.save_game(p_base_rev bigint, p_sections jsonb, p_events jsonb, p_device text)
returns jsonb language plpgsql volatile security invoker set search_path = '' as $$
declare uid uuid := auth.uid(); cur bigint; nrev bigint;
begin
  if uid is null then raise exception 'not_authenticated' using errcode = '28000'; end if;
  perform public.check_payload(p_sections, p_events);
  select rev into cur from public.game_saves where user_id = uid for update;
  if not found then raise exception 'no_save' using errcode = 'P0001'; end if;
  if cur <> p_base_rev then raise exception 'conflict' using errcode = 'P0001', hint = cur::text; end if;
  nrev := cur + 1;
  insert into public.game_sections (user_id, section, data, rev, updated_at)
    select uid, e.key, e.value, nrev, now() from jsonb_each(p_sections) e
    on conflict (user_id, section) do update set data = excluded.data, rev = excluded.rev, updated_at = now();
  insert into public.coin_events (user_id, event_id, amount, kind, client_at)
    select uid, left(e ->> 'id', 80), (e ->> 'amount')::int, e ->> 'kind',
           case when (e ->> 'at') ~ '^[0-9]{10,14}$' then to_timestamp((e ->> 'at')::double precision / 1000) else null end
    from jsonb_array_elements(p_events) e
    where e ->> 'id' is not null and (e ->> 'amount') ~ '^-?[0-9]{1,7}$'
    on conflict do nothing;
  update public.game_saves set rev = nrev, updated_at = now(), device_id = left(p_device, 64) where user_id = uid;
  return jsonb_build_object('rev', nrev, 'balance', public.coin_balance(), 'updated_at', now());
end $$;

revoke all on function public.coin_balance(), public.game_summary(), public.load_game(), public.check_payload(jsonb, jsonb),
  public.create_save(uuid, jsonb, int, text, jsonb, text), public.save_game(bigint, jsonb, jsonb, text) from public, anon;
grant execute on function public.coin_balance(), public.game_summary(), public.load_game(), public.check_payload(jsonb, jsonb),
  public.create_save(uuid, jsonb, int, text, jsonb, text), public.save_game(bigint, jsonb, jsonb, text) to authenticated;
revoke all on function public.coin_events_guard() from public, anon, authenticated;

-- ---------------------------------------------------------------- Ảnh: kho riêng tư, mỗi người một thư mục <user_id>/

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('photos', 'photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "bun photos select own" on storage.objects;
drop policy if exists "bun photos insert own" on storage.objects;
drop policy if exists "bun photos update own" on storage.objects;
drop policy if exists "bun photos delete own" on storage.objects;
create policy "bun photos select own" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "bun photos insert own" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "bun photos update own" on storage.objects for update to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "bun photos delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and (storage.foldername(name))[1] = (select auth.uid())::text);

commit;
