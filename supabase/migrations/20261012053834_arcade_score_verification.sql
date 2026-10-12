-- TwitchTrap free-play score verification.
-- LOCAL DRAFT ONLY. Do not apply until reviewed and tested.

begin;

create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table private.arcade_run_challenges (
    challenge_id uuid primary key default gen_random_uuid(),
    seed bigint not null,
    game_rules_version text not null default 'arcade-v1',
    status text not null default 'issued'
        check (status in ('issued', 'active', 'verified', 'rejected', 'expired')),
    issued_at timestamptz not null default clock_timestamp(),
    activated_at timestamptz,
    finished_at timestamptz,
    expires_at timestamptz not null,
    verified_survival_seconds numeric,
    rejection_reason text,
    constraint arcade_run_challenge_expiry_check
        check (expires_at > issued_at),
    constraint arcade_run_challenge_timing_check
        check (activated_at is null or activated_at >= issued_at)
);

create index arcade_run_challenges_expiry_idx
    on private.arcade_run_challenges (expires_at);

alter table private.arcade_run_challenges enable row level security;

revoke all on private.arcade_run_challenges
    from public, anon, authenticated;

grant select, insert, update
    on private.arcade_run_challenges to service_role;

-- The public leaderboard remains readable, but clients cannot write scores.
revoke insert, update, delete
    on public.arcade_scores from public, anon, authenticated;

revoke all on sequence public.arcade_scores_id_seq
    from public, anon, authenticated;

grant usage on sequence public.arcade_scores_id_seq to service_role;

-- Every leaderboard entry must reference one unique server-issued challenge.
alter table public.arcade_scores
    add column verification_challenge_id uuid not null;

alter table public.arcade_scores
    add constraint arcade_scores_verification_challenge_id_key
    unique (verification_challenge_id);

alter table public.arcade_scores
    add constraint arcade_scores_verification_challenge_id_fkey
    foreign key (verification_challenge_id)
    references private.arcade_run_challenges (challenge_id);

grant insert, select, update
    on public.arcade_scores to service_role;

-- Issue a short-lived challenge. Only the trusted Edge Function may call this.
create or replace function public.issue_arcade_challenge()
returns table (
    challenge_id uuid,
    seed bigint,
    expires_at timestamptz,
    game_rules_version text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_id uuid;
    v_seed bigint;
    v_now timestamptz;
    v_expires_at timestamptz;
begin
    v_now := pg_catalog.clock_timestamp();
    v_expires_at := v_now + interval '2 minutes';
    v_seed := floor(random() * 2147483647)::bigint;

    insert into private.arcade_run_challenges (
        seed,
        game_rules_version,
        status,
        issued_at,
        expires_at
    )
    values (
        v_seed,
        'arcade-v1',
        'issued',
        v_now,
        v_expires_at
    )
    returning private.arcade_run_challenges.challenge_id
         into v_id;

    return query
    select v_id, v_seed, v_expires_at, 'arcade-v1'::text;
end;
$function$;

revoke all on function public.issue_arcade_challenge()
    from public, anon, authenticated;

grant execute on function public.issue_arcade_challenge()
    to service_role;


-- Activate once, before the issuance deadline. Activation starts server timing
-- and extends expires_at to allow a maximum run plus a 120-second grace period.
create or replace function public.activate_arcade_challenge(
    p_challenge_id uuid
)
returns table (
    challenge_id uuid,
    activated_at timestamptz,
    expires_at timestamptz,
    game_rules_version text
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_challenge private.arcade_run_challenges%rowtype;
    v_now timestamptz;
    v_run_expires_at timestamptz;
begin
    if p_challenge_id is null then
        raise exception 'Challenge ID is required';
    end if;

    select c.*
      into v_challenge
      from private.arcade_run_challenges as c
     where c.challenge_id = p_challenge_id
     for update;

    if not found then
        raise exception 'Challenge not found';
    end if;

    if v_challenge.status <> 'issued' then
        raise exception 'Challenge is not issued or has already been activated';
    end if;

    v_now := pg_catalog.clock_timestamp();

    if v_challenge.expires_at <= v_now then
        raise exception 'Challenge activation deadline has expired';
    end if;

    v_run_expires_at := v_now + interval '3720 seconds';

    update private.arcade_run_challenges
       set status = 'active',
           activated_at = v_now,
           expires_at = v_run_expires_at
     where private.arcade_run_challenges.challenge_id = p_challenge_id
       and private.arcade_run_challenges.status = 'issued';

    if not found then
        raise exception 'Challenge could not be activated';
    end if;

    return query
    select
        p_challenge_id,
        v_now,
        v_run_expires_at,
        v_challenge.game_rules_version;
end;
$function$;

revoke all on function public.activate_arcade_challenge(uuid)
    from public, anon, authenticated;

grant execute on function public.activate_arcade_challenge(uuid)
    to service_role;

-- Atomically consume a challenge and insert its verified leaderboard score.
-- The Edge Function must validate the gameplay evidence before calling this.
create or replace function public.finalize_arcade_score(
    p_challenge_id uuid,
    p_display_name text,
    p_survival_seconds numeric
)
returns table (
    score_id bigint,
    display_name text,
    survival_seconds numeric,
    created_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $function$
declare
    v_challenge private.arcade_run_challenges%rowtype;
    v_display_name text;
    v_now timestamptz;
    v_score_id bigint;
    v_created_at timestamptz;
begin
    v_display_name := pg_catalog.btrim(p_display_name);

    if p_challenge_id is null then
        raise exception 'Challenge ID is required';
    end if;

    if v_display_name is null
       or pg_catalog.char_length(v_display_name) < 1
       or pg_catalog.char_length(v_display_name) > 24 then
        raise exception 'Display name must be 1 to 24 characters';
    end if;

    if p_survival_seconds is null
       or p_survival_seconds <= 0
       or p_survival_seconds > 3600 then
        raise exception 'Survival time is outside the permitted range';
    end if;

    select c.*
      into v_challenge
      from private.arcade_run_challenges as c
     where c.challenge_id = p_challenge_id
     for update;

    if not found then
        raise exception 'Challenge not found';
    end if;

    if v_challenge.status <> 'active' then
        raise exception 'Challenge is not active or has already been consumed';
    end if;

    v_now := pg_catalog.clock_timestamp();

    if v_challenge.activated_at is null then
        raise exception 'Challenge has no activation timestamp';
    end if;

    if v_challenge.expires_at <= v_now then
        raise exception 'Challenge has expired';
    end if;

    -- The submitted duration cannot exceed server-measured active-run time.
    -- The verifier must independently validate the actual gameplay trace.
    if p_survival_seconds >
       extract(epoch from (v_now - v_challenge.activated_at)) then
        raise exception 'Submitted duration exceeds server-measured run time';
    end if;

    update private.arcade_run_challenges
       set status = 'verified',
           finished_at = v_now,
           verified_survival_seconds = p_survival_seconds,
           rejection_reason = null
     where challenge_id = p_challenge_id
       and status = 'active';

    if not found then
        raise exception 'Challenge could not be consumed';
    end if;

    insert into public.arcade_scores (
        display_name,
        survival_seconds,
        verified,
        verification_challenge_id
    )
    values (
        v_display_name,
        p_survival_seconds,
        true,
        p_challenge_id
    )
    returning id, public.arcade_scores.created_at
         into v_score_id, v_created_at;

    return query
    select v_score_id, v_display_name, p_survival_seconds, v_created_at;
end;
$function$;

revoke all on function public.finalize_arcade_score(uuid, text, numeric)
    from public, anon, authenticated;

grant execute on function public.finalize_arcade_score(uuid, text, numeric)
    to service_role;

commit;

