-- Audio setup for full-immersion lessons
-- Apply in Supabase SQL editor (project owner role)

alter table public.sezioni
  add column if not exists audio_url text,
  add column if not exists audio_cues_json jsonb,
  add column if not exists audio_bucket text,
  add column if not exists audio_path text,
  add column if not exists audio_is_private boolean not null default false;

-- Ensure cue points are a JSON array when present.
do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'sezioni_audio_cues_json_is_array_check'
  ) then
    alter table public.sezioni
      add constraint sezioni_audio_cues_json_is_array_check
      check (audio_cues_json is null or jsonb_typeof(audio_cues_json) = 'array');
  end if;
end $$;
