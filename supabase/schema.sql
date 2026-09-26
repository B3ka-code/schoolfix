-- =====================================================================
-- SchoolFix — schema.sql
-- Запускать ЦЕЛИКОМ в Supabase → SQL Editor. Скрипт идемпотентный:
-- его можно перезапускать после правок, ничего не задвоится.
-- Принцип: клиент (anon key) не может писать в таблицы ничего лишнего.
-- Роли, коды и статусы меняются только через RPC (security definer)
-- или через узкие column-level GRANT + RLS-политики.
-- =====================================================================

-- ---------- 1. ТИПЫ ----------
do $$ begin create type public.user_role as enum ('student','teacher','staff','admin','super_admin');
exception when duplicate_object then null; end $$;
do $$ begin create type public.issue_status as enum ('new','in_progress','resolved','rejected');
exception when duplicate_object then null; end $$;
do $$ begin create type public.request_status as enum ('pending','approved','rejected');
exception when duplicate_object then null; end $$;

-- ---------- 2. ТАБЛИЦЫ ----------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  full_name   text not null check (char_length(full_name) between 1 and 100),
  email       text not null,
  role        public.user_role not null default 'student',
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create table if not exists public.issues (
  id           uuid primary key default gen_random_uuid(),
  author_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_name  text not null default '',            -- снимок имени, ставится триггером
  title        text not null check (char_length(title) between 3 and 120),
  description  text not null default '' check (char_length(description) <= 2000),
  category     text not null default 'other'
               check (category in ('equipment','plumbing','electrical','furniture','other')),
  status       public.issue_status not null default 'new',
  photo_path   text,                                -- путь в Storage-бакете issue-photos
  location     text not null default '' check (char_length(location) <= 120),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists issues_author_idx on public.issues (author_id, created_at desc);
create index if not exists issues_status_idx on public.issues (status, created_at desc);

create table if not exists public.issue_comments (
  id           uuid primary key default gen_random_uuid(),
  issue_id     uuid not null references public.issues(id) on delete cascade,
  author_id    uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  author_name  text not null default '',
  author_role  public.user_role,
  text         text not null check (char_length(text) between 1 and 2000),
  created_at   timestamptz not null default now()
);
create index if not exists comments_issue_idx on public.issue_comments (issue_id, created_at);

create table if not exists public.invite_codes (
  id          uuid primary key default gen_random_uuid(),
  code_hash   text not null unique,                 -- sha256 от кода; сам код нигде не хранится
  role        public.user_role not null check (role in ('teacher','staff')),
  max_uses    int not null default 1 check (max_uses between 1 and 100),
  used_count  int not null default 0 check (used_count >= 0),
  expires_at  timestamptz,
  is_active   boolean not null default true,
  note        text check (char_length(note) <= 80),
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table if not exists public.role_requests (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null,
  requested_role  public.user_role not null check (requested_role in ('teacher','staff')),
  status          public.request_status not null default 'pending',
  invite_code_id  uuid references public.invite_codes(id) on delete set null,
  reviewed_by     uuid references public.profiles(id) on delete set null,
  reviewed_at     timestamptz,
  created_at      timestamptz not null default now(),
  constraint role_requests_user_id_fkey foreign key (user_id) references public.profiles(id) on delete cascade
);
-- не больше одной активной заявки на пользователя
create unique index if not exists role_requests_one_pending
  on public.role_requests (user_id) where status = 'pending';

-- ---------- 3. ХЕЛПЕРЫ ДЛЯ RLS ----------
-- security definer + фиксированный search_path: читают profiles в обход RLS
-- (иначе политики на profiles уходят в рекурсию). Неактивный юзер => null.
create or replace function public.app_role() returns public.user_role
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and is_active
$$;

create or replace function public.is_triage() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() in ('staff','admin','super_admin'), false)
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() in ('admin','super_admin'), false)
$$;

-- ---------- 4. ТРИГГЕРЫ ----------
-- Новый пользователь Supabase Auth => профиль с ролью student.
-- Роль из user_metadata НАМЕРЕННО игнорируется: её контролирует клиент.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    coalesce(new.email, ''),
    left(coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(coalesce(new.email, 'user'), '@', 1)), 100)
  )
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$ begin new.updated_at := now(); return new; end $$;
drop trigger if exists issues_touch on public.issues;
create trigger issues_touch before update on public.issues
  for each row execute function public.touch_updated_at();

-- Имя автора берём из profiles на сервере — клиент подменить не может.
create or replace function public.fill_issue_author() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select full_name into new.author_name from public.profiles where id = new.author_id;
  return new;
end $$;
drop trigger if exists issues_fill_author on public.issues;
create trigger issues_fill_author before insert on public.issues
  for each row execute function public.fill_issue_author();

create or replace function public.fill_comment_author() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select full_name, role into new.author_name, new.author_role from public.profiles where id = new.author_id;
  return new;
end $$;
drop trigger if exists comments_fill_author on public.issue_comments;
create trigger comments_fill_author before insert on public.issue_comments
  for each row execute function public.fill_comment_author();

-- ---------- 5. RLS ----------
alter table public.profiles       enable row level security;
alter table public.issues         enable row level security;
alter table public.issue_comments enable row level security;
alter table public.role_requests  enable row level security;
alter table public.invite_codes   enable row level security;

-- profiles: свой профиль (даже если отключён — чтобы UI показал причину) или админ.
-- UPDATE/INSERT/DELETE политик нет вообще => напрямую роль не поменять.
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_admin());

-- issues
drop policy if exists issues_select on public.issues;
create policy issues_select on public.issues for select to authenticated
  using (public.app_role() is not null and (author_id = auth.uid() or public.is_triage()));

drop policy if exists issues_insert on public.issues;
create policy issues_insert on public.issues for insert to authenticated
  with check (
    public.app_role() is not null
    and author_id = auth.uid()
    and status = 'new'
    and (photo_path is null or photo_path like (auth.uid()::text || '/%'))
  );

drop policy if exists issues_update on public.issues;
create policy issues_update on public.issues for update to authenticated
  using (public.is_triage()) with check (public.is_triage());
-- DELETE политики нет: заявки не удаляются.

-- comments: видны те, что относятся к видимым (по RLS issues) заявкам.
drop policy if exists comments_select on public.issue_comments;
create policy comments_select on public.issue_comments for select to authenticated
  using (exists (select 1 from public.issues i where i.id = issue_comments.issue_id));

drop policy if exists comments_insert on public.issue_comments;
create policy comments_insert on public.issue_comments for insert to authenticated
  with check (
    public.app_role() is not null
    and author_id = auth.uid()
    and exists (select 1 from public.issues i where i.id = issue_comments.issue_id)
  );

-- role_requests: читать своё или всё (админ). Писать — только RPC.
drop policy if exists role_requests_select on public.role_requests;
create policy role_requests_select on public.role_requests for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- invite_codes: читает только админ (и без code_hash — см. GRANT ниже).
drop policy if exists invite_codes_select on public.invite_codes;
create policy invite_codes_select on public.invite_codes for select to authenticated
  using (public.is_admin());

-- ---------- 6. RPC ----------
-- Код: 16 hex-символов из gen_random_uuid() (CSPRNG), показывается как XXXX-XXXX-XXXX-XXXX.
-- Возвращается открытым текстом ОДИН раз, в БД лежит только sha256.
create or replace function public.create_invite_code(
  p_role public.user_role,
  p_max_uses int default 1,
  p_expires_in_days int default 7,
  p_note text default null
) returns text
language plpgsql security definer set search_path = public as $$
declare v_raw text;
begin
  if not public.is_admin() then raise exception 'Недостаточно прав'; end if;
  if p_role not in ('teacher','staff') then raise exception 'Код можно создать только для роли teacher или staff'; end if;
  if p_max_uses is null or p_max_uses not between 1 and 100 then raise exception 'Число использований: от 1 до 100'; end if;
  if p_expires_in_days is not null and p_expires_in_days not between 1 and 90 then raise exception 'Срок действия: от 1 до 90 дней'; end if;

  v_raw := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 16));
  insert into public.invite_codes (code_hash, role, max_uses, expires_at, note, created_by)
  values (
    encode(sha256(convert_to(v_raw, 'UTF8')), 'hex'),
    p_role, p_max_uses,
    case when p_expires_in_days is null then null else now() + make_interval(days => p_expires_in_days) end,
    nullif(left(trim(coalesce(p_note, '')), 80), ''),
    auth.uid()
  );
  return substr(v_raw,1,4) || '-' || substr(v_raw,5,4) || '-' || substr(v_raw,9,4) || '-' || substr(v_raw,13,4);
end $$;

-- Ученик вводит код => создаётся заявка на роль. Сама роль НЕ меняется.
create or replace function public.redeem_invite_code(p_code text) returns public.role_requests
language plpgsql security definer set search_path = public as $$
declare
  v_uid  uuid := auth.uid();
  v_role public.user_role;
  v_code public.invite_codes;
  v_req  public.role_requests;
  v_hash text;
begin
  if v_uid is null then raise exception 'Нужно войти в аккаунт'; end if;
  select role into v_role from public.profiles where id = v_uid and is_active;
  if v_role is null then raise exception 'Аккаунт отключён'; end if;
  if v_role <> 'student' then raise exception 'Ваша роль уже подтверждена'; end if;
  if exists (select 1 from public.role_requests where user_id = v_uid and status = 'pending') then
    raise exception 'Заявка на роль уже отправлена и ждёт подтверждения';
  end if;

  v_hash := encode(sha256(convert_to(upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')), 'UTF8')), 'hex');
  select * into v_code from public.invite_codes where code_hash = v_hash for update;

  -- одно и то же сообщение для всех причин, чтобы код нельзя было «прощупывать»
  if not found or not v_code.is_active or v_code.used_count >= v_code.max_uses
     or (v_code.expires_at is not null and v_code.expires_at <= now()) then
    raise exception 'Код недействителен, просрочен или уже использован';
  end if;

  update public.invite_codes
     set used_count = used_count + 1,
         is_active  = (used_count + 1 < max_uses)
   where id = v_code.id;

  insert into public.role_requests (user_id, requested_role, invite_code_id)
  values (v_uid, v_code.role, v_code.id)
  returning * into v_req;
  return v_req;
end $$;

create or replace function public.admin_review_role_request(p_request_id uuid, p_approve boolean)
returns public.role_requests
language plpgsql security definer set search_path = public as $$
declare v_req public.role_requests;
begin
  if not public.is_admin() then raise exception 'Недостаточно прав'; end if;
  select * into v_req from public.role_requests where id = p_request_id for update;
  if not found then raise exception 'Заявка не найдена'; end if;
  if v_req.status <> 'pending' then raise exception 'Заявка уже обработана'; end if;

  if p_approve then
    update public.profiles set role = v_req.requested_role
     where id = v_req.user_id and role = 'student' and is_active;
    if not found then raise exception 'Пользователь отключён или уже не ученик'; end if;
  end if;

  update public.role_requests
     set status = case when p_approve then 'approved'::public.request_status else 'rejected'::public.request_status end,
         reviewed_by = auth.uid(), reviewed_at = now()
   where id = p_request_id
  returning * into v_req;
  return v_req;
end $$;

create or replace function public.admin_set_user_role(p_user_id uuid, p_role public.user_role)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare v_caller public.user_role := public.app_role(); v_target public.profiles;
begin
  if not public.is_admin() then raise exception 'Недостаточно прав'; end if;
  if p_user_id = auth.uid() then raise exception 'Нельзя менять собственную роль'; end if;
  select * into v_target from public.profiles where id = p_user_id for update;
  if not found then raise exception 'Пользователь не найден'; end if;
  if (v_target.role in ('admin','super_admin') or p_role in ('admin','super_admin')) and v_caller <> 'super_admin' then
    raise exception 'Роли admin и super_admin меняет только super_admin';
  end if;
  update public.profiles set role = p_role where id = p_user_id returning * into v_target;
  return v_target;
end $$;

create or replace function public.admin_set_user_active(p_user_id uuid, p_active boolean)
returns public.profiles
language plpgsql security definer set search_path = public as $$
declare v_caller public.user_role := public.app_role(); v_target public.profiles;
begin
  if not public.is_admin() then raise exception 'Недостаточно прав'; end if;
  if p_user_id = auth.uid() then raise exception 'Нельзя отключить самого себя'; end if;
  select * into v_target from public.profiles where id = p_user_id for update;
  if not found then raise exception 'Пользователь не найден'; end if;
  if v_target.role in ('admin','super_admin') and v_caller <> 'super_admin' then
    raise exception 'Админов отключает только super_admin';
  end if;
  update public.profiles set is_active = p_active where id = p_user_id returning * into v_target;
  return v_target;
end $$;

create or replace function public.admin_set_invite_active(p_code_id uuid, p_active boolean)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'Недостаточно прав'; end if;
  update public.invite_codes set is_active = p_active
   where id = p_code_id and (not p_active or used_count < max_uses);
  if not found then raise exception 'Код не найден или уже исчерпан'; end if;
end $$;

-- ---------- 7. STORAGE (фото заявок) ----------
-- Приватный бакет. Путь файла: <uid автора>/<uuid>.<ext>
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('issue-photos', 'issue-photos', false, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists issue_photos_insert on storage.objects;
create policy issue_photos_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'issue-photos'
              and (storage.foldername(name))[1] = auth.uid()::text
              and public.app_role() is not null);

drop policy if exists issue_photos_select on storage.objects;
create policy issue_photos_select on storage.objects for select to authenticated
  using (bucket_id = 'issue-photos'
         and ((storage.foldername(name))[1] = auth.uid()::text or public.is_triage()));

drop policy if exists issue_photos_delete on storage.objects;
create policy issue_photos_delete on storage.objects for delete to authenticated
  using (bucket_id = 'issue-photos' and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- 8. REALTIME (чтобы админка и списки обновлялись сами) ----------
do $$
declare t text;
begin
  foreach t in array array['issues','issue_comments','role_requests','profiles'] loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- ---------- 9. GRANT / REVOKE ----------
-- Сначала снимаем всё (Supabase по умолчанию раздаёт права щедро), потом выдаём точечно.
revoke all on all tables    in schema public from anon, authenticated;
revoke all on all functions in schema public from public, anon, authenticated;

grant usage on schema public to anon, authenticated;

grant select on public.profiles, public.issues, public.issue_comments, public.role_requests to authenticated;
-- invite_codes: всё, кроме code_hash (в клиент хэш вообще не уходит)
grant select (id, role, max_uses, used_count, expires_at, is_active, note, created_by, created_at)
  on public.invite_codes to authenticated;

-- Клиент задаёт только эти колонки; author_id/status/author_name — дефолты и триггеры.
grant insert (title, description, category, location, photo_path) on public.issues to authenticated;
grant update (status) on public.issues to authenticated;              -- + RLS: только triage
grant insert (issue_id, text) on public.issue_comments to authenticated;

grant execute on function
  public.app_role(), public.is_triage(), public.is_admin(),
  public.create_invite_code(public.user_role, int, int, text),
  public.redeem_invite_code(text),
  public.admin_review_role_request(uuid, boolean),
  public.admin_set_user_role(uuid, public.user_role),
  public.admin_set_user_active(uuid, boolean),
  public.admin_set_invite_active(uuid, boolean)
to authenticated;

-- ---------- 10. ПЕРВЫЙ super_admin ----------
-- Зарегистрируйтесь в приложении, затем выполните ОДИН раз в SQL Editor:
--   update public.profiles set role = 'super_admin' where email = 'you@school.kz';
