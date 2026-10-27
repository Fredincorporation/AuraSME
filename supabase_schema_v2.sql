-- AuraSME — durable workspace migration (v2)
-- Adds per-broker identity + resumable state so a cache clear / device switch / different
-- browser restores the signed-in broker's session instead of an empty screen.
--
-- This is ADDITIVE and idempotent. Apply AFTER supabase_schema.sql. It does NOT touch the
-- existing sme_companies / census_members / quotes / quote_versions tables.
--
-- The trusted server routes read/write these with the service-role key (which bypasses RLS).
-- The owner-only policies below are defense-in-depth for any anon-key access path.

-- 6. Broker profiles — one row per Supabase Auth user.
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT,
  locale TEXT NOT NULL DEFAULT 'en',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-provision a profile whenever a new auth user is created (password or magic-link signup).
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name'),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE
    SET full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        email     = COALESCE(EXCLUDED.email, public.profiles.email),
        updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 7. Workspaces — the resumable session snapshot for one broker (one row per user).
--    `state` holds company / census / config / documents / versions; compliance and rating are
--    never stored here because the engines re-derive them from census + config on load.
CREATE TABLE IF NOT EXISTS workspaces (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  quote_number TEXT,
  state JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Audit events — append-only, queryable trail (the regulated system-of-record for actions).
--    UNIQUE(user_id, at) makes replaying the browser's audit tail idempotent.
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  at TIMESTAMPTZ NOT NULL,
  actor TEXT NOT NULL,
  action TEXT NOT NULL,
  detail TEXT,
  actor_key TEXT,
  i18n_key TEXT,
  params JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT audit_events_user_at UNIQUE (user_id, at)
);
CREATE INDEX IF NOT EXISTS audit_events_user_at_idx ON audit_events (user_id, at DESC);

-- Row Level Security: broker-private by default.
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Owner reads own profile" ON profiles;
CREATE POLICY "Owner reads own profile" ON profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Owner upserts own profile" ON profiles;
CREATE POLICY "Owner upserts own profile" ON profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Owner reads own workspace" ON workspaces;
CREATE POLICY "Owner reads own workspace" ON workspaces FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner writes own workspace" ON workspaces;
CREATE POLICY "Owner writes own workspace" ON workspaces FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner reads own audit events" ON audit_events;
CREATE POLICY "Owner reads own audit events" ON audit_events FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Owner appends own audit events" ON audit_events;
CREATE POLICY "Owner appends own audit events" ON audit_events FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
